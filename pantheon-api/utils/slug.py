import secrets
import string

_ALPHABET = string.ascii_letters + string.digits  # 62 chars, URL-safe


def generate_slug(length: int = 8) -> str:
    """Generate a cryptographically random URL-safe slug (nanoid-style)."""
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))
