from celery import Celery
from openai_client import analyze_diff
from github_client import fetch_diff, post_github_comment
from diff_parser import parse_diff
from file_filters import should_review_file
from idempotency import hash_diff
from models import PRReview, ReviewStats, engine
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import os, json
from dotenv import load_dotenv

load_dotenv()
celery_app = Celery('worker', broker=os.getenv('REDIS_URL'))

MAX_FILES_PER_PR = int(os.getenv("MAX_FILES_PER_PR", 10))
MAX_DIFF_CHARS_PER_FILE = int(os.getenv("MAX_DIFF_CHARS_PER_FILE", 3000))


@celery_app.task
def process_pr(repo: str, pr_number: int, pr_title: str):
    full_diff = fetch_diff(repo, pr_number)
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

    with Session(engine) as session:
        for f in files:
            truncated_diff = f["diff_text"][:MAX_DIFF_CHARS_PER_FILE]
            diff_hash = hash_diff(truncated_diff)

            existing = session.query(PRReview).filter_by(
                repo_name=repo, pr_number=pr_number, diff_hash=diff_hash
            ).first()

            if existing:
                cache_hits += 1
                print(f"Cache hit -> {f['filename']} (hash {diff_hash[:8]}...) — OpenAI call skipped")
                cached = existing.review_json or {}
                cached["_filename"] = f["filename"]
                per_file_results.append(cached)
                continue

            raw_result = analyze_diff(truncated_diff, pr_title, f["filename"])
            api_calls_made += 1
            try:
                parsed = json.loads(raw_result)
                parsed["_filename"] = f["filename"]
                per_file_results.append(parsed)

                review_row = PRReview(
                    repo_name=repo, pr_number=pr_number, pr_title=pr_title,
                    filename=f["filename"], diff_hash=diff_hash,
                    bugs=parsed.get("critical_bugs", []),
                    suggestions=parsed.get("suggested_fixes", []),
                    quality_score=parsed.get("overall_score", 5.0),
                    summary=f["filename"],
                    review_json=parsed,
                    status="completed"
                )
                session.add(review_row)
                session.commit()
            except json.JSONDecodeError:
                print(f"Failed to parse AI response for {f['filename']}")
            except IntegrityError:
                session.rollback()
                print(f"Duplicate review row for {f['filename']} — likely a race with a concurrent run")

        # update running stats for this repo
        stats = session.query(ReviewStats).filter_by(repo_name=repo).first()
        if not stats:
            stats = ReviewStats(repo_name=repo, api_calls_made=0, cache_hits=0, files_skipped_filtered=0)
            session.add(stats)
        stats.api_calls_made += api_calls_made
        stats.cache_hits += cache_hits
        stats.files_skipped_filtered += len(skipped_log)
        session.commit()

    print(f"Summary: {api_calls_made} OpenAI call(s), {cache_hits} cache hit(s), {len(skipped_log)} filtered file(s)")

    merged = merge_reviews(per_file_results)
    post_github_comment(repo, pr_number, json.dumps(merged))
    print(f"Review posted for {repo} PR #{pr_number} across {len(per_file_results)} files")


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