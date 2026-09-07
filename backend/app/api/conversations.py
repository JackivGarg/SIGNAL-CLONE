from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DatabaseSession
from app.models.base import new_id
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationMember
from app.models.enums import ConversationKind, MemberRole
from app.models.message import Message, MessageReceipt
from app.models.user import User
from app.schemas.conversation import (
    AddGroupMemberPayload,
    ConversationPreview,
    DirectConversationPayload,
    GroupCreatePayload,
    GroupMemberResponse,
    MarkReadResponse,
    MessageResponse,
    SendMessagePayload,
    UpdateGroupMemberPayload,
)
from app.services.conversations import get_member_conversation, serialize_conversation
from app.services.messages import mark_messages_read, serialize_message
from app.websocket.manager import connection_manager

router = APIRouter(prefix="/conversations", tags=["conversations"])


async def notify_conversation_created(
    db: DatabaseSession, conversation: Conversation, user_ids: list[str]
) -> None:
    """Tell newly added members to insert a conversation without a page refresh."""
    for user_id in user_ids:
        await connection_manager.send_to_user(
            user_id,
            {
                "type": "conversation.created",
                "conversation": serialize_conversation(db, conversation, user_id).model_dump(
                    mode="json"
                ),
            },
        )


def serialize_group_member(member: ConversationMember, user: User) -> GroupMemberResponse:
    return GroupMemberResponse(
        user_id=user.id,
        display_name=user.display_name,
        avatar_key=user.avatar_key,
        role=member.role.value,
        joined_at=member.joined_at,
    )


def get_group_membership(
    db: DatabaseSession, conversation_id: str, user_id: str
) -> tuple[Conversation, ConversationMember] | None:
    conversation = get_member_conversation(db, conversation_id, user_id)
    if conversation is None or conversation.kind != ConversationKind.GROUP:
        return None
    membership = db.get(ConversationMember, (conversation.id, user_id))
    return (conversation, membership) if membership else None


def require_group_admin(
    db: DatabaseSession, conversation_id: str, user_id: str
) -> tuple[Conversation, ConversationMember]:
    group_membership = get_group_membership(db, conversation_id, user_id)
    if group_membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group was not found.")
    conversation, membership = group_membership
    if membership.role != MemberRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Group admin access is required."
        )
    return conversation, membership


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
async def create_direct_conversation(
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
    created = conversation is None
    if created:
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

    if created:
        await notify_conversation_created(db, conversation, [target.id])

    return serialize_conversation(db, conversation, current_user.id)


@router.post("/groups", response_model=ConversationPreview, status_code=status.HTTP_201_CREATED)
async def create_group_conversation(
    payload: GroupCreatePayload, current_user: CurrentUser, db: DatabaseSession
) -> ConversationPreview:
    title = " ".join(payload.title.split())
    if not title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Group name is empty."
        )

    member_ids = set(payload.member_ids) - {current_user.id}
    members = list(db.scalars(select(User).where(User.id.in_(member_ids))).all())
    if len(members) != len(member_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="A group member was not found."
        )

    conversation = Conversation(
        kind=ConversationKind.GROUP,
        title=title,
        avatar_key="coral",
        direct_key=f"group:{new_id()}",
        created_by_id=current_user.id,
    )
    db.add(conversation)
    db.flush()
    db.add(
        ConversationMember(
            conversation_id=conversation.id, user_id=current_user.id, role=MemberRole.ADMIN
        )
    )
    db.add_all(
        [
            ConversationMember(conversation_id=conversation.id, user_id=member.id)
            for member in members
        ]
    )
    db.commit()
    db.refresh(conversation)
    await notify_conversation_created(db, conversation, [member.id for member in members])
    return serialize_conversation(db, conversation, current_user.id)


@router.get("/{conversation_id}/members", response_model=list[GroupMemberResponse])
def list_group_members(
    conversation_id: str, current_user: CurrentUser, db: DatabaseSession
) -> list[GroupMemberResponse]:
    if get_group_membership(db, conversation_id, current_user.id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group was not found.")
    return [
        serialize_group_member(member, user)
        for member, user in db.execute(
            select(ConversationMember, User)
            .join(User, User.id == ConversationMember.user_id)
            .where(ConversationMember.conversation_id == conversation_id)
            .order_by(ConversationMember.role, User.display_name)
        ).all()
    ]


@router.post(
    "/{conversation_id}/members",
    response_model=GroupMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_group_member(
    conversation_id: str,
    payload: AddGroupMemberPayload,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> GroupMemberResponse:
    conversation, _ = require_group_admin(db, conversation_id, current_user.id)
    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User was not found.")
    member = db.get(ConversationMember, (conversation.id, user.id))
    if member is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="User is already in this group."
        )

    member = ConversationMember(conversation_id=conversation.id, user_id=user.id)
    db.add(member)
    db.commit()
    db.refresh(member)
    await notify_conversation_created(db, conversation, [user.id])
    return serialize_group_member(member, user)


@router.delete("/{conversation_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_group_member(
    conversation_id: str, user_id: str, current_user: CurrentUser, db: DatabaseSession
) -> Response:
    conversation, _ = require_group_admin(db, conversation_id, current_user.id)
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assign another admin before leaving your group.",
        )
    member = db.get(ConversationMember, (conversation.id, user_id))
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Group member was not found."
        )

    db.delete(member)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{conversation_id}/members/{user_id}", response_model=GroupMemberResponse)
def update_group_member(
    conversation_id: str,
    user_id: str,
    payload: UpdateGroupMemberPayload,
    current_user: CurrentUser,
    db: DatabaseSession,
) -> GroupMemberResponse:
    conversation, _ = require_group_admin(db, conversation_id, current_user.id)
    try:
        role = MemberRole(payload.role)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Role must be admin or member.",
        ) from error

    member = db.get(ConversationMember, (conversation.id, user_id))
    user = db.get(User, user_id)
    if member is None or user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Group member was not found."
        )

    if member.role == MemberRole.ADMIN and role == MemberRole.MEMBER:
        other_admin_exists = db.scalar(
            select(ConversationMember.user_id).where(
                ConversationMember.conversation_id == conversation.id,
                ConversationMember.role == MemberRole.ADMIN,
                ConversationMember.user_id != user_id,
            )
        )
        if other_admin_exists is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A group must keep at least one admin.",
            )

    member.role = role
    db.commit()
    db.refresh(member)
    return serialize_group_member(member, user)


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
async def send_message(
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
    now = datetime.now(UTC)
    recipients = list(
        db.scalars(
            select(ConversationMember.user_id).where(
                ConversationMember.conversation_id == conversation.id,
                ConversationMember.user_id != current_user.id,
            )
        ).all()
    )
    db.add_all(
        [
            MessageReceipt(
                message_id=message.id,
                recipient_id=user_id,
                delivered_at=now if connection_manager.is_connected(user_id) else None,
            )
            for user_id in recipients
        ]
    )
    conversation.last_message_at = message.sent_at
    db.commit()
    db.refresh(message)

    for recipient_id in recipients:
        await connection_manager.send_to_user(
            recipient_id,
            {
                "type": "message.created",
                "message": serialize_message(db, message, recipient_id).model_dump(mode="json"),
            },
        )
        if connection_manager.is_connected(recipient_id):
            await connection_manager.send_to_user(
                current_user.id,
                {
                    "type": "receipt.updated",
                    "message_id": message.id,
                    "recipient_id": recipient_id,
                    "status": "delivered",
                    "occurred_at": now.isoformat(),
                },
            )

    return serialize_message(db, message, current_user.id)


@router.post("/{conversation_id}/read", response_model=MarkReadResponse)
async def mark_conversation_read(
    conversation_id: str, current_user: CurrentUser, db: DatabaseSession
) -> MarkReadResponse:
    if get_member_conversation(db, conversation_id, current_user.id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation was not found."
        )
    read_receipts = mark_messages_read(db, conversation_id, current_user.id)
    for message, receipt in read_receipts:
        await connection_manager.send_to_user(
            message.sender_id,
            {
                "type": "receipt.updated",
                "message_id": message.id,
                "recipient_id": current_user.id,
                "status": "read",
                "occurred_at": receipt.read_at.isoformat() if receipt.read_at else None,
            },
        )
    return MarkReadResponse(marked_read=len(read_receipts))
