"""
AI client with Anthropic → OpenRouter fallback.
Drop-in chat_complete(system, messages, max_tokens) function.
"""
import anthropic
from openai import OpenAI

from config import ANTHROPIC_API_KEY, CHAT_MODEL, OPENROUTER_API_KEY, OPENROUTER_MODEL

_anthropic = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
_openrouter = OpenAI(
    base_url='https://openrouter.ai/api/v1',
    api_key=OPENROUTER_API_KEY,
) if OPENROUTER_API_KEY else None


def chat_complete(system: str, messages: list[dict], max_tokens: int = 512) -> str:
    """Try Anthropic first. Fall back to OpenRouter on any API error."""
    try:
        response = _anthropic.messages.create(
            model=CHAT_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        )
        return response.content[0].text
    except anthropic.APIError:
        if _openrouter is None:
            raise RuntimeError('Anthropic failed and OPENROUTER_API_KEY is not set.')
        or_messages = [{'role': 'system', 'content': system}] + messages
        response = _openrouter.chat.completions.create(
            model=OPENROUTER_MODEL,
            max_tokens=max_tokens,
            messages=or_messages,
        )
        return response.choices[0].message.content
