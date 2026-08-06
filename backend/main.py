from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import hmac, hashlib, json, os
from worker import process_pr
from models import PRReview, ReviewStats, engine
from sqlalchemy.orm import Session
from sqlalchemy import desc
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

WEBHOOK_SECRET = os.getenv('GITHUB_WEBHOOK_SECRET')
ALLOWED_REPOS = set(
    r.strip() for r in os.getenv('ALLOWED_REPOS', '').split(',') if r.strip()
)

# --- CORS: only the frontend's real origin(s) should be allowed to call /api/* ---
FRONTEND_ORIGINS = [
    o.strip() for o in os.getenv('FRONTEND_ORIGINS', 'http://localhost:3000').split(',') if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET"],   # dashboard is read-only, so nothing beyond GET is needed
    allow_headers=["*"],
)


def verify_signature(payload_body: bytes, signature_header: str) -> bool:
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

    if not verify_signature(body, signature):
        print("Rejected webhook: invalid or missing signature")
        raise HTTPException(status_code=403, detail="Invalid signature")

    data = json.loads(body)
    action = data.get('action')

    if action not in ['opened', 'synchronize', 'reopened']:
        return {'status': 'ignored', 'reason': f'action={action} not handled'}

    pr = data['pull_request']
    repo = data['repository']['full_name']

    if ALLOWED_REPOS and repo not in ALLOWED_REPOS:
        print(f"Rejected webhook: {repo} not in allowlist")
        return {'status': 'ignored', 'reason': 'repository not allowlisted'}

    process_pr.delay(repo, pr['number'], pr['title'])
    print(f"Queued PR #{pr['number']} for review (action: {action}, repo: {repo})")
    return {'status': 'received'}


@app.get('/')
def health_check():
    return {'status': 'server is alive'}


# ---------------------------------------------------------------------------
# Dashboard API — read-only endpoints consumed by the Next.js frontend
# ---------------------------------------------------------------------------

def serialize_review(row: PRReview, include_full_json: bool = False) -> dict:
    """
    One shared conversion from a PRReview row to a JSON-safe dict.
    include_full_json=True is used only by the detail endpoint, since the
    full AI review payload is only needed on that page, not in list views.
    """
    data = {
        "id": row.id,
        "repo": row.repo_name,
        "pr_number": row.pr_number,
        "pr_title": row.pr_title,
        "filename": row.filename,
        "quality_score": float(row.quality_score) if row.quality_score is not None else None,
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
    if include_full_json:
        data["review_json"] = row.review_json or {}
        data["retry_count"] = row.retry_count
        data["last_error"] = row.last_error
    return data


@app.get('/api/stats')
def get_stats():
    with Session(engine) as session:
        total_reviews = session.query(PRReview).count()

        repo_stats = session.query(ReviewStats).all()
        total_api_calls = sum(s.api_calls_made for s in repo_stats)
        total_cache_hits = sum(s.cache_hits for s in repo_stats)
        repos_count = len(repo_stats)

        recent = (
            session.query(PRReview)
            .order_by(desc(PRReview.created_at))
            .limit(10)
            .all()
        )

        return {
            "total_reviews": total_reviews,
            "total_api_calls": total_api_calls,
            "total_cache_hits": total_cache_hits,
            "repos_count": repos_count,
            "recent_reviews": [serialize_review(r) for r in recent],
        }


@app.get('/api/repos')
def get_repos():
    with Session(engine) as session:
        repo_stats = session.query(ReviewStats).all()
        return [
            {
                "repo_name": s.repo_name,
                "api_calls_made": s.api_calls_made,
                "cache_hits": s.cache_hits,
                "files_skipped": s.files_skipped_filtered,
            }
            for s in repo_stats
        ]


@app.get('/api/reviews')
def get_reviews():
    with Session(engine) as session:
        reviews = (
            session.query(PRReview)
            .order_by(desc(PRReview.created_at))
            .limit(100)
            .all()
        )
        return [serialize_review(r) for r in reviews]


@app.get('/api/reviews/{review_id}')
def get_review_detail(review_id: str):
    with Session(engine) as session:
        row = session.query(PRReview).filter_by(id=review_id).first()
        if not row:
            raise HTTPException(status_code=404, detail="Review not found")
        return serialize_review(row, include_full_json=True)