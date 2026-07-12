"""seed default admin user

Revision ID: 0004_seed_admin
Revises: 0003_triggers
Create Date: 2026-07-12

Seeds a single Admin user so the system is immediately usable after
`alembic upgrade head` without a separate script.

Credentials:
    email:    admin@transitops.dev
    password: TransitOps@2026!

IMPORTANT: Change the password immediately in production via the
           /api/v1/auth/change-password endpoint (not yet implemented)
           or directly in the DB.

The password hash below was generated with:
    import bcrypt
    bcrypt.hashpw(b"TransitOps@2026!", bcrypt.gensalt(rounds=12)).decode()

Downgrade removes the seed user (but NOT the roles — 0001 owns them).
"""

from __future__ import annotations

import uuid
from alembic import op
import sqlalchemy as sa

# ---------------------------------------------------------------------------
# Revision identifiers
# ---------------------------------------------------------------------------
revision: str = "0004_seed_admin"
down_revision: str | None = "0003_triggers"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

# Fixed UUIDs so the migration is fully idempotent across different DB resets
_ADMIN_USER_ID = "10000000-0000-0000-0000-000000000001"
_ADMIN_ROLE_ID = "00000000-0000-0000-0000-000000000005"   # seeded in 0001

# bcrypt hash of "TransitOps@2026!" at cost factor 12
# Regenerate if you change the default password.
_PASSWORD_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGuf./8NX5wePNy/2bNiGHTrQv6"


def upgrade() -> None:
    users_table = sa.table(
        "users",
        sa.column("id", sa.String),
        sa.column("email", sa.String),
        sa.column("password_hash", sa.String),
        sa.column("full_name", sa.String),
        sa.column("is_active", sa.Boolean),
    )
    user_roles_table = sa.table(
        "user_roles",
        sa.column("user_id", sa.String),
        sa.column("role_id", sa.String),
    )

    # INSERT ... WHERE NOT EXISTS (idempotent)
    op.execute(
        sa.text(
            "INSERT INTO users (id, email, password_hash, full_name, is_active) "
            "VALUES (:id, :email, :pw, :name, true) "
            "ON CONFLICT (email) DO NOTHING"
        ).bindparams(
            id=_ADMIN_USER_ID,
            email="admin@transitops.dev",
            pw=_PASSWORD_HASH,
            name="TransitOps Admin",
        )
    )

    op.execute(
        sa.text(
            "INSERT INTO user_roles (user_id, role_id) "
            "VALUES (:uid, :rid) "
            "ON CONFLICT DO NOTHING"
        ).bindparams(uid=_ADMIN_USER_ID, rid=_ADMIN_ROLE_ID)
    )


def downgrade() -> None:
    op.execute(
        sa.text("DELETE FROM user_roles WHERE user_id = :uid").bindparams(
            uid=_ADMIN_USER_ID
        )
    )
    op.execute(
        sa.text("DELETE FROM users WHERE id = :uid").bindparams(uid=_ADMIN_USER_ID)
    )
