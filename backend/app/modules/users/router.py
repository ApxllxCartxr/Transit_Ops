from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.dependencies import get_current_user, require_roles
from app.auth.models import User
from app.core.db import get_db
from app.modules.users.schemas import (
    UserCreate,
    UserListResponse,
    UserOut,
    UserUpdate,
)
from app.modules.users.service import UserService

router = APIRouter(prefix="/users", tags=["users"])


def _to_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=[r.name for r in user.roles],
        last_login_at=user.last_login_at,
        created_at=user.created_at,
    )


@router.get(
    "",
    response_model=UserListResponse,
    dependencies=[Depends(require_roles("Admin"))],
    summary="List platform members / users (Admin only)",
)
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    total, items = await service.list_users(page=page, size=size, search=search)
    return UserListResponse(
        total=total,
        page=page,
        size=size,
        items=[_to_out(u) for u in items],
    )


@router.get(
    "/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_roles("Admin"))],
    summary="Get a platform member by ID (Admin only)",
)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = UserService(db)
    user = await service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _to_out(user)


@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("Admin"))],
    summary="Create a new platform member / user (Admin only)",
)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
):
    service = UserService(db)
    # Check duplicate email
    existing_res = await db.execute(select(User).where(User.email == payload.email))
    if existing_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    user = await service.create_user(payload, actor_id=admin.id)
    return _to_out(user)


@router.patch(
    "/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_roles("Admin"))],
    summary="Update a platform member profile / roles (Admin only)",
)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
):
    service = UserService(db)
    user = await service.update_user(user_id, payload, actor_id=admin.id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _to_out(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("Admin"))],
    summary="Delete a platform member (Admin only)",
)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
):
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own admin account",
        )
    service = UserService(db)
    deleted = await service.delete_user(user_id, actor_id=admin.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
