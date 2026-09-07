from datetime import datetime

from pydantic import BaseModel


class DirectConversationPayload(BaseModel):
    user_id: str


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


class SendMessagePayload(BaseModel):
    body: str
    client_message_id: str
    reply_to_id: str | None = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    body: str
    client_message_id: str
    reply_to_id: str | None
    sent_at: datetime
    delivered_at: datetime | None
    read_at: datetime | None


class MarkReadResponse(BaseModel):
    marked_read: int
