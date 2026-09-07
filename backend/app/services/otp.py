import hmac
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.core.config import get_settings
from app.core.security import hash_otp_code
from app.models.base import new_id
from app.models.otp import OtpChallenge

OTP_LIFETIME_MINUTES = 10
MAX_OTP_ATTEMPTS = 5


def create_otp_challenge(db: DbSession, phone_number: str, username: str) -> OtpChallenge:
    settings = get_settings()
    challenge_id = new_id()
    challenge = OtpChallenge(
        id=challenge_id,
        identifier=phone_number,
        username=username,
        code_hash=hash_otp_code(challenge_id, settings.demo_otp),
        expires_at=datetime.now(UTC) + timedelta(minutes=OTP_LIFETIME_MINUTES),
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


def consume_otp_challenge(db: DbSession, challenge_id: str, code: str) -> OtpChallenge:
    challenge = db.get(OtpChallenge, challenge_id)
    if challenge is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP challenge is no longer valid.",
        )

    now = datetime.now(UTC)
    expires_at = challenge.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if (
        challenge.consumed_at is not None
        or expires_at <= now
        or challenge.attempts >= MAX_OTP_ATTEMPTS
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP challenge is no longer valid.",
        )

    if not hmac.compare_digest(challenge.code_hash, hash_otp_code(challenge.id, code)):
        challenge.attempts += 1
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect verification code.",
        )

    challenge.consumed_at = now
    return challenge
