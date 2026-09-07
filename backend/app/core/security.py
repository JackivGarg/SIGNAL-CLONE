import hashlib
import hmac
import secrets

from app.core.config import get_settings


def generate_session_token() -> str:
    """Generate a high-entropy token that is safe to place in an HttpOnly cookie."""

    return secrets.token_urlsafe(48)


def hash_session_token(token: str) -> str:
    """Store an HMAC, never a reusable session token, in the database."""

    settings = get_settings()
    return hmac.new(
        settings.app_secret.encode("utf-8"), token.encode("utf-8"), hashlib.sha256
    ).hexdigest()
