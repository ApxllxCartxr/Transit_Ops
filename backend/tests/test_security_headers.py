"""
tests/test_security_headers.py

Verify that SecurityHeadersMiddleware injects the required headers on every
response and that CORS is restricted to the configured allowed origins.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app, raise_server_exceptions=True)


# ---------------------------------------------------------------------------
# Security headers
# ---------------------------------------------------------------------------

def test_security_headers_present_on_health() -> None:
    """Every response must carry the three static security headers."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["referrer-policy"] == "same-origin"


def test_hsts_absent_outside_production() -> None:
    """HSTS must NOT be sent in non-production (app_env != 'production')."""
    res = client.get("/health")
    assert "strict-transport-security" not in res.headers


def test_security_headers_on_404_response() -> None:
    """Headers must appear even on error responses."""
    res = client.get("/does-not-exist")
    assert res.status_code == 404
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert res.headers.get("referrer-policy") == "same-origin"


# ---------------------------------------------------------------------------
# CORS origin restriction
# ---------------------------------------------------------------------------

def test_cors_allowed_origin_receives_header() -> None:
    """A request from a configured origin must get the ACAO header back."""
    res = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_cors_disallowed_origin_gets_no_header() -> None:
    """A request from an unknown origin must NOT get the ACAO header."""
    res = client.get("/health", headers={"Origin": "https://evil.example.com"})
    assert "access-control-allow-origin" not in res.headers


def test_cors_preflight_disallowed_origin_rejected() -> None:
    """An OPTIONS preflight from an unknown origin must not grant access."""
    res = client.options(
        "/health",
        headers={
            "Origin": "https://attacker.io",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in res.headers


def test_cors_preflight_allowed_origin_accepted() -> None:
    """An OPTIONS preflight from a configured origin must return 200 with ACAO."""
    res = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"
