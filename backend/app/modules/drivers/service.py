"""
DriverService — business logic layer.

All DB access goes through DriverRepository (async SQLAlchemy 2.0).
This layer owns:
  - Business rule enforcement (license expiry flag, safety score bounds, etc.)
  - ID generation
  - Mapping between Pydantic schemas and ORM models
  - is_license_expired computed flag (SRS §5.4 — Frontend Dev 1 depends on this)
"""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError
from app.modules.drivers.models import Driver
from app.modules.drivers.repository import DriverRepository
from app.modules.drivers.schemas import DriverCreate, DriverUpdate
from app.shared.enums import DriverStatus


class DriverService:
    def __init__(self, session: AsyncSession) -> None:
        self.repo = DriverRepository(session)

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------
    async def create_driver(self, payload: DriverCreate) -> Driver:
        data = payload.model_dump()
        data["id"] = str(uuid.uuid4())
        return await self.repo.create(data)

    # ------------------------------------------------------------------
    # Get single
    # ------------------------------------------------------------------
    async def get_driver(self, driver_id: str) -> Driver:
        return await self.repo.get(driver_id)

    # ------------------------------------------------------------------
    # List with optional status filter + pagination
    # ------------------------------------------------------------------
    async def list_drivers(
        self,
        *,
        page: int,
        size: int,
        status: str | None = None,
    ) -> tuple[int, list[Driver]]:
        return await self.repo.list(page=page, size=size, status=status)

    # ------------------------------------------------------------------
    # Partial update
    # Business rules (SRS §5.4 / §10):
    #   - A Suspended driver cannot be moved to On Trip directly.
    #   - safety_score is validated at schema level (0-100) but must not
    #     silently be overridden to an out-of-range value here either.
    # ------------------------------------------------------------------
    async def update_driver(self, driver_id: str, payload: DriverUpdate) -> Driver:
        driver = await self.repo.get(driver_id)

        # Business rule: Suspended driver cannot be dispatched directly
        if (
            driver.status == DriverStatus.SUSPENDED
            and payload.status == DriverStatus.ON_TRIP
        ):
            raise ConflictError(
                "Suspended drivers cannot be assigned to a trip directly",
                code="DRIVER_SUSPENDED_ON_TRIP",
            )

        return await self.repo.update(
            driver_id, payload.model_dump(exclude_unset=True)
        )

    # ------------------------------------------------------------------
    # Soft-delete
    # ------------------------------------------------------------------
    async def delete_driver(self, driver_id: str) -> Driver:
        return await self.repo.soft_delete(driver_id)

    # ------------------------------------------------------------------
    # License expiry flag — used by router and frontend (SRS §5.4)
    # Computed at read time, never persisted.
    # ------------------------------------------------------------------
    @staticmethod
    def is_license_expired(driver: Driver) -> bool:
        return driver.license_expiry < date.today()
