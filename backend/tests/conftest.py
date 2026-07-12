"""
tests/conftest.py

Shared pytest configuration and fixtures for all integration tests.

Key design decisions:
- All fixtures that touch asyncpg/SQLAlchemy are session-scoped so they run in
  the SAME event loop as the tests (asyncio_default_test_loop_scope = "session").
  Module-scoped async fixtures can run in a DIFFERENT loop than session-scoped
  tests, causing asyncpg "Future attached to a different loop" RuntimeErrors.
- The rate-limiter is disabled globally for the entire test session so no test
  is affected by the 5/15-min login cap.
- Tokens are obtained once per session and reused — each request within a test
  still creates its own httpx.AsyncClient to avoid cookie/state bleed.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.auth.router import limiter  # noqa: E402  (after sys.path setup)
from app.main import app  # noqa: E402

BASE = "http://test"

# Seeded users (migrations 0004 + 0005 + 0006)
SEEDED_USERS: dict[str, tuple[str, str]] = {
    "Admin":             ("admin@transitops.dev",    "TransitOps@2026!"),
    "Fleet Manager":     ("fleet@transitops.dev",    "TransitOps@2026!"),
    "Dispatcher":        ("dispatch@transitops.dev", "TransitOps@2026!"),
    "Safety Officer":    ("safety@transitops.dev",   "TransitOps@2026!"),
    "Financial Analyst": ("finance@transitops.dev",  "TransitOps@2026!"),
}


# ---------------------------------------------------------------------------
# Disable rate-limiting for the entire test session.
# autouse=True means every test in every file benefits without opt-in.
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True, scope="session")
def disable_rate_limiter_session():
    """Turn off slowapi for the whole test session."""
    limiter.enabled = False
    yield
    limiter.enabled = True


# ---------------------------------------------------------------------------
# Session-scoped Bearer tokens for all seeded users.
# scope="session" guarantees this fixture runs in the SAME asyncio event loop
# as the tests (asyncio_default_test_loop_scope = "session").
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
async def tokens() -> dict[str, str]:
    """Log in all seeded users and return {role: bearer_token}."""
    transport = httpx.ASGITransport(app=app)
    user_tokens: dict[str, str] = {}
    async with httpx.AsyncClient(transport=transport, base_url=BASE) as client:
        for role, (email, pw) in SEEDED_USERS.items():
            res = await client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": pw},
            )
            assert res.status_code == 200, (
                f"Login failed for {role} ({email}): {res.text}"
            )
            user_tokens[role] = res.json()["token"]
            # Brief pause so asyncpg can fully return each connection to the pool
            await asyncio.sleep(0.05)
    return user_tokens
