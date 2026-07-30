from celery import Celery
from openai_client import analyze_diff
from github_client import fetch_diff, post_github_comment
from diff_parser import parse_diff
from dotenv import load_dotenv
import os
import json

load_dotenv()

celery_app = Celery(
    "worker",
    broker=os.getenv("REDIS_URL")
)

MAX_FILES_PER_PR = 10
MAX_DIFF_CHARS_PER_FILE = 3000


def merge_reviews(results: list[dict]) -> dict:
    """
    Combine all per-file AI reviews into a single review.
    """

    merged = {
        "overall_score": 0.0,
        "critical_bugs": [],
        "logic_errors": [],
        "security_issues": [],
        "performance_issues": [],
        "maintainability_notes": [],
        "positive_observations": [],
        "suggested_fixes": [],
        "files_reviewed": [],
        "confidence_overall": "Medium"
    }

    if not results:
        return merged

    scores = []

    for r in results:
        filename = r.get("_filename", "unknown")

        merged["files_reviewed"].append(filename)

        scores.append(r.get("overall_score", 5.0))

        for category in [
            "critical_bugs",
            "logic_errors",
            "security_issues",
            "performance_issues"
        ]:
            for issue in r.get(category, []):
                issue["file"] = filename
                merged[category].append(issue)

        for note in r.get("maintainability_notes", []):
            note["file"] = filename
            merged["maintainability_notes"].append(note)

        merged["positive_observations"].extend(
            r.get("positive_observations", [])
        )

        merged["suggested_fixes"].extend(
            r.get("suggested_fixes", [])
        )

    merged["overall_score"] = round(sum(scores) / len(scores), 1)

    return merged


@celery_app.task
def process_pr(repo: str, pr_number: int, pr_title: str):

    full_diff = fetch_diff(repo, pr_number)

    files = parse_diff(full_diff)

    if len(files) > MAX_FILES_PER_PR:
        print(
            f"PR has {len(files)} files. Reviewing first {MAX_FILES_PER_PR} files only."
        )
        files = files[:MAX_FILES_PER_PR]

    per_file_results = []

    for f in files:

        print(f"\nReviewing: {f['filename']}")

        truncated_diff = f["diff_text"][:MAX_DIFF_CHARS_PER_FILE]

        raw_result = analyze_diff(
            truncated_diff,
            pr_title,
            f["filename"]
        )

        try:
            parsed = json.loads(raw_result)
            parsed["_filename"] = f["filename"]
            per_file_results.append(parsed)

        except json.JSONDecodeError:
            print(f"Failed to parse AI response for {f['filename']}")

    merged = merge_reviews(per_file_results)

    print("\n========== MERGED REVIEW ==========\n")
    print(json.dumps(merged, indent=2))
    print("\n===================================\n")

    post_github_comment(
        repo,
        pr_number,
        json.dumps(merged)
    )

    print(
        f"Review posted for {repo} PR #{pr_number} across {len(per_file_results)} files."
    )