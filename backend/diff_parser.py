# diff_parser.py
import re

def parse_diff(full_diff: str) -> list[dict]:
    """
    Splits a unified git diff into per-file chunks.
    Returns a list of {"filename": str, "diff_text": str}.
    """
    file_pattern = re.compile(r'^diff --git a/(.*?) b/(.*?)$', re.MULTILINE)
    matches = list(file_pattern.finditer(full_diff))

    files = []
    for i, match in enumerate(matches):
        filename = match.group(2)  # path after "b/" — the new/current path
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(full_diff)
        diff_text = full_diff[start:end]
        files.append({"filename": filename, "diff_text": diff_text})

    return files