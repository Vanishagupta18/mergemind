import requests, json, os
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv('GITHUB_TOKEN')

# Errors worth retrying — network hiccups and GitHub's own transient failures
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


class GitHubTransientError(Exception):
    """Raised for retryable GitHub API failures (rate limits, 5xx, timeouts)."""
    pass


def fetch_diff(repo: str, pr_number: int) -> str:
    url = f'https://api.github.com/repos/{repo}/pulls/{pr_number}'
    headers = {'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github.v3.diff'}
    try:
        response = requests.get(url, headers=headers, timeout=15)
    except requests.exceptions.Timeout:
        raise GitHubTransientError(f"Timeout fetching diff for PR #{pr_number}")
    except requests.exceptions.ConnectionError as e:
        raise GitHubTransientError(f"Connection error fetching diff: {e}")

    if response.status_code in RETRYABLE_STATUS_CODES:
        raise GitHubTransientError(f"GitHub returned {response.status_code} fetching diff")
    response.raise_for_status()  # non-retryable errors (e.g. 404, 401) fail loudly, not silently

    return response.text[:4000]


def post_github_comment(repo: str, pr_number: int, review_json: str) -> str:
    """Posts the review comment. Returns the GitHub comment ID on success."""
    review = json.loads(review_json)
    bugs_text = '\n'.join([f'- {b}' for b in review.get('critical_bugs', [])]) or 'No critical bugs found.'
    suggestions_text = '\n'.join([f'- {s}' for s in review.get('suggested_fixes', [])]) or 'None.'

    comment = f"""## MergeMind Review
**Overall Score: {review.get('overall_score', 'N/A')}/10**

### Critical Bugs
{bugs_text}

### Suggested Fixes
{suggestions_text}

---
*Reviewed automatically by MergeMind (GPT-4o-mini)*"""

    url = f'https://api.github.com/repos/{repo}/issues/{pr_number}/comments'
    headers = {'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github.v3+json'}

    try:
        response = requests.post(url, json={'body': comment}, headers=headers, timeout=15)
    except requests.exceptions.Timeout:
        raise GitHubTransientError(f"Timeout posting comment for PR #{pr_number}")
    except requests.exceptions.ConnectionError as e:
        raise GitHubTransientError(f"Connection error posting comment: {e}")

    if response.status_code in RETRYABLE_STATUS_CODES:
        raise GitHubTransientError(f"GitHub returned {response.status_code} posting comment")
    response.raise_for_status()

    return str(response.json().get("id", ""))