from datetime import datetime

from pydantic import BaseModel


class LastMessagePreview(BaseModel):
    body: str
    sender_id: str
    sent_at: datetime


class ConversationPreview(BaseModel):
    id: str
    kind: str
    title: str
    avatar_key: str
    last_message: LastMessagePreview | None
    last_message_at: datetime | None
    unread_count: int
