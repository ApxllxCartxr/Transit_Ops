"""
app/auth/dependencies.py

FastAPI dependencies for authentication and RBAC.

get_current_user:
    Reads the JWT from either:
      1. Cookie:  better-auth.session_token
      2. Header:  Authorization: Bearer <jwt>
    Decodes and verifies it with python-jose, then fetches the User row
    (with roles selectin-loaded) from the DB.

require_roles(*roles):
    Returns a dependency that asserts the current user holds at least one
    of the named roles.  Raises HTTP 403 otherwise.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.auth.models import User
from app.auth.security import decode_access_token


# ---------------------------------------------------------------------------
# get_current_user
# ---------------------------------------------------------------------------

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract the JWT from cookie or Authorization header, verify it, and
    return the corresponding User ORM object (roles loaded via selectin).
    """
    token: str | None = request.cookies.get("better-auth.session_token")

    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.removeprefix("Bearer ").strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Decode JWT
    try:
        claims = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = claims.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )

    # Fetch user — roles are selectin-loaded by the ORM relationship
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return user


# ---------------------------------------------------------------------------
# require_roles — RBAC (SRS §11 SEC-03)
# ---------------------------------------------------------------------------

class _RequireRoles:
    """Dependency class that enforces role membership."""

    def __init__(self, *roles: str) -> None:
        # Normalise once at declaration time
        self._required = {r.replace(" ", "").lower() for r in roles}

    async def __call__(self, user: User = Depends(get_current_user)) -> User:
        user_roles = {r.name.replace(" ", "").lower() for r in user.roles}
        if not user_roles.intersection(self._required):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: insufficient role",
            )
        return user


def require_roles(*roles: str) -> _RequireRoles:
    """
    Convenience factory.  Usage:

        @router.get("/admin-only")
        async def admin_only(user: User = Depends(require_roles("Admin"))):
            ...
    """
    return _RequireRoles(*roles)
