import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

IDENTIFIER_PATTERN = re.compile(r"^(?:\+?[0-9]{7,15}|[a-z0-9._-]{3,80})$", re.IGNORECASE)


def normalize_identifier(value: str) -> str:
    normalized = value.strip().lower()
    if not IDENTIFIER_PATTERN.fullmatch(normalized):
        raise ValueError("Use a username or a valid phone number.")
    return normalized


class RequestOtpPayload(BaseModel):
    identifier: str = Field(min_length=3, max_length=80)

    @field_validator("identifier")
    @classmethod
    def validate_identifier(cls, value: str) -> str:
        return normalize_identifier(value)


class OtpChallengeResponse(BaseModel):
    challenge_id: str
    expires_at: datetime
    demo_code: str | None = None


class VerifyOtpPayload(BaseModel):
    challenge_id: str
    code: str = Field(min_length=6, max_length=6)


AVATAR_KEYS = {"ocean", "sunset", "violet", "forest", "coral", "sky", "amber", "rose"}


class UpdateProfilePayload(BaseModel):
    display_name: str = Field(min_length=1, max_length=80)
    avatar_key: str
    bio: str | None = Field(default=None, max_length=140)

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Display name cannot be empty.")
        return normalized

    @field_validator("avatar_key")
    @classmethod
    def validate_avatar_key(cls, value: str) -> str:
        if value not in AVATAR_KEYS:
            raise ValueError("Choose one of the available avatars.")
        return value
