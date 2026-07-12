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

from app.auth.dependencies import get_current_user, require_roles
from app.auth.models import User, Role
from app.auth.schemas import AuthResponse, AuthUser, LoginRequest, LogoutResponse, RegisterRequest, UserRolesUpdateRequest
from app.auth.security import create_access_token, verify_password, hash_password
from app.core.config import get_settings
from app.core.db import get_db
from app.core.audit import record_audit_event

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
        record_audit_event(
            entity_type="User",
            entity_id=payload.email,
            action="login_failure",
            changes={"email": payload.email},
            actor_id=None,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        record_audit_event(
            entity_type="User",
            entity_id=user.id,
            action="login_failure_inactive",
            changes={"email": user.email},
            actor_id=user.id,
        )
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

    # Record login success
    record_audit_event(
        entity_type="User",
        entity_id=user.id,
        action="login_success",
        changes={"email": user.email},
        actor_id=user.id,
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
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
) -> LogoutResponse:
    """Clear the session cookie."""
    response.delete_cookie(
        key="better-auth.session_token",
        httponly=True,
        samesite="lax",
    )
    record_audit_event(
        entity_type="User",
        entity_id=current_user.id,
        action="logout",
        changes=None,
        actor_id=current_user.id,
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


# ---------------------------------------------------------------------------
# PUT /auth/users/{target_user_id}/roles (Admin only)
# ---------------------------------------------------------------------------

@router.put(
    "/users/{target_user_id}/roles",
    dependencies=[Depends(require_roles("Admin"))],
    summary="Update roles assigned to a user",
)
async def update_user_roles(
    target_user_id: str,
    payload: UserRolesUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_user),
):
    """
    Updates the roles assigned to a user.
    Records the role changes in the audit log (entity_type="User").
    """
    # 1. Fetch user and their current roles
    result = await db.execute(
        select(User)
        .where(User.id == target_user_id)
        .options(selectinload(User.roles))
    )
    target_user = result.scalars().first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    old_role_names = [r.name for r in target_user.roles]

    if not payload.roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one role name must be specified",
        )

    # 2. Retrieve specified roles from database
    role_result = await db.execute(select(Role).where(Role.name.in_(payload.roles)))
    new_roles = role_result.scalars().all()
    if len(new_roles) != len(payload.roles):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more specified roles are invalid",
        )

    # 3. Apply changes and commit
    target_user.roles = new_roles
    await db.commit()

    # 4. Record audit event
    new_role_names = [r.name for r in new_roles]
    record_audit_event(
        entity_type="User",
        entity_id=target_user_id,
        action="update_roles",
        changes={"roles": {"old": old_role_names, "new": new_role_names}},
        actor_id=admin_user.id,
    )

    return {"ok": True, "roles": new_role_names}
