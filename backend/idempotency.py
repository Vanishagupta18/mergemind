import hashlib

def hash_diff(diff_text: str) -> str:
    """Deterministic fingerprint of a single file's diff content."""
    return hashlib.sha256(diff_text.encode('utf-8')).hexdigest()


def hash_batch(diff_hashes: list[str]) -> str:
    """
    Deterministic fingerprint of a whole set of file-diff-hashes.
    Sorted first so the same set of files always hashes the same way
    regardless of the order they were processed in.
    """
    combined = "|".join(sorted(diff_hashes))
    return hashlib.sha256(combined.encode('utf-8')).hexdigest()