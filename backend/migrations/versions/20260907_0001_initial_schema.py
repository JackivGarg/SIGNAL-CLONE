"""Create the initial messaging schema.

Revision ID: 20260907_0001
Revises:
Create Date: 2026-09-07 12:30:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260907_0001"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


conversation_kind = sa.Enum("DIRECT", "GROUP", name="conversationkind", native_enum=False)
member_role = sa.Enum("ADMIN", "MEMBER", name="memberrole", native_enum=False)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("identifier", sa.String(length=80), nullable=False),
        sa.Column("display_name", sa.String(length=80), nullable=False),
        sa.Column("avatar_key", sa.String(length=40), nullable=False),
        sa.Column("bio", sa.String(length=140)),
        sa.Column("last_seen_at", sa.DateTime(timezone=True)),
        sa.Column("is_demo_user", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_users_identifier", "users", ["identifier"], unique=True)

    op.create_table(
        "sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "last_active_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_index("ix_sessions_token_hash", "sessions", ["token_hash"], unique=True)

    op.create_table(
        "contacts",
        sa.Column("owner_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column(
            "contact_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE")
        ),
        sa.Column("nickname", sa.String(length=80)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("owner_id", "contact_id"),
    )

    op.create_table(
        "conversations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("kind", conversation_kind, nullable=False),
        sa.Column("title", sa.String(length=100)),
        sa.Column("avatar_key", sa.String(length=40)),
        sa.Column("direct_key", sa.String(length=73)),
        sa.Column(
            "created_by_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="RESTRICT")
        ),
        sa.Column("last_message_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("direct_key", name="uq_conversations_direct_key"),
    )
    op.create_index("ix_conversations_last_message_at", "conversations", ["last_message_at"])

    op.create_table(
        "conversation_members",
        sa.Column(
            "conversation_id",
            sa.String(length=36),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
        ),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("role", member_role, nullable=False),
        sa.Column(
            "joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("last_read_at", sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint("conversation_id", "user_id"),
    )

    op.create_table(
        "messages",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "conversation_id",
            sa.String(length=36),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "sender_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("client_message_id", sa.String(length=36), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "reply_to_id", sa.String(length=36), sa.ForeignKey("messages.id", ondelete="SET NULL")
        ),
        sa.Column(
            "sent_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("edited_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("client_message_id"),
    )
    op.create_index("ix_messages_conversation_sent_at", "messages", ["conversation_id", "sent_at"])
    op.create_index("ix_messages_sender_id", "messages", ["sender_id"])

    op.create_table(
        "message_receipts",
        sa.Column(
            "message_id", sa.String(length=36), sa.ForeignKey("messages.id", ondelete="CASCADE")
        ),
        sa.Column(
            "recipient_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE")
        ),
        sa.Column("delivered_at", sa.DateTime(timezone=True)),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint("message_id", "recipient_id"),
    )
    op.create_index(
        "ix_message_receipts_recipient_read_at", "message_receipts", ["recipient_id", "read_at"]
    )


def downgrade() -> None:
    op.drop_table("message_receipts")
    op.drop_table("messages")
    op.drop_table("conversation_members")
    op.drop_table("conversations")
    op.drop_table("contacts")
    op.drop_table("sessions")
    op.drop_table("users")
