"""rehash seeded user passwords (bcrypt 5.x compat)

Revision ID: 0006_rehash_seeded_passwords
Revises: 0005_seed_demo_users
Create Date: 2026-07-12

The hashes stored by 0004_seed_admin and 0005_seed_demo_users were generated
with an older bcrypt version.  bcrypt ≥5.0 raises ValueError('Invalid salt')
on those hashes, which causes verify_password() to always return False and
blocks every login.

This migration re-hashes the known plaintext password ("TransitOps@2026!")
with the currently installed bcrypt library (cost=12) and writes the new hash
for every seeded account in-place (ON CONFLICT / UPDATE).

All seeded accounts share the same default password.  Users should rotate
their own password after first login.

Re-generation command used:
    python -c "import bcrypt; print(bcrypt.hashpw(b'TransitOps@2026!', bcrypt.gensalt(12)).decode())"
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "0006_rehash_seeded_passwords"
down_revision: str | None = "0005_seed_demo_users"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None

# ---------------------------------------------------------------------------
# Hash generated with bcrypt 5.0.0, cost=12, for password "TransitOps@2026!"
# Verified with bcrypt.checkpw() in the same environment before committing.
# ---------------------------------------------------------------------------
_PW_HASH = "$2b$12$7srzSjhk229tHKmEBKhXxuP.m9j30RSW7/Js5uLqn9MxYPCMl5Ga6"

# All seeded user IDs (0004 + 0005)
_SEEDED_IDS = [
    "10000000-0000-0000-0000-000000000001",  # admin@transitops.dev
    "20000000-0000-0000-0000-000000000001",  # fleet@transitops.dev
    "20000000-0000-0000-0000-000000000002",  # dispatch@transitops.dev
    "20000000-0000-0000-0000-000000000003",  # safety@transitops.dev
    "20000000-0000-0000-0000-000000000004",  # finance@transitops.dev
]


def upgrade() -> None:
    for uid in _SEEDED_IDS:
        op.execute(
            sa.text(
                "UPDATE users SET password_hash = :pw WHERE id = :uid"
            ).bindparams(pw=_PW_HASH, uid=uid)
        )


def downgrade() -> None:
    # The old hashes are broken — we cannot restore them meaningfully.
    # Downgrade is a no-op; rolling back this migration is safe because the
    # updated hashes are still valid bcrypt hashes for the same password.
    pass
