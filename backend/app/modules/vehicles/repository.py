"""
VehicleRepository — async SQLAlchemy 2.0 style.

All queries use:
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
from app.modules.vehicles.models import Vehicle


class VehicleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ------------------------------------------------------------------
    # List with optional filters + pagination
    # ------------------------------------------------------------------
    async def list(
        self,
        *,
        page: int = 1,
        size: int = 20,
        status: str | None = None,
        vehicle_type: str | None = None,
        region: str | None = None,
    ) -> tuple[int, list[Vehicle]]:
        base_stmt = select(Vehicle).where(Vehicle.deleted_at.is_(None))

        if status:
            base_stmt = base_stmt.where(Vehicle.status == status)
        if vehicle_type:
            base_stmt = base_stmt.where(Vehicle.vehicle_type == vehicle_type)
        if region:
            base_stmt = base_stmt.where(Vehicle.region == region)

        # Total count — wrap in func.count() subquery
        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total: int = (await self.session.execute(count_stmt)).scalar_one()

        # Paginated items
        items_stmt = base_stmt.offset((page - 1) * size).limit(size)
        items: list[Vehicle] = (
            await self.session.execute(items_stmt)
        ).scalars().all()

        return total, items

    # ------------------------------------------------------------------
    # Fetch by PK — raises NotFoundError when missing or soft-deleted
    # ------------------------------------------------------------------
    async def get(self, vehicle_id: str) -> Vehicle:
        result = await self.session.execute(
            select(Vehicle).where(
                Vehicle.id == vehicle_id,
                Vehicle.deleted_at.is_(None),
            )
        )
        vehicle = result.scalars().first()
        if vehicle is None:
            raise NotFoundError("Vehicle not found")
        return vehicle

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------
    async def create(self, data: dict) -> Vehicle:
        vehicle = Vehicle(**data)
        self.session.add(vehicle)
        await self.session.flush()
        await self.session.refresh(vehicle)
        return vehicle

    # ------------------------------------------------------------------
    # Partial update — caller is responsible for business-rule checks
    # ------------------------------------------------------------------
    async def update(self, vehicle_id: str, data: dict) -> Vehicle:
        vehicle = await self.get(vehicle_id)
        for key, value in data.items():
            setattr(vehicle, key, value)
        await self.session.flush()
        await self.session.refresh(vehicle)
        return vehicle

    # ------------------------------------------------------------------
    # Soft-delete — sets deleted_at to now()
    # ------------------------------------------------------------------
    async def soft_delete(self, vehicle_id: str) -> Vehicle:
        vehicle = await self.get(vehicle_id)
        vehicle.deleted_at = datetime.now(tz=timezone.utc)
        await self.session.flush()
        return vehicle
