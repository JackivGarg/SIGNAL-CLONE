from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    PrimaryKeyConstraint,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin
from app.models.enums import ConversationKind, MemberRole


class Conversation(IdMixin, TimestampMixin, Base):
    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint("direct_key", name="uq_conversations_direct_key"),
        Index("ix_conversations_last_message_at", "last_message_at"),
    )

    kind: Mapped[ConversationKind] = mapped_column(
        Enum(ConversationKind, native_enum=False, create_constraint=True), nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(100))
    avatar_key: Mapped[str | None] = mapped_column(String(40))
    direct_key: Mapped[str | None] = mapped_column(String(73))
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ConversationMember(Base):
    __tablename__ = "conversation_members"
    __table_args__ = (PrimaryKeyConstraint("conversation_id", "user_id"),)

    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE")
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[MemberRole] = mapped_column(
        Enum(MemberRole, native_enum=False, create_constraint=True),
        default=MemberRole.MEMBER,
        nullable=False,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
