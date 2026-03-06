import csv
import io
import json
import re
from datetime import datetime, timezone
from functools import wraps

import anthropic
from flask import (Flask, jsonify, render_template, request,
                   session, redirect, url_for, Response, abort)

from config import (ANTHROPIC_API_KEY, CHAT_MODEL, ADMIN_PASSWORD,
                    SECRET_KEY, DB_PATH, MAX_MESSAGES, SUMMARIZE_AFTER,
                    build_system_prompt)
from models import Conversation, Lead, init_db

# ── App setup ─────────────────────────────────────────────────────────────────

app = Flask(__name__)
app.secret_key = SECRET_KEY

_, DBSession = init_db(DB_PATH)
claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


# ── Helpers ───────────────────────────────────────────────────────────────────

def db():
    return DBSession()


def get_history(session_id: str) -> list[dict]:
    s = db()
    rows = (s.query(Conversation)
              .filter_by(session_id=session_id)
              .order_by(Conversation.ts)
              .all())
    s.close()
    return [{'role': r.role, 'content': r.content} for r in rows]


def save_message(session_id: str, role: str, content: str):
    s = db()
    s.add(Conversation(session_id=session_id, role=role, content=content))
    s.commit()
    s.close()


def save_lead(session_id: str, name: str, email: str, context: str = ''):
    s = db()
    existing = s.query(Lead).filter_by(session_id=session_id, email=email).first()
    if not existing:
        s.add(Lead(session_id=session_id, name=name, email=email, context=context))
        s.commit()
    s.close()


def count_session_messages(session_id: str) -> int:
    s = db()
    count = s.query(Conversation).filter_by(session_id=session_id).count()
    s.close()
    return count


def summarize_history(history: list[dict]) -> list[dict]:
    if len(history) <= SUMMARIZE_AFTER:
        return history

    to_summarize = history[:-6]
    recent       = history[-6:]

    text = '\n'.join(f"{m['role'].upper()}: {m['content']}" for m in to_summarize)
    response = claude.messages.create(
        model=CHAT_MODEL,
        max_tokens=300,
        system='You summarize chat transcripts in 1–2 sentences, preserving key facts.',
        messages=[{'role': 'user', 'content': f'Summarize this conversation:\n\n{text}'}],
    )
    summary = response.content[0].text
    return [{'role': 'user', 'content': f'[Earlier conversation summary: {summary}]'},
            {'role': 'assistant', 'content': 'Got it, I have context from earlier in our chat.'},
            *recent]


def extract_lead(text: str) -> tuple[str | None, str | None]:
    email_match = re.search(r'[\w.+-]+@[\w-]+\.[a-z]{2,}', text, re.I)
    email = email_match.group(0) if email_match else None
    name  = None
    if email:
        name_match = re.search(r"(?:i'?m|my name is|name[: ]+)\s+([A-Z][a-z]+(?: [A-Z][a-z]+)?)", text, re.I)
        if name_match:
            name = name_match.group(1).strip()
    return name, email


# ── Admin auth ────────────────────────────────────────────────────────────────

def requires_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin'):
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get('/')
def index():
    return render_template('index.html')


@app.get('/health')
def health():
    return jsonify({'ok': True})


# ── Chat API ──────────────────────────────────────────────────────────────────

@app.post('/api/chat')
def api_chat():
    data       = request.get_json(force=True)
    session_id = data.get('session_id', '').strip()
    user_msg   = data.get('message', '').strip()

    if not session_id or not user_msg:
        return jsonify({'error': 'session_id and message are required'}), 400

    msg_count = count_session_messages(session_id)
    if msg_count >= MAX_MESSAGES * 2:
        return jsonify({
            'reply': "We've reached the limit for this chat session. "
                     "Please email us at hello@duesorelle.com and we'll be happy to help!",
            'rate_limited': True
        })

    save_message(session_id, 'user', user_msg)

    name, email = extract_lead(user_msg)
    if email:
        save_lead(session_id, name or '', email, context=user_msg[:200])

    history = get_history(session_id)
    history = history[:-1]
    history = summarize_history(history)
    history.append({'role': 'user', 'content': user_msg})

    try:
        response = claude.messages.create(
            model=CHAT_MODEL,
            max_tokens=512,
            system=build_system_prompt(),
            messages=history,
        )
        reply = response.content[0].text
    except anthropic.APIError as e:
        return jsonify({'error': str(e)}), 502

    save_message(session_id, 'assistant', reply)

    _, email2 = extract_lead(reply)
    if email2 and not email:
        save_lead(session_id, '', email2, context=reply[:200])

    return jsonify({'reply': reply})


# ── Admin ─────────────────────────────────────────────────────────────────────

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    error = None
    if request.method == 'POST':
        if request.form.get('password') == ADMIN_PASSWORD:
            session['admin'] = True
            return redirect(url_for('admin_dashboard'))
        error = 'Incorrect password.'
    return render_template('admin_login.html', error=error)


@app.get('/admin/logout')
def admin_logout():
    session.pop('admin', None)
    return redirect(url_for('admin_login'))


@app.get('/admin')
@requires_admin
def admin_dashboard():
    s = db()
    leads = s.query(Lead).order_by(Lead.ts.desc()).all()

    convos_raw = (s.query(Conversation)
                   .order_by(Conversation.session_id, Conversation.ts)
                   .all())
    s.close()

    sessions: dict = {}
    for row in convos_raw:
        sid = row.session_id
        if sid not in sessions:
            sessions[sid] = {'messages': [], 'start': row.ts}
        sessions[sid]['messages'].append({
            'role': row.role,
            'content': row.content,
            'ts': row.ts.strftime('%H:%M'),
        })

    sorted_sessions = sorted(sessions.items(),
                             key=lambda x: x[1]['start'], reverse=True)

    return render_template('admin.html',
                           leads=leads,
                           sessions=sorted_sessions,
                           total_sessions=len(sessions),
                           total_leads=len(leads))


@app.get('/admin/leads.csv')
@requires_admin
def export_leads_csv():
    s = db()
    leads = s.query(Lead).order_by(Lead.ts.desc()).all()
    s.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['name', 'email', 'context', 'timestamp'])
    for lead in leads:
        writer.writerow([lead.name, lead.email, lead.context,
                         lead.ts.strftime('%Y-%m-%d %H:%M UTC')])

    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=due_sorelle_leads.csv'}
    )
