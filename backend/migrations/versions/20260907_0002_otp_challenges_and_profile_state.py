"""Add mocked OTP challenges and profile completion state.

Revision ID: 20260907_0002
Revises: 20260907_0001
Create Date: 2026-09-07 12:45:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260907_0002"
down_revision: str | None = "20260907_0001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_profile_complete",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        )
    )

    op.create_table(
        "otp_challenges",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("identifier", sa.String(length=80), nullable=False),
        sa.Column("code_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_otp_challenges_identifier", "otp_challenges", ["identifier"])


def downgrade() -> None:
    op.drop_table("otp_challenges")
    op.drop_column("users", "is_profile_complete")
