"""Idempotent demo data for local development and the public reviewer flow."""

from datetime import UTC, datetime, timedelta
from itertools import combinations
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.core.database import SessionLocal
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationMember
from app.models.enums import ConversationKind, MemberRole
from app.models.message import Message, MessageReceipt
from app.models.user import User

DEMO_USERS = (
    {"identifier": "jack", "display_name": "Jack", "avatar_key": "ocean"},
    {"identifier": "ava", "display_name": "Ava Patel", "avatar_key": "sunset"},
    {"identifier": "sofia", "display_name": "Sofia Chen", "avatar_key": "violet"},
    {"identifier": "liam", "display_name": "Liam Wilson", "avatar_key": "forest"},
)


def stable_id(value: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"signal-clone/{value}"))


def get_or_create_user(db: DbSession, definition: dict[str, str]) -> User:
    user = db.scalar(select(User).where(User.identifier == definition["identifier"]))
    if user is None:
        user = User(
            id=stable_id(f"user/{definition['identifier']}"),
            is_demo_user=True,
            is_profile_complete=True,
            **definition,
        )
        db.add(user)
        db.flush()
    elif not user.is_profile_complete:
        user.is_profile_complete = True
    return user


def get_or_create_conversation(
    db: DbSession,
    *,
    key: str,
    kind: ConversationKind,
    created_by: User,
    title: str | None = None,
    avatar_key: str | None = None,
) -> Conversation:
    conversation = db.scalar(select(Conversation).where(Conversation.direct_key == key))
    if conversation is None:
        conversation = Conversation(
            id=stable_id(f"conversation/{key}"),
            kind=kind,
            direct_key=key,
            created_by_id=created_by.id,
            title=title,
            avatar_key=avatar_key,
        )
        db.add(conversation)
        db.flush()
    return conversation


def ensure_member(
    db: DbSession, conversation: Conversation, user: User, role: MemberRole = MemberRole.MEMBER
) -> None:
    member = db.get(ConversationMember, (conversation.id, user.id))
    if member is None:
        db.add(ConversationMember(conversation_id=conversation.id, user_id=user.id, role=role))


def add_message(
    db: DbSession,
    *,
    conversation: Conversation,
    sender: User,
    body: str,
    sent_at: datetime,
    recipients: list[User],
) -> None:
    client_message_id = stable_id(f"message/{conversation.id}/{sender.id}/{body}")
    message = db.scalar(select(Message).where(Message.client_message_id == client_message_id))
    if message is not None:
        return

    message = Message(
        id=stable_id(f"stored/{client_message_id}"),
        conversation_id=conversation.id,
        sender_id=sender.id,
        client_message_id=client_message_id,
        body=body,
        sent_at=sent_at,
    )
    db.add(message)
    db.flush()
    conversation.last_message_at = sent_at

    for recipient in recipients:
        if recipient.id == sender.id:
            continue
        db.add(
            MessageReceipt(
                message_id=message.id,
                recipient_id=recipient.id,
                delivered_at=sent_at + timedelta(seconds=2),
                read_at=sent_at + timedelta(minutes=1),
            )
        )


def seed_database(db: DbSession) -> None:
    """Create predictable records without duplicating them on later runs."""

    users = {
        definition["identifier"]: get_or_create_user(db, definition) for definition in DEMO_USERS
    }

    for owner, contact in combinations(users.values(), 2):
        for source, target in ((owner, contact), (contact, owner)):
            if db.get(Contact, (source.id, target.id)) is None:
                db.add(Contact(owner_id=source.id, contact_id=target.id))

    direct_pairs = (("jack", "ava"), ("jack", "sofia"), ("jack", "liam"), ("ava", "sofia"))
    conversations: dict[str, Conversation] = {}
    for first, second in direct_pairs:
        direct_key = ":".join(sorted((users[first].id, users[second].id)))
        conversation = get_or_create_conversation(
            db,
            key=direct_key,
            kind=ConversationKind.DIRECT,
            created_by=users[first],
        )
        ensure_member(db, conversation, users[first])
        ensure_member(db, conversation, users[second])
        conversations[f"{first}-{second}"] = conversation

    group = get_or_create_conversation(
        db,
        key="group/weekend-plans",
        kind=ConversationKind.GROUP,
        created_by=users["jack"],
        title="Weekend plans",
        avatar_key="coral",
    )
    for identifier, user in users.items():
        ensure_member(
            db,
            group,
            user,
            MemberRole.ADMIN if identifier == "jack" else MemberRole.MEMBER,
        )
    conversations["weekend"] = group

    now = datetime.now(UTC).replace(microsecond=0)
    seeded_messages = (
        ("jack-ava", "ava", "Hey Jack! Are we still reviewing the new screens today?", 180),
        ("jack-ava", "jack", "Absolutely. I will send the first pass in an hour.", 165),
        ("jack-sofia", "sofia", "The group chat is looking great already.", 120),
        ("jack-liam", "liam", "I added a few notes to the brief. Have a look when you can.", 90),
        ("weekend", "jack", "Quick vote: brunch or a movie this weekend?", 75),
        ("weekend", "ava", "Brunch gets my vote!", 62),
        ("weekend", "sofia", "Brunch, then a walk if the weather stays nice.", 44),
        ("weekend", "liam", "Perfect. Saturday at 11?", 20),
    )
    for conversation_key, sender_key, body, minutes_ago in seeded_messages:
        conversation = conversations[conversation_key]
        add_message(
            db,
            conversation=conversation,
            sender=users[sender_key],
            body=body,
            sent_at=now - timedelta(minutes=minutes_ago),
            recipients=list(users.values())
            if conversation.kind == ConversationKind.GROUP
            else [users[key] for key in conversation_key.split("-")],
        )

    db.commit()


def main() -> None:
    with SessionLocal() as db:
        seed_database(db)
    print("Demo data is ready.")


if __name__ == "__main__":
    main()
