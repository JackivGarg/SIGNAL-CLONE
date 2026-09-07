from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DatabaseSession
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationMember
from app.models.enums import ConversationKind
from app.models.message import Message, MessageReceipt
from app.models.user import User
from app.schemas.conversation import (
    ConversationPreview,
    DirectConversationPayload,
    MarkReadResponse,
    MessageResponse,
    SendMessagePayload,
)
from app.services.conversations import get_member_conversation, serialize_conversation
from app.services.messages import mark_messages_read, serialize_message

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationPreview])
def list_conversations(current_user: CurrentUser, db: DatabaseSession) -> list[ConversationPreview]:
    conversations = list(
        db.scalars(
            select(Conversation)
            .join(ConversationMember)
            .where(ConversationMember.user_id == current_user.id)
            .order_by(Conversation.last_message_at.desc())
        ).all()
    )
    return [
        serialize_conversation(db, conversation, current_user.id) for conversation in conversations
    ]


@router.post("/direct", response_model=ConversationPreview, status_code=status.HTTP_201_CREATED)
def create_direct_conversation(
    payload: DirectConversationPayload,
    response: Response,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> ConversationPreview:
    target = db.get(User, payload.user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User was not found.")
    if target.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose another user.")

    direct_key = ":".join(sorted((current_user.id, target.id)))
    conversation = db.scalar(select(Conversation).where(Conversation.direct_key == direct_key))
    if conversation is None:
        conversation = Conversation(
            kind=ConversationKind.DIRECT,
            direct_key=direct_key,
            created_by_id=current_user.id,
        )
        db.add(conversation)
        db.flush()
        db.add_all(
            [
                ConversationMember(conversation_id=conversation.id, user_id=current_user.id),
                ConversationMember(conversation_id=conversation.id, user_id=target.id),
            ]
        )
        for owner_id, contact_id in ((current_user.id, target.id), (target.id, current_user.id)):
            if db.get(Contact, (owner_id, contact_id)) is None:
                db.add(Contact(owner_id=owner_id, contact_id=contact_id))
        db.commit()
        db.refresh(conversation)
    else:
        response.status_code = status.HTTP_200_OK

    return serialize_conversation(db, conversation, current_user.id)


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def list_messages(
    conversation_id: str, current_user: CurrentUser, db: DatabaseSession, limit: int = 50
) -> list[MessageResponse]:
    conversation = get_member_conversation(db, conversation_id, current_user.id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation was not found."
        )

    messages = list(
        db.scalars(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.sent_at.desc())
            .limit(min(max(limit, 1), 100))
        ).all()
    )
    return [serialize_message(db, message, current_user.id) for message in reversed(messages)]


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    conversation_id: str,
    payload: SendMessagePayload,
    response: Response,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> MessageResponse:
    conversation = get_member_conversation(db, conversation_id, current_user.id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation was not found."
        )
    body = payload.body.strip()
    if not body:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message is empty."
        )

    message = db.scalar(
        select(Message).where(Message.client_message_id == payload.client_message_id)
    )
    if message is not None:
        if message.sender_id != current_user.id or message.conversation_id != conversation.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Message identifier conflict."
            )
        response.status_code = status.HTTP_200_OK
        return serialize_message(db, message, current_user.id)

    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        client_message_id=payload.client_message_id,
        body=body,
        reply_to_id=payload.reply_to_id,
        sent_at=datetime.now(UTC),
    )
    db.add(message)
    db.flush()
    recipients = list(
        db.scalars(
            select(ConversationMember.user_id).where(
                ConversationMember.conversation_id == conversation.id,
                ConversationMember.user_id != current_user.id,
            )
        ).all()
    )
    db.add_all(
        [MessageReceipt(message_id=message.id, recipient_id=user_id) for user_id in recipients]
    )
    conversation.last_message_at = message.sent_at
    db.commit()
    db.refresh(message)
    return serialize_message(db, message, current_user.id)


@router.post("/{conversation_id}/read", response_model=MarkReadResponse)
def mark_conversation_read(
    conversation_id: str, current_user: CurrentUser, db: DatabaseSession
) -> MarkReadResponse:
    if get_member_conversation(db, conversation_id, current_user.id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation was not found."
        )
    return MarkReadResponse(marked_read=mark_messages_read(db, conversation_id, current_user.id))
