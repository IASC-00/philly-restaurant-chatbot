/**
 * Passyunk Table — Chat Widget
 * Drop-in: <script src="/static/widget.js"></script>
 * Customise via window.PassyunkChat config before loading.
 */
(function () {
  'use strict';

  var cfg = window.PassyunkChat || {};
  var API_URL    = cfg.apiUrl    || '/api/chat';
  var BRAND_NAME = cfg.brandName || 'Passyunk Table';
  var ACCENT     = cfg.accent    || '#8b1a1a';
  var GREETING   = cfg.greeting  ||
    "Welcome to Passyunk Table! I'm Rosa — happy to help with reservations, menu questions, or catering inquiries. What can I do for you?";

  // ── Session ID ──────────────────────────────────────────────────────────────
  function getSessionId() {
    var key = 'pt_session_id';
    var id  = localStorage.getItem(key);
    if (!id) {
      id = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, id);
    }
    return id;
  }
  var SESSION_ID = getSessionId();

  // ── Styles ──────────────────────────────────────────────────────────────────
  var css = [
    '#pt-launcher{position:fixed;bottom:24px;right:24px;z-index:9998;',
      'width:56px;height:56px;border-radius:50%;background:' + ACCENT + ';',
      'border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.22);',
      'display:flex;align-items:center;justify-content:center;transition:transform .15s;}',
    '#pt-launcher:hover{transform:scale(1.08);}',
    '#pt-launcher svg{pointer-events:none;}',

    '#pt-widget{position:fixed;bottom:92px;right:24px;z-index:9999;',
      'width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);',
      'border-radius:16px;overflow:hidden;',
      'box-shadow:0 12px 40px rgba(0,0,0,.18);',
      'display:flex;flex-direction:column;',
      'transform:translateY(20px) scale(.96);opacity:0;pointer-events:none;',
      'transition:transform .2s cubic-bezier(.34,1.56,.64,1), opacity .15s;}',
    '#pt-widget.open{transform:translateY(0) scale(1);opacity:1;pointer-events:auto;}',

    '#pt-header{background:' + ACCENT + ';color:#fff;padding:14px 16px;',
      'display:flex;align-items:center;gap:10px;flex-shrink:0;}',
    '#pt-header .pt-avatar{width:34px;height:34px;border-radius:50%;',
      'background:rgba(255,255,255,.25);display:flex;align-items:center;',
      'justify-content:center;font-size:18px;flex-shrink:0;}',
    '#pt-header .pt-info{flex:1;min-width:0;}',
    '#pt-header .pt-name{font-weight:700;font-size:14px;line-height:1.2;}',
    '#pt-header .pt-status{font-size:11px;opacity:.85;}',
    '#pt-close{background:none;border:none;color:#fff;cursor:pointer;',
      'padding:4px;border-radius:4px;opacity:.8;line-height:1;}',
    '#pt-close:hover{opacity:1;}',

    '#pt-messages{flex:1;overflow-y:auto;padding:16px;',
      'background:#faf7f2;display:flex;flex-direction:column;gap:10px;}',
    '#pt-messages::-webkit-scrollbar{width:4px;}',
    '#pt-messages::-webkit-scrollbar-track{background:transparent;}',
    '#pt-messages::-webkit-scrollbar-thumb{background:#d4c5b5;border-radius:2px;}',

    '.pt-msg{max-width:82%;line-height:1.55;font-size:13.5px;',
      'padding:10px 13px;border-radius:14px;word-wrap:break-word;}',
    '.pt-msg.bot{background:#fff;color:#1c1c1c;border-bottom-left-radius:4px;',
      'box-shadow:0 1px 4px rgba(0,0,0,.07);align-self:flex-start;}',
    '.pt-msg.user{background:' + ACCENT + ';color:#fff;',
      'border-bottom-right-radius:4px;align-self:flex-end;}',

    '.pt-typing{display:flex;gap:5px;padding:10px 13px;background:#fff;',
      'border-radius:14px;border-bottom-left-radius:4px;align-self:flex-start;',
      'box-shadow:0 1px 4px rgba(0,0,0,.07);}',
    '.pt-dot{width:7px;height:7px;border-radius:50%;background:#bbb;',
      'animation:pt-bounce .9s infinite ease-in-out;}',
    '.pt-dot:nth-child(2){animation-delay:.15s;}',
    '.pt-dot:nth-child(3){animation-delay:.3s;}',
    '@keyframes pt-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}',

    '#pt-lead-form{background:#fff;border-top:1px solid #ede5db;',
      'padding:14px 16px;flex-shrink:0;}',
    '#pt-lead-form p{font-size:12.5px;color:#555;margin-bottom:10px;}',
    '#pt-lead-form input{width:100%;padding:8px 10px;border:1px solid #d4c5b5;',
      'border-radius:7px;font-size:13px;margin-bottom:8px;',
      'font-family:inherit;box-sizing:border-box;}',
    '#pt-lead-form input:focus{outline:none;border-color:' + ACCENT + ';}',
    '#pt-lead-submit{width:100%;padding:9px;background:' + ACCENT + ';color:#fff;',
      'border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;}',
    '#pt-lead-submit:hover{filter:brightness(1.1);}',

    '#pt-powered{text-align:center;font-size:10.5px;color:#bbb;padding:5px 12px 6px;',
      'background:#fff;border-top:1px solid #f0e8de;flex-shrink:0;}',
    '#pt-powered a{color:#8b1a1a;text-decoration:none;}',
    '#pt-powered a:hover{text-decoration:underline;}',

    '#pt-footer{background:#fff;border-top:1px solid #ede5db;',
      'padding:10px 12px;display:flex;gap:8px;align-items:center;flex-shrink:0;}',
    '#pt-input{flex:1;border:1px solid #d4c5b5;border-radius:20px;',
      'padding:9px 14px;font-size:13.5px;font-family:inherit;',
      'resize:none;outline:none;line-height:1.4;max-height:80px;overflow-y:auto;}',
    '#pt-input:focus{border-color:' + ACCENT + ';}',
    '#pt-send{width:36px;height:36px;border-radius:50%;background:' + ACCENT + ';',
      'border:none;cursor:pointer;display:flex;align-items:center;',
      'justify-content:center;flex-shrink:0;transition:filter .15s;}',
    '#pt-send:hover{filter:brightness(1.15);}',
    '#pt-send:disabled{opacity:.45;cursor:default;}',
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ── DOM ─────────────────────────────────────────────────────────────────────
  var launcher = document.createElement('button');
  launcher.id = 'pt-launcher';
  launcher.setAttribute('aria-label', 'Open chat');
  launcher.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';

  var widget = document.createElement('div');
  widget.id = 'pt-widget';
  widget.setAttribute('role', 'dialog');
  widget.setAttribute('aria-label', BRAND_NAME + ' chat');

  widget.innerHTML = [
    '<div id="pt-header">',
      '<div class="pt-avatar">🍝</div>',
      '<div class="pt-info">',
        '<div class="pt-name">Rosa</div>',
        '<div class="pt-status">' + BRAND_NAME + ' &middot; Usually replies instantly</div>',
      '</div>',
      '<button id="pt-close" aria-label="Close chat">✕</button>',
    '</div>',
    '<div id="pt-messages" role="log" aria-live="polite"></div>',
    '<div id="pt-footer">',
      '<textarea id="pt-input" rows="1" placeholder="Ask about reservations, menu…"',
        ' aria-label="Chat message"></textarea>',
      '<button id="pt-send" aria-label="Send message">',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff"',
          ' stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
          '<line x1="22" y1="2" x2="11" y2="13"></line>',
          '<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>',
        '</svg>',
      '</button>',
    '</div>',
    '<div id="pt-powered">Powered by <a href="https://iswain.dev" target="_blank" rel="noopener">iswain.dev</a></div>',
  ].join('');

  document.body.appendChild(launcher);
  document.body.appendChild(widget);

  // ── References ──────────────────────────────────────────────────────────────
  var messagesEl = document.getElementById('pt-messages');
  var inputEl    = document.getElementById('pt-input');
  var sendBtn    = document.getElementById('pt-send');
  var closeBtn   = document.getElementById('pt-close');

  var isOpen       = false;
  var isWaiting    = false;
  var leadCaptured = false;
  var leadFormEl   = null;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function addMessage(text, role) {
    var div = document.createElement('div');
    div.className = 'pt-msg ' + role;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'pt-typing';
    el.id = 'pt-typing';
    el.innerHTML = '<span class="pt-dot"></span><span class="pt-dot"></span><span class="pt-dot"></span>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('pt-typing');
    if (el) el.remove();
  }

  function toggleWidget() {
    isOpen = !isOpen;
    widget.classList.toggle('open', isOpen);
    launcher.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (isOpen) {
      setTimeout(function () { inputEl.focus(); }, 220);
    }
  }

  // ── Lead capture form ───────────────────────────────────────────────────────
  function showLeadForm() {
    if (leadCaptured || leadFormEl) return;

    var form = document.createElement('div');
    form.id = 'pt-lead-form';
    form.innerHTML = [
      '<p>To confirm your reservation or follow up, can I get your name and email?</p>',
      '<input type="text"  id="pt-lead-name"  placeholder="Your name" autocomplete="name">',
      '<input type="email" id="pt-lead-email" placeholder="Email address" autocomplete="email">',
      '<button id="pt-lead-submit">Send →</button>',
    ].join('');

    var footer = document.getElementById('pt-footer');
    widget.insertBefore(form, footer);
    leadFormEl = form;

    document.getElementById('pt-lead-submit').addEventListener('click', function () {
      var name  = document.getElementById('pt-lead-name').value.trim();
      var email = document.getElementById('pt-lead-email').value.trim();
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        document.getElementById('pt-lead-email').focus();
        return;
      }
      var msg = 'My name is ' + (name || 'a guest') + ' and my email is ' + email;
      sendMessage(msg, true);
      leadCaptured = true;
      form.remove();
      leadFormEl = null;
    });
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  function sendMessage(text, silent) {
    if (!text || isWaiting) return;
    if (!silent) {
      addMessage(text, 'user');
    }
    inputEl.value = '';
    inputEl.style.height = 'auto';
    isWaiting = true;
    sendBtn.disabled = true;
    showTyping();

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID, message: text }),
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      hideTyping();
      var reply = data.reply || data.error || 'Sorry, something went wrong.';
      addMessage(reply, 'bot');

      var triggers = ['reservation', 'book', 'catering', 'follow up', 'get back to you',
                      'email', 'contact you', 'reach out', 'in touch'];
      var lower = reply.toLowerCase();
      if (!leadCaptured && triggers.some(function(t){ return lower.includes(t); })) {
        showLeadForm();
      }
    })
    .catch(function () {
      hideTyping();
      addMessage("Sorry, I couldn't connect. Please try again!", 'bot');
    })
    .finally(function () {
      isWaiting = false;
      sendBtn.disabled = false;
      inputEl.focus();
    });
  }

  // ── Events ───────────────────────────────────────────────────────────────────
  launcher.addEventListener('click', function () {
    toggleWidget();
    if (isOpen && messagesEl.children.length === 0) {
      setTimeout(function () { addMessage(GREETING, 'bot'); }, 300);
    }
  });

  closeBtn.addEventListener('click', toggleWidget);

  sendBtn.addEventListener('click', function () {
    sendMessage(inputEl.value.trim());
  });

  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputEl.value.trim());
    }
  });

  inputEl.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  });

})();
