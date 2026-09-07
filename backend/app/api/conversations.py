from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DatabaseSession
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationMember
from app.models.enums import ConversationKind
from app.models.user import User
from app.schemas.conversation import ConversationPreview, DirectConversationPayload
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
