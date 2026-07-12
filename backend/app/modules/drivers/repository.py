"""
DriverRepository — async SQLAlchemy 2.0 style.

Mirrors VehicleRepository exactly. All queries use:
    result = await self.session.execute(select(...).where(...))
    items  = result.scalars().all()

Never use session.query(), session.get(), or .first() without await —
those are sync SQLAlchemy 1.x calls that block the event loop on AsyncSession.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.modules.drivers.models import Driver


class DriverRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ------------------------------------------------------------------
    # List with optional status filter + pagination
    # Excludes soft-deleted rows.
    # ------------------------------------------------------------------
    async def list(
        self,
        *,
        page: int = 1,
        size: int = 20,
        status: str | None = None,
    ) -> tuple[int, list[Driver]]:
        base_stmt = select(Driver).where(Driver.deleted_at.is_(None))

        if status:
            base_stmt = base_stmt.where(Driver.status == status)

        # Total count via subquery — fully async
        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total: int = (await self.session.execute(count_stmt)).scalar_one()

        # Paginated items
        items_stmt = base_stmt.offset((page - 1) * size).limit(size)
        items: list[Driver] = (
            await self.session.execute(items_stmt)
        ).scalars().all()

        return total, items

    # ------------------------------------------------------------------
    # Fetch by PK — raises NotFoundError when missing or soft-deleted
    # ------------------------------------------------------------------
    async def get(self, driver_id: str) -> Driver:
        result = await self.session.execute(
            select(Driver).where(
                Driver.id == driver_id,
                Driver.deleted_at.is_(None),
            )
        )
        driver = result.scalars().first()
        if driver is None:
            raise NotFoundError("Driver not found")
        return driver

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------
    async def create(self, data: dict) -> Driver:
        driver = Driver(**data)
        self.session.add(driver)
        await self.session.flush()
        await self.session.refresh(driver)
        return driver

    # ------------------------------------------------------------------
    # Partial update
    # ------------------------------------------------------------------
    async def update(self, driver_id: str, data: dict) -> Driver:
        driver = await self.get(driver_id)
        for key, value in data.items():
            setattr(driver, key, value)
        await self.session.flush()
        await self.session.refresh(driver)
        return driver

    # ------------------------------------------------------------------
    # Soft-delete — sets deleted_at to now()
    # ------------------------------------------------------------------
    async def soft_delete(self, driver_id: str) -> Driver:
        driver = await self.get(driver_id)
        driver.deleted_at = datetime.now(tz=timezone.utc)
        await self.session.flush()
        return driver
