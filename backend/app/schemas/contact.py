from datetime import datetime

from pydantic import BaseModel, Field


class ContactCreatePayload(BaseModel):
    identifier: str = Field(min_length=3, max_length=80)


class ContactResponse(BaseModel):
    id: str
    identifier: str
    display_name: str
    avatar_key: str
    nickname: str | None
    last_seen_at: datetime | None
