from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DatabaseSession
from app.models.conversation import Conversation, ConversationMember
from app.schemas.conversation import ConversationPreview
from app.services.conversations import serialize_conversation

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
