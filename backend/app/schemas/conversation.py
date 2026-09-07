from datetime import UTC, datetime

from pydantic import BaseModel, Field, field_serializer


def serialize_utc_timestamp(value: datetime | None) -> str | None:
    if value is None:
        return None
    normalized = value if value.tzinfo else value.replace(tzinfo=UTC)
    return normalized.astimezone(UTC).isoformat().replace("+00:00", "Z")


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

    @field_serializer("sent_at")
    def serialize_sent_at(self, value: datetime) -> str:
        return serialize_utc_timestamp(value) or ""


class ConversationPreview(BaseModel):
    id: str
    kind: str
    title: str
    avatar_key: str
    last_message: LastMessagePreview | None
    last_message_at: datetime | None
    unread_count: int
    peer_user_id: str | None = None

    @field_serializer("last_message_at")
    def serialize_last_message_at(self, value: datetime | None) -> str | None:
        return serialize_utc_timestamp(value)


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

    @field_serializer("sent_at", "delivered_at", "read_at")
    def serialize_message_timestamps(self, value: datetime | None) -> str | None:
        return serialize_utc_timestamp(value)


class MarkReadResponse(BaseModel):
    marked_read: int
