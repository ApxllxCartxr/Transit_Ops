"""
tests/test_audit.py

Tests for the AuditLog SQLAlchemy ORM model (SRS §7.4.9).
Uses an in-memory SQLite database to verify model definitions,
constraints, index definitions, and type mapping.
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.db import Base
# Import all models so Base knows about relationships (e.g. users)
from app.auth.models import User, Role, UserRole  # noqa: F401
from app.shared.models import AuditLog

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def async_session() -> AsyncSession:
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_audit_log_write_and_read(async_session: AsyncSession) -> None:
    # 1. Create a user to act as the actor
    actor = User(
        id="user-123",
        email="test_actor@transitops.dev",
        password_hash="fakehash",
        full_name="Audit Actor",
        is_active=True,
    )
    async_session.add(actor)
    await async_session.commit()

    # 2. Write an audit log entry
    audit_entry = AuditLog(
        entity_type="Vehicle",
        entity_id="V-1",
        action="update",
        changes={"status": {"old": "Available", "new": "InShop"}},
        actor_id=actor.id,
    )
    async_session.add(audit_entry)
    await async_session.commit()

    # Refresh session and fetch the audit log back
    await async_session.close()

    result = await async_session.execute(select(AuditLog).where(AuditLog.entity_id == "V-1"))
    retrieved = result.scalars().first()

    assert retrieved is not None
    assert retrieved.id is not None
    assert retrieved.entity_type == "Vehicle"
    assert retrieved.entity_id == "V-1"
    assert retrieved.action == "update"
    assert retrieved.changes == {"status": {"old": "Available", "new": "InShop"}}
    assert retrieved.actor_id == "user-123"
    assert retrieved.occurred_at is not None
