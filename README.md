# MergeMind

**An AI-powered GitHub PR reviewer that understands code intent, not just syntax.**

MergeMind listens for GitHub Pull Request events, analyzes each changed file individually using a language-aware AI reviewer, and posts a structured, severity-ranked review directly on the PR — catching logic bugs that generic "review my code" prompts typically miss.

---

## Why this exists

Most AI code review demos send a whole diff blob to an LLM with a vague prompt like *"find bugs in this code."* In practice, that catches surface-level style issues but misses real logic errors — a generic prompt reviewing this function:

```js
function add(a, b) {
    return a - b;
}
```

...reported **"no critical bugs found."**

MergeMind fixes this with an **intent-checking system prompt**: the model is explicitly instructed to compare what a function's name/signature implies against what its body actually does, before scanning for other issue categories. The same test case above is now correctly flagged as a **Critical logic bug** with high confidence.

---

## Features

- 🔍 **Intent-checking analysis** — verifies function behavior against function names/signatures, not just pattern-matching for style issues
- 🌐 **Language-aware prompting** — Python, JavaScript, TypeScript, and Java each get a review checklist tuned to that language's real-world bug patterns (e.g., mutable default arguments in Python, loose equality in JS, `any`-abuse in TypeScript, NPE risk in Java)
- 📂 **Per-file diff analysis** — multi-file PRs are split and reviewed file-by-file, so line numbers stay accurate and each file gets language-correct analysis, then results are merged into one report
- 🚦 **Severity + confidence scoring** — every issue is tagged Critical/High/Medium/Low with a confidence level, so developers know what to trust immediately vs. double-check
- ⚡ **Fully asynchronous pipeline** — webhook responds to GitHub instantly; the actual AI analysis runs in a background job queue, avoiding webhook timeouts
- 🗄️ **Persistent review history** — every review is stored in PostgreSQL for future analytics and history tracking

---

## Architecture

```
GitHub PR opened / updated
        │
        ▼
  GitHub Webhook  ──────────►  FastAPI (/webhook)
                                     │
                              validates + queues job
                                     ▼
                              Redis (message broker)
                                     │
                                     ▼
                            Celery background worker
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
             fetch PR diff   split diff per file   detect language
                    │                │                │
                    └────────────────┴────────────────┘
                                     ▼
                     language-specific AI review (OpenAI)
                                     ▼
                          merge per-file results
                                     ▼
                    post structured comment to GitHub PR
                                     ▼
                        store review in PostgreSQL
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend framework | FastAPI | Async-native, handles concurrent webhooks without blocking |
| Background jobs | Celery + Redis | Decouples slow AI analysis from GitHub's webhook timeout window |
| AI | OpenAI GPT-4o-mini | Structured JSON output, strong cost-to-quality ratio for this task |
| Database | PostgreSQL | Relational structure for teams/repos/reviews, with JSONB for flexible AI output |
| Containerization | Docker Compose | Reproducible local Postgres + Redis setup |
| GitHub integration | GitHub App + Webhooks | Fine-grained, revocable permissions; production-standard integration pattern |

---

## Project Structure

```
mergemind/
├── backend/
│   ├── main.py              # FastAPI webhook receiver
│   ├── worker.py            # Celery task: fetch, split, review, merge, post
│   ├── openai_client.py     # OpenAI API call with intent-checking system prompt
│   ├── language_prompts.py  # Per-language review checklists (Python/JS/TS/Java)
│   ├── diff_parser.py       # Splits a unified diff into per-file chunks
│   ├── github_client.py     # Fetches diffs, posts formatted review comments
│   ├── models.py            # SQLAlchemy schema for pr_reviews table
│   └── requirements.txt
├── docker-compose.yml        # PostgreSQL + Redis
└── README.md
```

---

## Setup

### Prerequisites
- Python 3.11+
- Docker Desktop
- ngrok (for local webhook testing)
- An OpenAI API key
- A GitHub Personal Access Token (`repo` scope) and a registered GitHub App

### Installation

```bash
git clone https://github.com/Vanishagupta18/mergemind.git
cd mergemind/backend

python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

docker compose up -d       # starts PostgreSQL + Redis
python -c "from models import init_db; init_db()"
```

### Environment Variables

Create `backend/.env`:

```env
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/codereview_db
REDIS_URL=redis://localhost:6379/0
```

### Running locally

Three processes, three terminals:

```bash
# Terminal 1 — API server
uvicorn main:app --reload --port 8000

# Terminal 2 — background worker
celery -A worker worker --loglevel=info --pool=solo

# Terminal 3 — expose local server to GitHub
ngrok http 8000
```

Point your GitHub App's webhook URL to the ngrok forwarding address + `/webhook`, install it on a test repo, and open a PR.

---

## Example Output

> **🤖 MergeMind Review**
> **Overall Score:** 7.0/10 · **Confidence:** Medium
>
> **🚨 Critical Bugs**
> - `app.py` — Function `divide` does not implement division. The function name implies division, but the body uses multiplication instead. *(Confidence: High)*
>
> **💡 Suggested Fixes**
> - Change `return a * b` to `return a / b`

---

## Roadmap

- [ ] Idempotency via diff hashing (avoid re-reviewing unchanged PRs)
- [ ] Retry logic for OpenAI/GitHub API failures
- [ ] File filtering (ignore `node_modules`, `dist`, lockfiles, generated code)
- [ ] Next.js dashboard with review history and quality trends
- [ ] RAG-based review against a team's custom style guide

---

## Author

Built by **Vanisha** — B.Tech CSE student, exploring full-stack + AI engineering.