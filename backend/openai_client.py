# openai_client.py
from openai import OpenAI
import os
from dotenv import load_dotenv
from language_prompts import get_system_prompt

load_dotenv()
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def analyze_diff(diff: str, pr_title: str, filename: str = "unknown"):
    system_prompt = get_system_prompt(filename)
    result = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': f'PR Title: {pr_title}\nFile: {filename}\n\nDiff:\n{diff}'}
        ],
        response_format={'type': 'json_object'}
    )
    return result.choices[0].message.content