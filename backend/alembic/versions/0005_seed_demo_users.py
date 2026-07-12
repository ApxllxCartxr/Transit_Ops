"""seed demo users

Revision ID: 0005_seed_demo_users
Revises: 0004_seed_admin
Create Date: 2026-07-12
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "0005_seed_demo_users"
down_revision: str | None = "0004_seed_admin"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None

# bcrypt hash for password: "TransitOps@2026!"
_PASSWORD_HASH = "$2b$12$iAoPwRf3UWkLVDwM5Qz4wOELYDDO8JO3eWExKaU.HH2vvqN28DXIu"

DEMO_USERS = [
    {
        "id": "20000000-0000-0000-0000-000000000001",
        "email": "fleet@transitops.dev",
        "full_name": "TransitOps Fleet Manager",
        "role_id": "00000000-0000-0000-0000-000000000001" # Fleet Manager
    },
    {
        "id": "20000000-0000-0000-0000-000000000002",
        "email": "dispatch@transitops.dev",
        "full_name": "TransitOps Dispatcher",
        "role_id": "00000000-0000-0000-0000-000000000002" # Dispatcher
    },
    {
        "id": "20000000-0000-0000-0000-000000000003",
        "email": "safety@transitops.dev",
        "full_name": "TransitOps Safety Officer",
        "role_id": "00000000-0000-0000-0000-000000000003" # Safety Officer
    },
    {
        "id": "20000000-0000-0000-0000-000000000004",
        "email": "finance@transitops.dev",
        "full_name": "TransitOps Financial Analyst",
        "role_id": "00000000-0000-0000-0000-000000000004" # Financial Analyst
    }
]

def upgrade() -> None:
    for user in DEMO_USERS:
        op.execute(
            sa.text(
                "INSERT INTO users (id, email, password_hash, full_name, is_active) "
                "VALUES (:id, :email, :pw, :name, true) "
                "ON CONFLICT (email) DO NOTHING"
            ).bindparams(
                id=user["id"],
                email=user["email"],
                pw=_PASSWORD_HASH,
                name=user["full_name"]
            )
        )
        op.execute(
            sa.text(
                "INSERT INTO user_roles (user_id, role_id) "
                "VALUES (:uid, :rid) "
                "ON CONFLICT DO NOTHING"
            ).bindparams(
                uid=user["id"],
                rid=user["role_id"]
            )
        )

def downgrade() -> None:
    for user in DEMO_USERS:
        op.execute(
            sa.text("DELETE FROM user_roles WHERE user_id = :uid").bindparams(uid=user["id"])
        )
        op.execute(
            sa.text("DELETE FROM users WHERE id = :uid").bindparams(uid=user["id"])
        )
