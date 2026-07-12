"""
app/auth/router.py

POST /auth/login  — verify credentials (bcrypt, cost 12), issue JWT
POST /auth/logout — clear cookie
GET  /auth/me     — return the current user's profile + roles

Rate-limit: 5 attempts / 15 min / IP  (SEC-07)
"""

from __future__ import annotations

from datetime import datetime, timezone

import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user
from app.auth.models import User, Role
from app.auth.schemas import AuthResponse, AuthUser, LoginRequest, LogoutResponse, RegisterRequest
from app.auth.security import create_access_token, verify_password, hash_password
from app.core.config import get_settings
from app.core.db import get_db

# ---------------------------------------------------------------------------
# Rate-limiter (SEC-07: 5 attempts / 15 min / IP)
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)

_settings = get_settings()

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Log in with email + password",
)
@limiter.limit("5/15minute")
async def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """
    Authenticates the user against the *users* table using bcrypt (cost 12).
    Issues a signed JWT and writes it to an HttpOnly cookie so both the
    BetterAuth frontend client and raw API callers work.

    Rate-limited to 5 requests per 15 minutes per IP (SEC-07).
    Intentionally identical error for wrong email and wrong password to
    prevent user-enumeration.
    """
    # Fetch user + roles eagerly in one query (selectinload avoids a second
    # round-trip and prevents 'another operation in progress' on asyncpg when
    # we later commit the last_login_at update).
    result = await db.execute(
        select(User)
        .where(User.email == payload.email)
        .options(selectinload(User.roles))
    )
    user: User | None = result.scalars().first()

    # Always run verify_password even on a missing user to prevent timing attacks
    dummy_hash = "$2b$12$invalidhashthatshouldneververify000000000000000000000000"
    stored_hash = user.password_hash if user else dummy_hash
    password_ok = verify_password(payload.password, stored_hash)

    if user is None or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    # Collect role names from the already-loaded relationship
    role_names: list[str] = [r.name for r in user.roles]

    # Mint JWT
    token = create_access_token(
        user_id=user.id,
        email=user.email,
        roles=role_names,
    )

    # Stamp last_login_at in a dedicated session so it never conflicts with
    # the query/selectin transaction that is still open on `db`.
    from app.core.db import AsyncSessionLocal  # local import avoids circular
    try:
        async with AsyncSessionLocal() as stamp_session:
            await stamp_session.execute(
                update(User)
                .where(User.id == user.id)
                .values(last_login_at=datetime.now(tz=timezone.utc))
            )
            await stamp_session.commit()
    except Exception:
        pass  # best-effort — do not fail the login on a bookkeeping error

    # Write cookie — HttpOnly, Lax, 24 h
    response.set_cookie(
        key="better-auth.session_token",
        value=token,
        httponly=True,
        max_age=_settings.access_token_expire_minutes * 60,
        samesite="lax",
        secure=_settings.app_env == "production",
    )

    return AuthResponse(
        user=AuthUser(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            roles=role_names,
        ),
        token=token,
    )


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=AuthResponse,
    summary="Register a new user account",
)
async def register(
    request: Request,
    response: Response,
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """
    Registers a new user account with bcrypt hash password.
    Assigns the default role 'Fleet Manager'.
    Issues a signed JWT and writes it to an HttpOnly cookie (auto-login).
    """
    # 1. Check if user already exists
    existing_res = await db.execute(
        select(User).where(User.email == payload.email)
    )
    if existing_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # 2. Get default role "Fleet Manager"
    role_res = await db.execute(
        select(Role).where(Role.name == "Fleet Manager")
    )
    role = role_res.scalars().first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Default authorization role not found.",
        )

    # 3. Create user
    user_id = str(uuid.uuid4())
    new_user = User(
        id=user_id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.name,
        is_active=True,
    )
    new_user.roles.append(role)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    role_names = [role.name]

    # 4. Mint JWT
    token = create_access_token(
        user_id=new_user.id,
        email=new_user.email,
        roles=role_names,
    )

    # 5. Write cookie — HttpOnly, Lax, 24 h
    response.set_cookie(
        key="better-auth.session_token",
        value=token,
        httponly=True,
        max_age=_settings.access_token_expire_minutes * 60,
        samesite="lax",
        secure=_settings.app_env == "production",
    )

    return AuthResponse(
        user=AuthUser(
            id=new_user.id,
            email=new_user.email,
            full_name=new_user.full_name,
            roles=role_names,
        ),
        token=token,
    )


# ---------------------------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------------------------

@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Log out the current session",
)
async def logout(response: Response) -> LogoutResponse:
    """Clear the session cookie."""
    response.delete_cookie(
        key="better-auth.session_token",
        httponly=True,
        samesite="lax",
    )
    return LogoutResponse(ok=True)


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=AuthUser,
    summary="Get the current authenticated user",
)
async def me(user: User = Depends(get_current_user)) -> AuthUser:
    """
    Returns the authenticated user's profile and role list.
    Roles are loaded from the *roles* table via the *user_roles* junction.
    """
    return AuthUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        roles=[r.name for r in user.roles],
    )
