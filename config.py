import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
CHAT_MODEL        = os.getenv('CHAT_MODEL', 'claude-haiku-4-5-20251001')
GROQ_API_KEY      = os.getenv('GROQ_API_KEY', '')
GROQ_MODEL        = os.getenv('GROQ_MODEL', 'llama-3.1-8b-instant')
ADMIN_PASSWORD    = os.getenv('ADMIN_PASSWORD', 'changeme')
SECRET_KEY        = os.getenv('FLASK_SECRET_KEY', 'dev-secret-change-me')
DB_PATH           = os.getenv('DB_PATH', 'chatbot.db')
MAX_MESSAGES      = int(os.getenv('MAX_MESSAGES_PER_SESSION', '20'))
SUMMARIZE_AFTER   = int(os.getenv('SUMMARIZE_AFTER_TURNS', '10'))

_PROMPT_PATH = Path(__file__).parent / 'prompts' / 'due_sorelle.txt'
_PROMPT_TEMPLATE = _PROMPT_PATH.read_text()


def build_system_prompt() -> str:
    now = datetime.now()
    day_name = now.strftime('%A')
    time_str  = now.strftime('%I:%M %p')

    hours_map = {
        'Monday':    'Closed',
        'Tuesday':   '5:00 PM – 10:00 PM',
        'Wednesday': '5:00 PM – 10:00 PM',
        'Thursday':  '5:00 PM – 10:00 PM',
        'Friday':    '5:00 PM – 11:00 PM',
        'Saturday':  '5:00 PM – 11:00 PM',
        'Sunday':    '4:00 PM – 9:00 PM',
    }
    today_hours = hours_map[day_name]

    open_status = 'Closed today (Monday).' if day_name == 'Monday' else f"Today's hours: {today_hours}."

    dynamic = (
        f"CURRENT CONTEXT (injected automatically):\n"
        f"  Today is {day_name}. Current local time: {time_str}.\n"
        f"  {open_status}\n"
        f"  Use this to answer 'are you open now?' or 'what time do you close?' accurately."
    )
    return _PROMPT_TEMPLATE.replace('{DYNAMIC_CONTEXT}', dynamic)
