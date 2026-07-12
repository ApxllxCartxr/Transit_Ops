"""
VehicleService — business logic layer.

All DB access goes through VehicleRepository (async SQLAlchemy 2.0).
This layer owns:
  - Business rule enforcement (retired lock, monotonic odometer, etc.)
  - ID generation
  - Mapping between Pydantic schemas and ORM models
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError
from app.modules.vehicles.models import Vehicle
from app.modules.vehicles.repository import VehicleRepository
from app.modules.vehicles.schemas import VehicleCreate, VehicleUpdate
from app.shared.enums import VehicleStatus


class VehicleService:
    def __init__(self, session: AsyncSession) -> None:
        self.repo = VehicleRepository(session)

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------
    async def create_vehicle(self, payload: VehicleCreate) -> Vehicle:
        # Business rule: cannot create a vehicle already Retired
        if payload.status == VehicleStatus.RETIRED:
            raise ConflictError(
                "Cannot create a vehicle with status Retired",
                code="VEHICLE_CREATED_RETIRED",
            )
        data = payload.model_dump()
        data["id"] = str(uuid.uuid4())
        return await self.repo.create(data)

    # ------------------------------------------------------------------
    # Get single
    # ------------------------------------------------------------------
    async def get_vehicle(self, vehicle_id: str) -> Vehicle:
        return await self.repo.get(vehicle_id)

    # ------------------------------------------------------------------
    # List with filters + pagination
    # ------------------------------------------------------------------
    async def list_vehicles(
        self,
        *,
        page: int,
        size: int,
        status: str | None = None,
        vehicle_type: str | None = None,
        region: str | None = None,
    ) -> tuple[int, list[Vehicle]]:
        return await self.repo.list(
            page=page,
            size=size,
            status=status,
            vehicle_type=vehicle_type,
            region=region,
        )

    # ------------------------------------------------------------------
    # Partial update
    # Business rules:
    #   - Retired vehicles cannot be un-retired (SRS §5.3 / §10)
    #   - Odometer is monotonic — cannot decrease (SRS §5.3)
    # ------------------------------------------------------------------
    async def update_vehicle(self, vehicle_id: str, payload: VehicleUpdate) -> Vehicle:
        vehicle = await self.repo.get(vehicle_id)

        if vehicle.status == VehicleStatus.RETIRED:
            if payload.status is not None and payload.status != VehicleStatus.RETIRED:
                raise ConflictError(
                    "Retired vehicles cannot be un-retired",
                    code="VEHICLE_UNRETIRE_FORBIDDEN",
                )

        if payload.odometer_km is not None and payload.odometer_km < float(
            vehicle.odometer_km
        ):
            raise ConflictError(
                "Odometer reading cannot decrease",
                code="VEHICLE_ODOMETER_DECREASE",
            )

        return await self.repo.update(
            vehicle_id, payload.model_dump(exclude_unset=True)
        )

    # ------------------------------------------------------------------
    # Soft-delete
    # ------------------------------------------------------------------
    async def delete_vehicle(self, vehicle_id: str) -> Vehicle:
        return await self.repo.soft_delete(vehicle_id)
