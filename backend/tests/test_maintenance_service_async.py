from __future__ import annotations

import asyncio
from datetime import date
from unittest.mock import patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.auth.models import User, Role, UserRole  # noqa: F401
from app.core.db import Base
from app.modules.maintenance.models import MaintenanceLog
from app.modules.maintenance.service import MaintenanceService, MaintenanceTransitionError
from app.modules.vehicles.models import Vehicle
from app.shared.enums import VehicleStatus


@pytest.fixture()
def maintenance_service_factory():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async def init_db() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(init_db())
    factory = async_sessionmaker(engine, expire_on_commit=False)

    yield factory
    asyncio.run(engine.dispose())


async def _seed_vehicle(session: AsyncSession, vehicle_id: str, status: VehicleStatus) -> Vehicle:
    vehicle = Vehicle(
        id=vehicle_id,
        registration_number=f"REG-{vehicle_id}",
        name="Fleet Bus",
        model="Model X",
        vehicle_type="Bus",
        max_load_kg=12000.0,
        odometer_km=0.0,
        acquisition_cost=100000.0,
        acquired_at=date(2024, 1, 1),
        status=status,
        region="North",
    )
    session.add(vehicle)
    await session.commit()
    await session.refresh(vehicle)
    return vehicle


def test_open_maintenance_sets_vehicle_status_to_inshop(maintenance_service_factory):
    async def run_test() -> None:
        async with maintenance_service_factory() as session:
            vehicle = await _seed_vehicle(session, "V-100", VehicleStatus.AVAILABLE)
            service = MaintenanceService()
            with patch("app.modules.maintenance.service.AsyncSessionLocal", maintenance_service_factory):
                maintenance = await service.open_maintenance(vehicle.id)
                await session.refresh(vehicle)

            assert maintenance.vehicle_status == VehicleStatus.AVAILABLE
            assert maintenance.status == "Open"
            assert vehicle.status == VehicleStatus.IN_SHOP

    asyncio.run(run_test())


def test_open_maintenance_rejects_vehicle_on_trip(maintenance_service_factory):
    async def run_test() -> None:
        async with maintenance_service_factory() as session:
            vehicle = await _seed_vehicle(session, "V-101", VehicleStatus.ON_TRIP)
            service = MaintenanceService()
            with patch("app.modules.maintenance.service.AsyncSessionLocal", maintenance_service_factory):
                with pytest.raises(MaintenanceTransitionError, match="on trip"):
                    await service.open_maintenance(vehicle.id)

    asyncio.run(run_test())


def test_open_maintenance_rejects_duplicate_open_record(maintenance_service_factory):
    async def run_test() -> None:
        async with maintenance_service_factory() as session:
            vehicle = await _seed_vehicle(session, "V-102", VehicleStatus.AVAILABLE)
            service = MaintenanceService()
            with patch("app.modules.maintenance.service.AsyncSessionLocal", maintenance_service_factory):
                await service.open_maintenance(vehicle.id)
                with pytest.raises(MaintenanceTransitionError, match="already has an open"):
                    await service.open_maintenance(vehicle.id)

    asyncio.run(run_test())


def test_close_maintenance_sets_vehicle_available_and_keeps_retired_status(maintenance_service_factory):
    async def run_test() -> None:
        async with maintenance_service_factory() as session:
            vehicle = await _seed_vehicle(session, "V-103", VehicleStatus.AVAILABLE)
            service = MaintenanceService()
            with patch("app.modules.maintenance.service.AsyncSessionLocal", maintenance_service_factory):
                opened = await service.open_maintenance(vehicle.id)
                closed = await service.close_maintenance(opened.id)
                await session.refresh(vehicle)

            assert closed.status == "Closed"
            assert closed.vehicle_status == VehicleStatus.AVAILABLE
            assert vehicle.status == VehicleStatus.AVAILABLE

            retired_vehicle = await _seed_vehicle(session, "V-104", VehicleStatus.RETIRED)
            with patch("app.modules.maintenance.service.AsyncSessionLocal", maintenance_service_factory):
                opened_retired = await service.open_maintenance(retired_vehicle.id)
                closed_retired = await service.close_maintenance(opened_retired.id)
                await session.refresh(retired_vehicle)

            assert closed_retired.vehicle_status == VehicleStatus.RETIRED
            assert retired_vehicle.status == VehicleStatus.RETIRED

    asyncio.run(run_test())
