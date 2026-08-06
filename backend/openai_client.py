from openai import OpenAI, APITimeoutError, APIConnectionError, RateLimitError, InternalServerError
import os
from dotenv import load_dotenv
from language_prompts import get_system_prompt

load_dotenv()

TIMEOUT = int(os.getenv('OPENAI_TIMEOUT', 30))

# Re-exported so worker.py can catch these without importing the openai package directly
RETRYABLE_OPENAI_EXCEPTIONS = (APITimeoutError, APIConnectionError, RateLimitError, InternalServerError)

_client = None  # created lazily on first real use, not at import time


def get_openai_client() -> OpenAI:
    """
    Lazily constructs the OpenAI client on first use, not at module import time.
    This means a missing/misconfigured OPENAI_API_KEY fails loudly and specifically
    when a review is actually attempted, rather than crashing the entire FastAPI
    app (including unrelated endpoints like /health) at startup.
    """
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is missing — set it in your environment before running reviews")
        _client = OpenAI(api_key=api_key)
    return _client


def analyze_diff(diff: str, pr_title: str, filename: str = "unknown"):
    client = get_openai_client()
    system_prompt = get_system_prompt(filename)
    result = client.chat.completions.create(
        model='gpt-4o-mini',
        timeout=TIMEOUT,
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': f'PR Title: {pr_title}\nFile: {filename}\n\nDiff:\n{diff}'}
        ],
        response_format={'type': 'json_object'}
    )
    return result.choices[0].message.content