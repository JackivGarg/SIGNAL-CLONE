"""Store phone numbers separately from searchable usernames.

Revision ID: 20260908_0003
Revises: 20260907_0002
Create Date: 2026-09-08 12:00:00
"""

import re
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260908_0003"
down_revision: str | None = "20260907_0002"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

PHONE_PATTERN = re.compile(r"^\+?[0-9]{7,15}$")


def _available_username(display_name: str, user_id: str, occupied: set[str]) -> str:
    base = re.sub(r"[^a-z0-9._-]+", "_", display_name.strip().lower()).strip("._-")
    if len(base) < 3:
        base = f"user_{user_id[:8]}"
    base = base[:80]
    candidate = base
    suffix = 2
    while candidate in occupied:
        ending = f"_{suffix}"
        candidate = f"{base[: 80 - len(ending)]}{ending}"
        suffix += 1
    occupied.add(candidate)
    return candidate


def upgrade() -> None:
    op.add_column("users", sa.Column("phone_number", sa.String(length=16)))
    op.create_index("ix_users_phone_number", "users", ["phone_number"], unique=True)
    op.add_column("otp_challenges", sa.Column("username", sa.String(length=80)))

    connection = op.get_bind()
    users = connection.execute(
        sa.text("SELECT id, identifier, display_name FROM users")
    ).mappings().all()
    occupied = {row["identifier"] for row in users if not PHONE_PATTERN.fullmatch(row["identifier"])}
    for row in users:
        if not PHONE_PATTERN.fullmatch(row["identifier"]):
            continue
        username = _available_username(row["display_name"], row["id"], occupied)
        connection.execute(
            sa.text(
                "UPDATE users SET identifier = :username, phone_number = :phone_number "
                "WHERE id = :user_id"
            ),
            {"username": username, "phone_number": row["identifier"], "user_id": row["id"]},
        )


def downgrade() -> None:
    op.drop_column("otp_challenges", "username")
    op.drop_index("ix_users_phone_number", table_name="users")
    op.drop_column("users", "phone_number")
