"""
tests/test_audit.py

Tests for the Audit Log wiring across backend routers:
- Auth events (login, logout)
- Role grants (PUT /auth/users/{user_id}/roles)
- Safety-score changes (PATCH /drivers/{driver_id})
"""

from __future__ import annotations

import asyncio
import pytest
import httpx
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.auth.models import User, Role
from app.core.db import AsyncSessionLocal
from app.shared.models import AuditLog
from app.core.audit import record_audit_event
from app.main import app

BASE = "http://test"


# ---------------------------------------------------------------------------
# Per-test async client helper
# ---------------------------------------------------------------------------
def _make_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=BASE,
    )


@pytest.mark.asyncio
async def test_record_audit_event_direct() -> None:
    """Test calling the helper directly writes to the actual database."""
    # Write audit log entry
    record_audit_event(
        entity_type="TestEntity",
        entity_id="test-id-123",
        action="test_action",
        changes={"foo": "bar"},
        actor_id=None,
    )

    # Let the background task execute and write to the DB
    await asyncio.sleep(0.1)

    # Query it back using a clean session
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(AuditLog)
            .where(AuditLog.entity_type == "TestEntity")
            .where(AuditLog.entity_id == "test-id-123")
        )
        entry = res.scalars().first()

        assert entry is not None
        assert entry.action == "test_action"
        assert entry.changes == {"foo": "bar"}

        # Cleanup
        await session.delete(entry)
        await session.commit()


@pytest.mark.asyncio
async def test_audit_login_success_and_logout(tokens) -> None:
    """Test that a successful login and logout write audit events."""
    # Login event was already triggered when the `tokens` fixture ran.
    # Let's verify a login_success audit log exists for the Admin user.
    await asyncio.sleep(0.1)

    async with AsyncSessionLocal() as session:
        # Get admin user ID
        admin_res = await session.execute(select(User).where(User.email == "admin@transitops.dev"))
        admin_user = admin_res.scalars().first()
        assert admin_user is not None

        # Query login success log
        res = await session.execute(
            select(AuditLog)
            .where(AuditLog.entity_type == "User")
            .where(AuditLog.entity_id == admin_user.id)
            .where(AuditLog.action == "login_success")
        )
        log = res.scalars().first()
        assert log is not None
        assert log.actor_id == admin_user.id

    # Test logout event logging
    async with _make_client() as client:
        res = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {tokens['Admin']}"},
        )
        assert res.status_code == 200

    await asyncio.sleep(0.1)

    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(AuditLog)
            .where(AuditLog.entity_type == "User")
            .where(AuditLog.entity_id == admin_user.id)
            .where(AuditLog.action == "logout")
        )
        log = res.scalars().first()
        assert log is not None
        assert log.actor_id == admin_user.id


@pytest.mark.asyncio
async def test_audit_login_failure() -> None:
    """Test that a failed login writes a login_failure audit event."""
    async with _make_client() as client:
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "non-existent-user@transitops.dev", "password": "wrong-password"},
        )
        assert res.status_code == 401

    await asyncio.sleep(0.1)

    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(AuditLog)
            .where(AuditLog.entity_type == "User")
            .where(AuditLog.entity_id == "non-existent-user@transitops.dev")
            .where(AuditLog.action == "login_failure")
        )
        log = res.scalars().first()
        assert log is not None
        assert log.changes == {"email": "non-existent-user@transitops.dev"}

        # Cleanup
        await session.delete(log)
        await session.commit()


@pytest.mark.asyncio
async def test_audit_role_grant(tokens) -> None:
    """Test updating user roles and verifying the role grant audit log."""
    # Find a user to grant a role to (e.g. the Dispatcher user)
    async with AsyncSessionLocal() as session:
        disp_res = await session.execute(select(User).where(User.email == "dispatch@transitops.dev"))
        dispatcher_user = disp_res.scalars().first()
        assert dispatcher_user is not None
        target_id = dispatcher_user.id

        admin_res = await session.execute(select(User).where(User.email == "admin@transitops.dev"))
        admin_user = admin_res.scalars().first()
        assert admin_user is not None

    async with _make_client() as client:
        # Perform role update (Admin only)
        res = await client.put(
            f"/api/v1/auth/users/{target_id}/roles",
            json={"roles": ["Dispatcher", "Fleet Manager"]},
            headers={"Authorization": f"Bearer {tokens['Admin']}"},
        )
        assert res.status_code == 200

    await asyncio.sleep(0.1)

    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(AuditLog)
            .where(AuditLog.entity_type == "User")
            .where(AuditLog.entity_id == target_id)
            .where(AuditLog.action == "update_roles")
        )
        log = res.scalars().first()
        assert log is not None
        assert "Dispatcher" in log.changes["roles"]["old"]
        assert "Fleet Manager" in log.changes["roles"]["new"]
        assert log.actor_id == admin_user.id

        # Restoring Dispatcher's original role only (cleanup)
        role_result = await session.execute(select(Role).where(Role.name == "Dispatcher"))
        disp_role = role_result.scalars().first()
        user_result = await session.execute(
            select(User).where(User.id == target_id).options(selectinload(User.roles))
        )
        user = user_result.scalars().first()
        user.roles = [disp_role]

        await session.delete(log)
        await session.commit()


@pytest.mark.asyncio
async def test_audit_safety_score_change(tokens) -> None:
    """Test updating driver safety score and verifying the audit log entry."""
    # 1. Create a dummy driver to modify
    async with AsyncSessionLocal() as session:
        admin_res = await session.execute(select(User).where(User.email == "admin@transitops.dev"))
        admin_user = admin_res.scalars().first()
        assert admin_user is not None

    async with _make_client() as client:
        import uuid
        lic_num = f"AUD-LIC-{uuid.uuid4().hex[:6].upper()}"
        c_res = await client.post(
            "/api/v1/drivers",
            json={
                "full_name": "Audit Test Driver",
                "license_number": lic_num,
                "license_category": "Class A",
                "license_expiry": "2030-01-01",
                "contact_number": "1234567890",
                "safety_score": 90,
                "status": "Available",
            },
            headers={"Authorization": f"Bearer {tokens['Admin']}"},
        )
        assert c_res.status_code == 201
        driver_id = c_res.json()["id"]

        # Modify the safety score
        u_res = await client.patch(
            f"/api/v1/drivers/{driver_id}",
            json={"safety_score": 85},
            headers={"Authorization": f"Bearer {tokens['Admin']}"},
        )
        assert u_res.status_code == 200

    await asyncio.sleep(0.1)

    async with AsyncSessionLocal() as session:
        # Query audit log
        res = await session.execute(
            select(AuditLog)
            .where(AuditLog.entity_type == "Driver")
            .where(AuditLog.entity_id == driver_id)
            .where(AuditLog.action == "update_safety_score")
        )
        log = res.scalars().first()
        assert log is not None
        assert log.changes == {"safety_score": {"old": 90, "new": 85}}
        assert log.actor_id == admin_user.id

        # Clean up driver and audit log
        from app.modules.drivers.models import Driver
        await session.delete(log)
        driver_res = await session.execute(select(Driver).where(Driver.id == driver_id))
        driver = driver_res.scalars().first()
        if driver:
            await session.delete(driver)
        await session.commit()
