"""
tests/test_rbac.py

Integration tests for Role-Based Access Control (RBAC) across all backend routers.

Uses session-scoped tokens from conftest.py.  Each test creates its own
httpx.AsyncClient so cookie / connection state never bleeds between tests.

Tests verify (per SRS §8.2 / §11 SEC-03):
  ✓ Authenticated user WITH an allowed role  → 2xx or 4xx (not 401/403)
  ✓ Authenticated user WITHOUT allowed role  → 403 Forbidden
  ✓ Unauthenticated request                 → 401 Unauthorized

Role matrix applied:
  /vehicles  POST          Fleet Manager, Admin
  /drivers   POST          Safety Officer, Admin
  /maintenance/open POST   Fleet Manager, Admin
  /costs/{id} GET          Financial Analyst, Fleet Manager, Admin
  /dashboard/kpis GET      All authenticated roles
"""

from __future__ import annotations

import pytest
import httpx

from app.main import app

BASE = "http://test"


# ---------------------------------------------------------------------------
# Per-test async client helper (no shared state)
# ---------------------------------------------------------------------------
def _make_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url=BASE,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/vehicles
# Allowed: Admin, Fleet Manager
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "role,expected_status",
    [
        # Allowed roles — auth passes, body is invalid → 422 Unprocessable Entity
        ("Admin",            422),
        ("Fleet Manager",    422),
        # Forbidden roles → 403
        ("Dispatcher",       403),
        ("Safety Officer",   403),
        ("Financial Analyst", 403),
    ],
)
@pytest.mark.asyncio
async def test_rbac_create_vehicle(tokens, role, expected_status) -> None:
    async with _make_client() as client:
        res = await client.post(
            "/api/v1/vehicles",
            json={},
            headers={"Authorization": f"Bearer {tokens[role]}"},
        )
    assert res.status_code == expected_status, (
        f"role={role}: expected {expected_status}, got {res.status_code} — {res.text}"
    )


@pytest.mark.asyncio
async def test_rbac_create_vehicle_unauthenticated() -> None:
    async with _make_client() as client:
        res = await client.post("/api/v1/vehicles", json={})
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/drivers
# Allowed: Admin, Safety Officer
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "role,expected_status",
    [
        ("Admin",            422),
        ("Safety Officer",   422),
        ("Fleet Manager",    403),
        ("Dispatcher",       403),
        ("Financial Analyst", 403),
    ],
)
@pytest.mark.asyncio
async def test_rbac_create_driver(tokens, role, expected_status) -> None:
    async with _make_client() as client:
        res = await client.post(
            "/api/v1/drivers",
            json={},
            headers={"Authorization": f"Bearer {tokens[role]}"},
        )
    assert res.status_code == expected_status, (
        f"role={role}: expected {expected_status}, got {res.status_code} — {res.text}"
    )


@pytest.mark.asyncio
async def test_rbac_create_driver_unauthenticated() -> None:
    async with _make_client() as client:
        res = await client.post("/api/v1/drivers", json={})
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/maintenance/open
# Allowed: Admin, Fleet Manager
# The endpoint is a stub (service raises or returns a value for any vehicle_id),
# so allowed roles get either 200 or 422/404 — but NOT 403.
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "role,forbidden",
    [
        ("Admin",            False),
        ("Fleet Manager",    False),
        ("Dispatcher",       True),
        ("Safety Officer",   True),
        ("Financial Analyst", True),
    ],
)
@pytest.mark.asyncio
async def test_rbac_open_maintenance(tokens, role, forbidden) -> None:
    async with _make_client() as client:
        res = await client.post(
            "/api/v1/maintenance/open",
            # Use a unique vehicle_id per role so the in-memory stub service
            # doesn't raise "already has an open maintenance record" on re-runs.
            params={"vehicle_id": f"stub-{role.replace(' ', '-')}"},
            headers={"Authorization": f"Bearer {tokens[role]}"},
        )
    if forbidden:
        assert res.status_code == 403, (
            f"role={role}: expected 403, got {res.status_code} — {res.text}"
        )
    else:
        # The stub service may raise a ValueError or return a non-serializable
        # dataclass — any status other than 401/403 proves auth+RBAC passed.
        assert res.status_code not in (401, 403), (
            f"role={role}: should not be auth-blocked, got {res.status_code} — {res.text}"
        )


# ---------------------------------------------------------------------------
# GET /api/v1/costs/{id}
# Allowed: Admin, Financial Analyst, Fleet Manager
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "role,expected_status",
    [
        ("Admin",            200),
        ("Financial Analyst", 200),
        ("Fleet Manager",    200),
        ("Dispatcher",       403),
        ("Safety Officer",   403),
    ],
)
@pytest.mark.asyncio
async def test_rbac_get_costs(tokens, role, expected_status) -> None:
    async with _make_client() as client:
        res = await client.get(
            "/api/v1/costs/fake-vehicle-id",
            headers={"Authorization": f"Bearer {tokens[role]}"},
        )
    assert res.status_code == expected_status, (
        f"role={role}: expected {expected_status}, got {res.status_code} — {res.text}"
    )


@pytest.mark.asyncio
async def test_rbac_get_costs_unauthenticated() -> None:
    async with _make_client() as client:
        res = await client.get("/api/v1/costs/fake-vehicle-id")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/dashboard/kpis
# Allowed: All authenticated roles
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "role",
    ["Admin", "Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"],
)
@pytest.mark.asyncio
async def test_rbac_dashboard_kpis(tokens, role) -> None:
    async with _make_client() as client:
        res = await client.get(
            "/api/v1/dashboard/kpis",
            headers={"Authorization": f"Bearer {tokens[role]}"},
        )
    assert res.status_code == 200, (
        f"role={role}: expected 200, got {res.status_code} — {res.text}"
    )
    assert "fleet_utilization" in res.json()


@pytest.mark.asyncio
async def test_rbac_dashboard_kpis_unauthenticated() -> None:
    async with _make_client() as client:
        res = await client.get("/api/v1/dashboard/kpis")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/vehicles  (list — all authenticated roles allowed)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "role",
    ["Admin", "Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"],
)
@pytest.mark.asyncio
async def test_rbac_list_vehicles(tokens, role) -> None:
    async with _make_client() as client:
        res = await client.get(
            "/api/v1/vehicles",
            headers={"Authorization": f"Bearer {tokens[role]}"},
        )
    assert res.status_code == 200, (
        f"role={role}: expected 200, got {res.status_code} — {res.text}"
    )


@pytest.mark.asyncio
async def test_rbac_list_vehicles_unauthenticated() -> None:
    async with _make_client() as client:
        res = await client.get("/api/v1/vehicles")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /api/v1/vehicles/{id}  (Admin only)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "role,expected_status",
    [
        ("Admin",            404),   # 404 because vehicle doesn't exist (auth passed)
        ("Fleet Manager",    403),
        ("Dispatcher",       403),
        ("Safety Officer",   403),
        ("Financial Analyst", 403),
    ],
)
@pytest.mark.asyncio
async def test_rbac_delete_vehicle(tokens, role, expected_status) -> None:
    async with _make_client() as client:
        res = await client.delete(
            "/api/v1/vehicles/non-existent-id",
            headers={"Authorization": f"Bearer {tokens[role]}"},
        )
    assert res.status_code == expected_status, (
        f"role={role}: expected {expected_status}, got {res.status_code} — {res.text}"
    )
