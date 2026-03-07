"""
AI client with Anthropic → Groq fallback.
Drop-in chat_complete(system, messages, max_tokens) function.
"""
import anthropic
from groq import Groq

from config import ANTHROPIC_API_KEY, CHAT_MODEL, GROQ_API_KEY, GROQ_MODEL

_anthropic = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
_groq = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def chat_complete(system: str, messages: list[dict], max_tokens: int = 512) -> str:
    """Try Anthropic first. Fall back to Groq on any API error."""
    try:
        response = _anthropic.messages.create(
            model=CHAT_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        )
        return response.content[0].text
    except anthropic.APIError:
        if _groq is None:
            raise RuntimeError('Anthropic failed and GROQ_API_KEY is not set.')
        groq_messages = [{'role': 'system', 'content': system}] + messages
        response = _groq.chat.completions.create(
            model=GROQ_MODEL,
            max_tokens=max_tokens,
            messages=groq_messages,
        )
        return response.choices[0].message.content
