"""
app/auth/security.py

Password hashing via bcrypt (cost factor 12, per FR-AUTH-02).
JWT session token issuance and verification.

Dependencies:
    bcrypt>=4.0
    python-jose[cryptography]
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

_settings = get_settings()

# ---------------------------------------------------------------------------
# bcrypt password helpers  (cost factor = 12, per FR-AUTH-02 / SEC-xx)
# ---------------------------------------------------------------------------

_BCRYPT_ROUNDS = 12


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain* with cost factor 12."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Return True iff *plain* matches the stored bcrypt *hashed* digest."""
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT session tokens
# ---------------------------------------------------------------------------

_ALGORITHM = "HS256"


def create_access_token(
    *,
    user_id: str,
    email: str,
    roles: list[str],
    expires_minutes: int | None = None,
) -> str:
    """Mint a signed JWT carrying the user's id, email, and roles."""
    expire_minutes = expires_minutes or _settings.access_token_expire_minutes
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "roles": roles,
        "iat": now,
        "exp": now + timedelta(minutes=expire_minutes),
    }
    return jwt.encode(payload, _settings.secret_key, algorithm=_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT.  Raises jose.JWTError on invalid / expired tokens.
    Returns the raw claims dict on success.
    """
    return jwt.decode(token, _settings.secret_key, algorithms=[_ALGORITHM])
