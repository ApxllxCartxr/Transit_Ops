from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import AsyncSessionLocal
from app.modules.maintenance.models import MaintenanceLog
from app.modules.vehicles.models import Vehicle
from app.shared.enums import VehicleStatus


class MaintenanceService:
    """Transactional maintenance service backed by the real MaintenanceLog ORM model."""

    async def open_maintenance(self, vehicle_id: str) -> MaintenanceLog:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                vehicle = await self._get_vehicle_for_update(session, vehicle_id)
                if vehicle is None:
                    raise MaintenanceTransitionError("VEHICLE_NOT_FOUND", "Vehicle not found")
                if vehicle.status == VehicleStatus.ON_TRIP:
                    raise MaintenanceTransitionError(
                        "INVALID_MAINTENANCE_TRANSITION",
                        "Vehicle is on trip",
                    )

                existing = await self._get_open_maintenance_for_update(session, vehicle_id)
                if existing is not None:
                    raise MaintenanceTransitionError(
                        "MAINTENANCE_CONFLICT",
                        "Vehicle already has an open maintenance record",
                    )

                previous_vehicle_status = vehicle.status
                maintenance = MaintenanceLog(
                    id=f"M-{uuid4().hex[:8]}",
                    vehicle_id=vehicle_id,
                    opened_at=datetime.now(timezone.utc),
                    status="Open",
                    vehicle_status=previous_vehicle_status,
                )
                session.add(maintenance)
                vehicle.status = VehicleStatus.IN_SHOP
                await session.flush()
                return maintenance

    async def close_maintenance(self, maintenance_id: str) -> MaintenanceLog:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                maintenance = await self._get_maintenance_for_update(session, maintenance_id)
                if maintenance is None:
                    raise MaintenanceTransitionError("MAINTENANCE_NOT_FOUND", "Maintenance record not found")
                if maintenance.closed_at is not None:
                    raise MaintenanceTransitionError(
                        "INVALID_MAINTENANCE_TRANSITION",
                        "Maintenance record already closed",
                    )

                vehicle = await self._get_vehicle_for_update(session, maintenance.vehicle_id)
                next_vehicle_status = VehicleStatus.AVAILABLE
                if vehicle is not None:
                    previous_status = maintenance.vehicle_status
                    if previous_status == VehicleStatus.RETIRED.value:
                        next_vehicle_status = VehicleStatus.RETIRED
                    elif previous_status == VehicleStatus.RETIRED:
                        next_vehicle_status = VehicleStatus.RETIRED
                    else:
                        next_vehicle_status = VehicleStatus.AVAILABLE
                    vehicle.status = next_vehicle_status

                maintenance.status = "Closed"
                maintenance.closed_at = datetime.now(timezone.utc)
                maintenance.vehicle_status = next_vehicle_status

                await session.flush()
                return maintenance

    async def _get_open_maintenance_for_update(
        self, session: AsyncSession, vehicle_id: str
    ) -> MaintenanceLog | None:
        stmt = (
            select(MaintenanceLog)
            .where(MaintenanceLog.vehicle_id == vehicle_id, MaintenanceLog.closed_at.is_(None))
            .with_for_update()
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_maintenance_for_update(
        self, session: AsyncSession, maintenance_id: str
    ) -> MaintenanceLog | None:
        stmt = select(MaintenanceLog).where(MaintenanceLog.id == maintenance_id).with_for_update()
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_vehicle_for_update(self, session: AsyncSession, vehicle_id: str) -> Vehicle | None:
        stmt = select(Vehicle).where(Vehicle.id == vehicle_id).with_for_update()
        result = await session.execute(stmt)
        return result.scalar_one_or_none()


class MaintenanceTransitionError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message
