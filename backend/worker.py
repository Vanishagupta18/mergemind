from celery import Celery
from openai_client import analyze_diff, RETRYABLE_OPENAI_EXCEPTIONS
from github_client import fetch_diff, post_github_comment, GitHubTransientError
from diff_parser import parse_diff
from file_filters import should_review_file
from idempotency import hash_diff, hash_batch
from models import PRReview, PRCommentBatch, ReviewStats, ReviewStatus, engine
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
import os, json
from dotenv import load_dotenv

load_dotenv()
celery_app = Celery('worker', broker=os.getenv('REDIS_URL'))

MAX_FILES_PER_PR = int(os.getenv("MAX_FILES_PER_PR", 10))
MAX_DIFF_CHARS_PER_FILE = int(os.getenv("MAX_DIFF_CHARS_PER_FILE", 3000))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", 3))
RETRY_BACKOFF_BASE = int(os.getenv("RETRY_BACKOFF_BASE", 2))

RETRYABLE_EXCEPTIONS = RETRYABLE_OPENAI_EXCEPTIONS + (GitHubTransientError,)


@celery_app.task(bind=True, max_retries=MAX_RETRIES)
def process_pr(self, repo: str, pr_number: int, pr_title: str):
    full_diff = fetch_diff(repo, pr_number)  # a transient failure here also triggers retry, see except block below
    all_files = parse_diff(full_diff)

    files, skipped_log = [], []
    for f in all_files:
        ok, reason = should_review_file(f["filename"])
        if ok:
            files.append(f)
        else:
            skipped_log.append((f["filename"], reason))

    if skipped_log:
        print(f"Skipped {len(skipped_log)} file(s):")
        for name, reason in skipped_log:
            print(f"  - {name}  (reason: {reason})")

    if len(files) > MAX_FILES_PER_PR:
        print(f"PR has {len(files)} reviewable files, reviewing first {MAX_FILES_PER_PR} only")
        files = files[:MAX_FILES_PER_PR]

    per_file_results = []
    api_calls_made, cache_hits = 0, 0
    all_diff_hashes = []

    with Session(engine) as session:
        for f in files:
            truncated_diff = f["diff_text"][:MAX_DIFF_CHARS_PER_FILE]
            diff_hash = hash_diff(truncated_diff)
            all_diff_hashes.append(diff_hash)

            review_row = session.query(PRReview).filter_by(
                repo_name=repo, pr_number=pr_number, diff_hash=diff_hash
            ).first()

            if review_row and review_row.status == ReviewStatus.COMPLETED:
                cache_hits += 1
                print(f"Cache hit -> {f['filename']} — OpenAI call skipped")
                cached = review_row.review_json or {}
                cached["_filename"] = f["filename"]
                per_file_results.append(cached)
                continue

            if not review_row:
                review_row = PRReview(
                    repo_name=repo, pr_number=pr_number, pr_title=pr_title,
                    filename=f["filename"], diff_hash=diff_hash,
                    status=ReviewStatus.PENDING, retry_count=0
                )
                session.add(review_row)
                session.commit()

            review_row.status = ReviewStatus.PROCESSING
            review_row.last_attempt_at = datetime.now(timezone.utc)
            session.commit()
            print(f"Status -> {ReviewStatus.PROCESSING}: {f['filename']}")

            try:
                raw_result = analyze_diff(truncated_diff, pr_title, f["filename"])
                api_calls_made += 1
                parsed = json.loads(raw_result)
                parsed["_filename"] = f["filename"]
                per_file_results.append(parsed)

                review_row.bugs = parsed.get("critical_bugs", [])
                review_row.suggestions = parsed.get("suggested_fixes", [])
                review_row.quality_score = parsed.get("overall_score", 5.0)
                review_row.summary = f["filename"]
                review_row.review_json = parsed
                review_row.status = ReviewStatus.COMPLETED
                session.commit()

            except json.JSONDecodeError as e:
                # Not transient — the model gave bad JSON. Retrying immediately likely repeats the
                # same failure, so we mark it failed rather than burning a retry on it.
                review_row.status = ReviewStatus.FAILED
                review_row.last_error = f"JSON parse error: {e}"
                session.commit()
                print(f"Failed to parse AI response for {f['filename']}")

            except RETRYABLE_EXCEPTIONS as e:
                review_row.status = ReviewStatus.RETRYING
                review_row.retry_count = min((review_row.retry_count or 0) + 1, MAX_RETRIES)
                review_row.last_error = str(e)
                session.commit()

                if self.request.retries >= MAX_RETRIES:
                    review_row.status = ReviewStatus.FAILED
                    session.commit()
                    print(f"Giving up on {f['filename']} after {self.request.retries} retries: {e}")
                    continue  # move on to the next file rather than failing the whole PR

                backoff_seconds = RETRY_BACKOFF_BASE ** self.request.retries
                print(f"Transient error on {f['filename']}: {e} — retrying in {backoff_seconds}s "
                      f"(attempt {self.request.retries + 1}/{MAX_RETRIES})")
                raise self.retry(exc=e, countdown=backoff_seconds)

            except IntegrityError:
                session.rollback()
                print(f"Duplicate review row for {f['filename']} — likely a race with a concurrent run")

        stats = session.query(ReviewStats).filter_by(repo_name=repo).first()
        if not stats:
            stats = ReviewStats(repo_name=repo, api_calls_made=0, cache_hits=0, files_skipped_filtered=0)
            session.add(stats)
        stats.api_calls_made += api_calls_made
        stats.cache_hits += cache_hits
        stats.files_skipped_filtered += len(skipped_log)
        session.commit()

        print(f"Summary: {api_calls_made} OpenAI call(s), {cache_hits} cache hit(s), {len(skipped_log)} filtered file(s)")

        # --- Comment idempotency: don't post the same merged comment twice ---
        batch_hash = hash_batch(all_diff_hashes)
        comment_batch = session.query(PRCommentBatch).filter_by(
            repo_name=repo, pr_number=pr_number, batch_hash=batch_hash
        ).first()

        if comment_batch and comment_batch.comment_posted:
            print(f"Comment already posted for this exact batch (id={comment_batch.github_comment_id}) — skipping post")
            return

        if not comment_batch:
            comment_batch = PRCommentBatch(
                repo_name=repo, pr_number=pr_number, batch_hash=batch_hash, comment_posted=False
            )
            session.add(comment_batch)
            session.commit()

        merged = merge_reviews(per_file_results)
        try:
            comment_id = post_github_comment(repo, pr_number, json.dumps(merged))
            comment_batch.comment_posted = True
            comment_batch.github_comment_id = comment_id
            session.commit()
            print(f"Review posted for {repo} PR #{pr_number} across {len(per_file_results)} files")
        except GitHubTransientError as e:
            if self.request.retries >= MAX_RETRIES:
                print(f"Giving up posting GitHub comment after {self.request.retries} retries: {e}")
                return
            backoff_seconds = RETRY_BACKOFF_BASE ** self.request.retries
            print(f"Transient error posting comment: {e} — retrying in {backoff_seconds}s")
            raise self.retry(exc=e, countdown=backoff_seconds)


def merge_reviews(results: list[dict]) -> dict:
    merged = {
        "overall_score": 0.0,
        "critical_bugs": [], "logic_errors": [], "security_issues": [],
        "performance_issues": [], "maintainability_notes": [],
        "positive_observations": [], "suggested_fixes": [],
        "files_reviewed": [], "confidence_overall": "Medium"
    }
    if not results:
        return merged

    scores = []
    for r in results:
        filename = r.get("_filename", "unknown")
        merged["files_reviewed"].append(filename)
        scores.append(r.get("overall_score", 5.0))
        for category in ["critical_bugs", "logic_errors", "security_issues", "performance_issues"]:
            for issue in r.get(category, []):
                issue["file"] = filename
                merged[category].append(issue)
        for note in r.get("maintainability_notes", []):
            note["file"] = filename
            merged["maintainability_notes"].append(note)
        merged["positive_observations"].extend(r.get("positive_observations", []))
        merged["suggested_fixes"].extend(r.get("suggested_fixes", []))

    merged["overall_score"] = round(sum(scores) / len(scores), 1)
    return merged