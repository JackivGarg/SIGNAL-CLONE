import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

USERNAME_PATTERN = re.compile(r"^[a-z0-9._-]{3,80}$", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"^\+?[0-9]{7,15}$")


def normalize_username(value: str) -> str:
    normalized = value.strip().lower()
    if normalized.startswith("@"):
        normalized = normalized[1:]
    if not USERNAME_PATTERN.fullmatch(normalized):
        raise ValueError("Use 3-80 letters, numbers, dots, underscores, or hyphens.")
    return normalized


def normalize_phone_number(value: str) -> str:
    normalized = value.strip().replace(" ", "").replace("-", "")
    if not PHONE_PATTERN.fullmatch(normalized):
        raise ValueError("Use a valid phone number with 7-15 digits.")
    return normalized


class RequestOtpPayload(BaseModel):
    phone_number: str = Field(min_length=7, max_length=24)
    username: str = Field(min_length=3, max_length=81)

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        return normalize_phone_number(value)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return normalize_username(value)


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
