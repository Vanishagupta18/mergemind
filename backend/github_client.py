import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("GITHUB_TOKEN")


def fetch_diff(repo: str, pr_number: int) -> str:
    """
    Fetch the unified diff of a Pull Request.
    """
    url = f"https://api.github.com/repos/{repo}/pulls/{pr_number}"

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github.v3.diff"
    }

    response = requests.get(url, headers=headers)
    response.raise_for_status()

    return response.text


def post_github_comment(repo: str, pr_number: int, review_json: str):
    """
    Format merged AI review and post it as a GitHub PR comment.
    """

    review = json.loads(review_json)

    comment = []

    comment.append("# 🤖 CodeReview AI\n")

    comment.append(
        f"**Overall Score:** {review.get('overall_score', 'N/A')}/10"
    )

    comment.append(
        f"**Confidence:** {review.get('confidence_overall', 'Unknown')}\n"
    )

    # -----------------------
    # Files Reviewed
    # -----------------------

    files = review.get("files_reviewed", [])

    if files:
        comment.append("## 📂 Files Reviewed")

        for file in files:
            comment.append(f"- `{file}`")

        comment.append("")

    # -----------------------
    # Critical Bugs
    # -----------------------

    critical = review.get("critical_bugs", [])

    comment.append("## 🚨 Critical Bugs")

    if critical:

        for bug in critical:

            comment.append(
                f"### 📄 {bug.get('file', 'Unknown File')}"
            )

            comment.append(
                f"**Issue:** {bug.get('issue')}"
            )

            comment.append(
                f"**Reason:** {bug.get('reasoning')}"
            )

            comment.append(
                f"**Confidence:** {bug.get('confidence')}"
            )

            if bug.get("line") is not None:
                comment.append(
                    f"**Line:** {bug.get('line')}"
                )

            comment.append("")

    else:
        comment.append("No critical bugs found.\n")

    # -----------------------
    # Logic Errors
    # -----------------------

    logic = review.get("logic_errors", [])

    comment.append("## ⚠ Logic Errors")

    if logic:

        for bug in logic:

            comment.append(
                f"### 📄 {bug.get('file', 'Unknown File')}"
            )

            comment.append(
                f"**Issue:** {bug.get('issue')}"
            )

            comment.append(
                f"**Reason:** {bug.get('reasoning')}"
            )

            comment.append(
                f"**Confidence:** {bug.get('confidence')}"
            )

            comment.append("")

    else:
        comment.append("No logic errors detected.\n")

    # -----------------------
    # Security
    # -----------------------

    security = review.get("security_issues", [])

    comment.append("## 🔒 Security Issues")

    if security:

        for issue in security:

            comment.append(
                f"### 📄 {issue.get('file', 'Unknown File')}"
            )

            comment.append(
                f"**Issue:** {issue.get('issue')}"
            )

            comment.append(
                f"**Reason:** {issue.get('reasoning')}"
            )

            comment.append("")

    else:
        comment.append("No security issues detected.\n")

    # -----------------------
    # Performance
    # -----------------------

    performance = review.get("performance_issues", [])

    comment.append("## ⚡ Performance")

    if performance:

        for issue in performance:

            comment.append(
                f"### 📄 {issue.get('file', 'Unknown File')}"
            )

            comment.append(
                f"**Issue:** {issue.get('issue')}"
            )

            comment.append(
                f"**Reason:** {issue.get('reasoning')}"
            )

            comment.append("")

    else:
        comment.append("No performance issues detected.\n")

    # -----------------------
    # Maintainability
    # -----------------------

    maintainability = review.get("maintainability_notes", [])

    comment.append("## 🛠 Maintainability")

    if maintainability:

        for note in maintainability:

            comment.append(
                f"### 📄 {note.get('file', 'Unknown File')}"
            )

            comment.append(
                f"- {note.get('reasoning')}"
            )

            comment.append("")

    else:
        comment.append("No maintainability concerns.\n")

    # -----------------------
    # Suggested Fixes
    # -----------------------

    fixes = review.get("suggested_fixes", [])

    comment.append("## 💡 Suggested Fixes")

    if fixes:

        for fix in fixes:

            comment.append(
                f"**Issue:** {fix.get('issue')}"
            )

            comment.append(
                f"**Suggested Fix:** {fix.get('fix')}"
            )

            comment.append("")

    else:
        comment.append("No suggested fixes.\n")

    # -----------------------
    # Positive Observations
    # -----------------------

    positives = review.get("positive_observations", [])

    comment.append("## ✅ Positive Observations")

    if positives:

        for p in positives:
            comment.append(f"- {p}")

        comment.append("")

    else:
        comment.append("No positive observations.\n")

    comment.append("---")
    comment.append("*Reviewed automatically by CodeReview AI (GPT-4o-mini)*")

    body = "\n".join(comment)

    url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"

    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json"
    }

    response = requests.post(
        url,
        headers=headers,
        json={"body": body}
    )

    response.raise_for_status()

    print("GitHub comment posted successfully.")