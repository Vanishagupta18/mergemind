from fastapi import FastAPI, Request, HTTPException
import hmac, hashlib, json, os
from worker import process_pr
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

WEBHOOK_SECRET = os.getenv('GITHUB_WEBHOOK_SECRET')
ALLOWED_REPOS = set(
    r.strip() for r in os.getenv('ALLOWED_REPOS', '').split(',') if r.strip()
)


def verify_signature(payload_body: bytes, signature_header: str) -> bool:
    """
    Recomputes GitHub's HMAC-SHA256 signature over the raw request body
    and compares it to the header GitHub sent, using constant-time comparison
    to avoid leaking timing information about how close a guess was.
    """
    if not signature_header or not WEBHOOK_SECRET:
        return False
    expected = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode(), payload_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)


@app.post('/webhook')
async def receive_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get('X-Hub-Signature-256', '')

    # Step 1: Verify this request genuinely came from GitHub
    if not verify_signature(body, signature):
        print("Rejected webhook: invalid or missing signature")
        raise HTTPException(status_code=403, detail="Invalid signature")

    data = json.loads(body)
    action = data.get('action')

    if action not in ['opened', 'synchronize', 'reopened']:
        return {'status': 'ignored', 'reason': f'action={action} not handled'}

    pr = data['pull_request']
    repo = data['repository']['full_name']

    # Step 2: Only process repos we've explicitly approved
    if ALLOWED_REPOS and repo not in ALLOWED_REPOS:
        print(f"Rejected webhook: {repo} not in allowlist")
        return {'status': 'ignored', 'reason': 'repository not allowlisted'}

    process_pr.delay(repo, pr['number'], pr['title'])
    print(f"Queued PR #{pr['number']} for review (action: {action}, repo: {repo})")
    return {'status': 'received'}


@app.get('/')
def health_check():
    return {'status': 'server is alive'}