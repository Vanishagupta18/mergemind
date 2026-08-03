# file_filters.py

IGNORED_PATTERNS = {
    "node_modules/": "Third-party dependency",
    "dist/": "Generated build artifact",
    "build/": "Generated build artifact",
    "coverage/": "Generated test coverage report",
    ".next/": "Generated Next.js build output",
    "vendor/": "Third-party dependency",
    "__pycache__/": "Python bytecode cache",
    ".venv/": "Virtual environment",
    "venv/": "Virtual environment",
}

IGNORED_FILENAMES = {
    "package-lock.json": "Dependency lock file",
    "yarn.lock": "Dependency lock file",
    "pnpm-lock.yaml": "Dependency lock file",
    "poetry.lock": "Dependency lock file",
    "Pipfile.lock": "Dependency lock file",
}

IGNORED_EXTENSIONS = {
    ".min.js": "Minified asset",
    ".min.css": "Minified asset",
    ".map": "Source map",
    ".lock": "Lock file",
}

def should_review_file(filename: str) -> tuple[bool, str]:
    """Returns (should_review, reason_if_skipped)."""
    for pattern, reason in IGNORED_PATTERNS.items():
        if pattern in filename:
            return False, reason

    base = filename.rsplit("/", 1)[-1]
    if base in IGNORED_FILENAMES:
        return False, IGNORED_FILENAMES[base]

    for ext, reason in IGNORED_EXTENSIONS.items():
        if filename.endswith(ext):
            return False, reason

    return True, ""