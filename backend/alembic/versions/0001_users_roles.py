"""create users, roles, user_roles tables and seed roles

Revision ID: 0001_users_roles
Revises:
Create Date: 2026-07-12

SRS §7.4.1 — users table
SRS §7.4.2 — roles table + user_roles junction
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

# ---------------------------------------------------------------------------
# Revision identifiers
# ---------------------------------------------------------------------------
revision: str = "0001_users_roles"
down_revision: str | None = None
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None

# ---------------------------------------------------------------------------
# Seed data — 5 canonical roles (SRS §7.4.2)
# ---------------------------------------------------------------------------
SEED_ROLES = [
    {
        "id": str(uuid.UUID("00000000-0000-0000-0000-000000000001")),
        "name": "Fleet Manager",
        "description": "Full operational control over vehicles, drivers, and trips.",
    },
    {
        "id": str(uuid.UUID("00000000-0000-0000-0000-000000000002")),
        "name": "Dispatcher",
        "description": "Creates and dispatches trips; manages driver-vehicle assignment.",
    },
    {
        "id": str(uuid.UUID("00000000-0000-0000-0000-000000000003")),
        "name": "Safety Officer",
        "description": "Reviews safety scores, maintenance records, and driver compliance.",
    },
    {
        "id": str(uuid.UUID("00000000-0000-0000-0000-000000000004")),
        "name": "Financial Analyst",
        "description": "Read-only access to fuel logs, expenses, and cost reports.",
    },
    {
        "id": str(uuid.UUID("00000000-0000-0000-0000-000000000005")),
        "name": "Admin",
        "description": "Super-user: manages users, roles, and all platform settings.",
    },
]


def upgrade() -> None:
    # ------------------------------------------------------------------
    # roles — created FIRST because users.user_roles FK references it
    # ------------------------------------------------------------------
    op.create_table(
        "roles",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("name", sa.String(40), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
    )
    op.create_index("uq_roles_name", "roles", ["name"], unique=True)

    # ------------------------------------------------------------------
    # users (SRS §7.4.1)
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_login_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("uq_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_email", "users", ["email"])

    # ------------------------------------------------------------------
    # user_roles junction (SRS §7.4.2)
    # Composite PK (user_id, role_id); granted_by is self-referential.
    # ondelete=CASCADE on user_id — if user deleted, memberships go too.
    # ondelete=RESTRICT on role_id — can't delete a role while assigned.
    # ------------------------------------------------------------------
    op.create_table(
        "user_roles",
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "role_id",
            sa.String(36),
            sa.ForeignKey("roles.id", ondelete="RESTRICT"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "granted_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "granted_by",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # ------------------------------------------------------------------
    # Seed the 5 canonical roles
    # ------------------------------------------------------------------
    roles_table = sa.table(
        "roles",
        sa.column("id", sa.String),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
    )
    op.bulk_insert(roles_table, SEED_ROLES)


def downgrade() -> None:
    op.drop_table("user_roles")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("uq_users_email", table_name="users")
    op.drop_table("users")
    op.drop_index("uq_roles_name", table_name="roles")
    op.drop_table("roles")
