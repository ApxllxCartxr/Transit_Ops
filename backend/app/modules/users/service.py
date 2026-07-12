from __future__ import annotations

import uuid
from typing import Sequence
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.models import User, Role
from app.auth.security import hash_password
from app.core.audit import record_audit_event
from app.modules.users.schemas import UserCreate, UserUpdate


class UserService:
    """Business logic & database operations for platform users / members."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_users(
        self, page: int = 1, size: int = 20, search: str | None = None
    ) -> tuple[int, Sequence[User]]:
        """Return paginated users."""
        stmt = select(User).options(selectinload(User.roles))
        count_stmt = select(func.count()).select_from(User)

        if search:
            like_str = f"%{search.lower()}%"
            filter_cond = func.lower(User.email).like(like_str) | func.lower(User.full_name).like(like_str)
            stmt = stmt.where(filter_cond)
            count_stmt = count_stmt.where(filter_cond)

        total_res = await self.db.execute(count_stmt)
        total = total_res.scalar_one()

        stmt = stmt.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size)
        res = await self.db.execute(stmt)
        items = res.scalars().all()
        return total, items

    async def get_user(self, user_id: str) -> User | None:
        """Fetch a single user by ID with roles loaded."""
        stmt = select(User).where(User.id == user_id).options(selectinload(User.roles))
        res = await self.db.execute(stmt)
        return res.scalars().first()

    async def create_user(self, data: UserCreate, actor_id: str | None = None) -> User:
        """Create a new platform user account and assign roles."""
        user_id = str(uuid.uuid4())
        new_user = User(
            id=user_id,
            email=data.email,
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            is_active=data.is_active,
        )

        if data.roles:
            role_res = await self.db.execute(select(Role).where(Role.name.in_(data.roles)))
            roles = role_res.scalars().all()
            new_user.roles = list(roles)

        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)

        # Ensure relationships are loaded
        created_user = await self.get_user(user_id)

        record_audit_event(
            entity_type="User",
            entity_id=user_id,
            action="create_user",
            changes={"email": data.email, "roles": data.roles},
            actor_id=actor_id,
        )

        return created_user or new_user

    async def update_user(
        self, user_id: str, data: UserUpdate, actor_id: str | None = None
    ) -> User | None:
        """Update a platform user's profile and roles."""
        user = await self.get_user(user_id)
        if not user:
            return None

        changes = {}
        if data.full_name is not None and data.full_name != user.full_name:
            changes["full_name"] = {"old": user.full_name, "new": data.full_name}
            user.full_name = data.full_name

        if data.is_active is not None and data.is_active != user.is_active:
            changes["is_active"] = {"old": user.is_active, "new": data.is_active}
            user.is_active = data.is_active

        if data.roles is not None:
            old_roles = [r.name for r in user.roles]
            role_res = await self.db.execute(select(Role).where(Role.name.in_(data.roles)))
            new_roles = role_res.scalars().all()
            user.roles = list(new_roles)
            changes["roles"] = {"old": old_roles, "new": [r.name for r in new_roles]}

        await self.db.commit()
        await self.db.refresh(user)

        if changes:
            record_audit_event(
                entity_type="User",
                entity_id=user_id,
                action="update_user",
                changes=changes,
                actor_id=actor_id,
            )

        return await self.get_user(user_id)

    async def delete_user(self, user_id: str, actor_id: str | None = None) -> bool:
        """Delete a platform user."""
        user = await self.get_user(user_id)
        if not user:
            return False

        email = user.email
        await self.db.delete(user)
        await self.db.commit()

        record_audit_event(
            entity_type="User",
            entity_id=user_id,
            action="delete_user",
            changes={"email": email},
            actor_id=actor_id,
        )
        return True
