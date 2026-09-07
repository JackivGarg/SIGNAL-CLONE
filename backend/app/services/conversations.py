from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession

from app.models.conversation import Conversation, ConversationMember
from app.models.enums import ConversationKind
from app.models.message import Message, MessageReceipt
from app.models.user import User
from app.schemas.conversation import ConversationPreview, LastMessagePreview


def get_member_conversation(
    db: DbSession, conversation_id: str, user_id: str
) -> Conversation | None:
    return db.scalar(
        select(Conversation)
        .join(ConversationMember)
        .where(Conversation.id == conversation_id, ConversationMember.user_id == user_id)
    )


def get_direct_peer(db: DbSession, conversation_id: str, user_id: str) -> User | None:
    return db.scalar(
        select(User)
        .join(ConversationMember, ConversationMember.user_id == User.id)
        .where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id != user_id,
        )
    )


def serialize_conversation(
    db: DbSession, conversation: Conversation, current_user_id: str
) -> ConversationPreview:
    last_message = db.scalar(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.sent_at.desc())
        .limit(1)
    )
    unread_count = db.scalar(
        select(func.count())
        .select_from(Message)
        .outerjoin(
            MessageReceipt,
            (MessageReceipt.message_id == Message.id)
            & (MessageReceipt.recipient_id == current_user_id),
        )
        .where(
            Message.conversation_id == conversation.id,
            Message.sender_id != current_user_id,
            MessageReceipt.read_at.is_(None),
        )
    )

    if conversation.kind == ConversationKind.DIRECT:
        peer = get_direct_peer(db, conversation.id, current_user_id)
        title = peer.display_name if peer else "Unknown user"
        avatar_key = peer.avatar_key if peer else "sky"
        peer_user_id = peer.id if peer else None
    else:
        title = conversation.title or "Untitled group"
        avatar_key = conversation.avatar_key or "coral"
        peer_user_id = None

    return ConversationPreview(
        id=conversation.id,
        kind=conversation.kind.value,
        title=title,
        avatar_key=avatar_key,
        last_message=(
            LastMessagePreview(
                body=last_message.body,
                sender_id=last_message.sender_id,
                sent_at=last_message.sent_at,
            )
            if last_message
            else None
        ),
        last_message_at=conversation.last_message_at,
        unread_count=unread_count or 0,
        peer_user_id=peer_user_id,
    )
