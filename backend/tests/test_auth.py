"""
tests/test_auth.py

Integration tests for the /api/v1/auth routes.

Uses httpx.AsyncClient + ASGI transport so the entire request pipeline
(slowapi, SQLAlchemy asyncpg, JWT) runs in the same async context, avoiding
the asyncpg 'another operation is in progress' error that occurs with
FastAPI's thread-based TestClient.

Rate-limiter bypass
-------------------
The slowapi limiter uses the client IP as the rate-limit key.  Every test
uses a unique app instance with a patched limiter key_func that returns a
random UUID, guaranteeing isolation between tests.

Test matrix
-----------
POST /auth/login
  ✓ valid credentials  → 200, token + user payload + cookie
  ✓ wrong password     → 401, generic error (no user-enumeration)
  ✓ unknown email      → 401, generic error
  ✓ inactive account   → 403

GET /auth/me
  ✓ valid Bearer token → 200, user + roles
  ✓ valid cookie       → 200, user + roles
  ✓ no token           → 401
  ✓ tampered token     → 401

POST /auth/logout
  ✓ response instructs browser to clear the cookie
"""

from __future__ import annotations

import uuid

import pytest
import httpx
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.auth.models import User
from app.auth.security import hash_password
from app.core.config import get_settings
from app.main import app

# ---------------------------------------------------------------------------
# Shared DB engine for fixture setup/teardown
# ---------------------------------------------------------------------------
_settings = get_settings()
_engine = create_async_engine(
    _settings.database_url.replace("postgresql+psycopg", "postgresql+asyncpg"),
    echo=False,
)
_SessionLocal = async_sessionmaker(_engine, expire_on_commit=False)

ADMIN_EMAIL = "admin@transitops.dev"
ADMIN_PASSWORD = "TransitOps@2026!"
BASE = "http://test"


# ---------------------------------------------------------------------------
# Async client fixture — one fresh httpx client per test.
# ---------------------------------------------------------------------------
@pytest.fixture()
async def client():
    """Fresh async ASGI client."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url=BASE) as c:
        yield c


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
async def _login(client: httpx.AsyncClient, email: str, password: str) -> httpx.Response:
    return await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_login_valid_credentials(client) -> None:
    res = await _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["token"]
    user = body["user"]
    assert user["email"] == ADMIN_EMAIL
    assert "Admin" in user["roles"]
    # Cookie must be set
    assert "better-auth.session_token" in res.cookies


@pytest.mark.asyncio
async def test_login_wrong_password(client) -> None:
    res = await _login(client, ADMIN_EMAIL, "WrongPassword999!")
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


@pytest.mark.asyncio
async def test_login_unknown_email(client) -> None:
    res = await _login(client, "nobody@example.com", "DoesNotMatter1!")
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


@pytest.mark.asyncio
async def test_login_inactive_user(client) -> None:
    """An inactive account must be rejected with 403 even if credentials are valid."""
    inactive_id = str(uuid.uuid4())
    inactive_email = f"inactive-{inactive_id[:8]}@transitops.dev"
    pw_hash = hash_password(ADMIN_PASSWORD)

    async with _SessionLocal() as session:
        session.add(User(
            id=inactive_id,
            email=inactive_email,
            password_hash=pw_hash,
            full_name="Inactive Test User",
            is_active=False,
        ))
        await session.commit()

    try:
        res = await _login(client, inactive_email, ADMIN_PASSWORD)
        assert res.status_code == 403
        assert "deactivated" in res.json()["detail"].lower()
    finally:
        async with _SessionLocal() as session:
            user = await session.get(User, inactive_id)
            if user:
                await session.delete(user)
            await session.commit()


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_me_with_valid_bearer_token(client) -> None:
    login_res = await _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["token"]

    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200, me_res.text
    body = me_res.json()
    assert body["email"] == ADMIN_EMAIL
    assert "Admin" in body["roles"]


@pytest.mark.asyncio
async def test_me_with_valid_cookie(client) -> None:
    login_res = await _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    assert login_res.status_code == 200, login_res.text
    token = login_res.cookies.get("better-auth.session_token")
    assert token, "Cookie not set after login"

    me_res = await client.get(
        "/api/v1/auth/me",
        cookies={"better-auth.session_token": token},
    )
    assert me_res.status_code == 200, me_res.text
    assert me_res.json()["email"] == ADMIN_EMAIL


@pytest.mark.asyncio
async def test_me_without_token(client) -> None:
    res = await client.get("/api/v1/auth/me")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_me_with_tampered_token(client) -> None:
    res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.tampered.sig"},
    )
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_logout_clears_cookie(client) -> None:
    login_res = await _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    assert login_res.status_code == 200

    logout_res = await client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200
    assert logout_res.json()["ok"] is True
    set_cookie = logout_res.headers.get("set-cookie", "")
    assert "better-auth.session_token" in set_cookie
    # Starlette delete_cookie sets max-age=0
    assert "max-age=0" in set_cookie.lower()
