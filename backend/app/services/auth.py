from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.core.security import generate_session_token, hash_session_token
from app.models.session import Session
from app.models.user import User


def create_session(db: DbSession, user: User) -> str:
    """Create a durable session and return its one-time raw token."""

    settings = get_settings()
    token = generate_session_token()
    db.add(
        Session(
            user_id=user.id,
            token_hash=hash_session_token(token),
            expires_at=datetime.now(UTC) + timedelta(days=settings.session_duration_days),
        )
    )
    db.commit()
    return token


def get_user_for_session_token(db: DbSession, token: str | None) -> User | None:
    """Resolve a non-expired token to its user and update last activity."""

    if not token:
        return None

    session = db.scalar(
        select(Session).where(
            Session.token_hash == hash_session_token(token),
            Session.expires_at > datetime.now(UTC),
        )
    )
    if session is None:
        return None

    user = db.get(User, session.user_id)
    if user is None:
        return None

    session.last_active_at = datetime.now(UTC)
    db.commit()
    return user


def delete_session(db: DbSession, token: str | None) -> None:
    """Invalidate a session token without exposing whether it existed."""

    if token:
        db.execute(delete(Session).where(Session.token_hash == hash_session_token(token)))
        db.commit()
