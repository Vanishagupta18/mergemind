from openai import OpenAI, APITimeoutError, APIConnectionError, RateLimitError, InternalServerError
import os
from dotenv import load_dotenv
from language_prompts import get_system_prompt

load_dotenv()
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
TIMEOUT = int(os.getenv('OPENAI_TIMEOUT', 30))

# Re-exported so worker.py can catch these without importing the openai package directly
RETRYABLE_OPENAI_EXCEPTIONS = (APITimeoutError, APIConnectionError, RateLimitError, InternalServerError)


def analyze_diff(diff: str, pr_title: str, filename: str = "unknown"):
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