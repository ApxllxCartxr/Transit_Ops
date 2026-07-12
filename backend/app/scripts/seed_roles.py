"""
seed_roles.py — Idempotent seeder for the 5 canonical TransitOps roles.

Run with:
    python -m app.scripts.seed_roles

The migration (0001_users_roles) already bulk-inserts these on first `alembic upgrade head`.
This script exists as a standalone fallback for dev resets and CI pipelines.
"""

from __future__ import annotations

import asyncio
import uuid

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.db import AsyncSessionLocal


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


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        for role in SEED_ROLES:
            # INSERT ... ON CONFLICT (name) DO NOTHING — fully idempotent
            stmt = (
                pg_insert(text("roles"))
                .values(**role)
                .on_conflict_do_nothing(index_elements=["name"])
            )
            await session.execute(
                text(
                    "INSERT INTO roles (id, name, description) "
                    "VALUES (:id, :name, :description) "
                    "ON CONFLICT (name) DO NOTHING"
                ),
                role,
            )
        await session.commit()
        print(f"✓ Seeded {len(SEED_ROLES)} roles (existing rows skipped).")


if __name__ == "__main__":
    asyncio.run(seed())
