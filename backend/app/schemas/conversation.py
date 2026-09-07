from datetime import datetime

from pydantic import BaseModel, Field


class DirectConversationPayload(BaseModel):
    user_id: str


class GroupCreatePayload(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    member_ids: list[str] = Field(min_length=1, max_length=50)


class AddGroupMemberPayload(BaseModel):
    user_id: str


class UpdateGroupMemberPayload(BaseModel):
    role: str


class GroupMemberResponse(BaseModel):
    user_id: str
    display_name: str
    avatar_key: str
    role: str
    joined_at: datetime


class LastMessagePreview(BaseModel):
    body: str
    sender_id: str
    sent_at: datetime
    receipt_status: str | None = None


class ConversationPreview(BaseModel):
    id: str
    kind: str
    title: str
    avatar_key: str
    last_message: LastMessagePreview | None
    last_message_at: datetime | None
    unread_count: int
    peer_user_id: str | None = None


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
