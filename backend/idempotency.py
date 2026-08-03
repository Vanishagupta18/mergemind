# idempotency.py
import hashlib

def hash_diff(diff_text: str) -> str:
    """Deterministic fingerprint of a file's diff content."""
    return hashlib.sha256(diff_text.encode('utf-8')).hexdigest()