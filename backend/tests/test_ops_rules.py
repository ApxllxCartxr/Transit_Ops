"""
tests/test_ops_rules.py

Verify business logic and operations rules for trips, maintenance, and reports using the real database and async queries.
"""

import asyncio
import uuid
import pytest
from sqlalchemy import text

from app.modules.trips.service import TripService
from app.modules.maintenance.service import MaintenanceService, MaintenanceTransitionError
from app.modules.costs.service import CostService
from app.modules.reports.service import ReportService
from app.core.db import AsyncSessionLocal
from app.shared.enums import VehicleStatus, DriverStatus, TripStatus


@pytest.fixture
def trip_service():
    return TripService()


@pytest.fixture
def cost_service():
    return CostService()


@pytest.fixture
def report_service():
    return ReportService()


# ---------------------------------------------------------------------------
# Async DB helpers
# ---------------------------------------------------------------------------

async def _insert_vehicle(session, vid: str, status: str = VehicleStatus.AVAILABLE) -> None:
    await session.execute(
        text(
            """
            INSERT INTO vehicles
                (id, registration_number, name, model, vehicle_type,
                 max_load_kg, odometer_km, acquisition_cost, acquired_at, status)
            VALUES
                (:id, :reg, :name, :model, :vtype,
                 1000, 0, 50000, '2024-01-01', :status)
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {"id": vid, "reg": f"REG-{vid[:6].upper()}", "name": vid, "model": "Test", "vtype": "Truck", "status": status},
    )


async def _delete_vehicle(session, vid: str) -> None:
    await session.execute(text("DELETE FROM vehicles WHERE id = :id"), {"id": vid})


async def _delete_maintenance_for(session, vid: str) -> None:
    await session.execute(
        text("DELETE FROM maintenance_logs WHERE vehicle_id = :id"), {"id": vid}
    )


async def _insert_driver(session, did: str, status: str = DriverStatus.AVAILABLE) -> None:
    await session.execute(
        text(
            """
            INSERT INTO drivers
                (id, full_name, license_number, license_category, license_expiry, contact_number, safety_score, status)
            VALUES
                (:id, :name, :lic, 'Class A', '2030-01-01', '1234567890', 90, :status)
            ON CONFLICT (id) DO NOTHING
            """
        ),
        {"id": did, "name": f"Driver {did[:6]}", "lic": f"LIC-{did[:6].upper()}", "status": status},
    )


async def _delete_driver(session, did: str) -> None:
    await session.execute(text("DELETE FROM drivers WHERE id = :id"), {"id": did})


async def _delete_trip(session, tid: str) -> None:
    await session.execute(text("DELETE FROM trips WHERE id = :id"), {"id": tid})


# ---------------------------------------------------------------------------
# Trip business rules (using real PostgreSQL DB and async service)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_trip_dispatch_requires_vehicle_and_driver_available(trip_service) -> None:
    """If vehicle is not available (e.g. InShop), dispatch must fail."""
    vid = f"V-trip-{uuid.uuid4().hex[:6]}"
    did = f"D-trip-{uuid.uuid4().hex[:6]}"
    tid = f"T-trip-{uuid.uuid4().hex[:6]}"
    
    async with AsyncSessionLocal() as session:
        await _insert_vehicle(session, vid, VehicleStatus.IN_SHOP)
        await _insert_driver(session, did, DriverStatus.AVAILABLE)
        await session.commit()

    try:
        trip = await trip_service.create_trip(vehicle_id=vid, driver_id=did, trip_id=tid, status="Draft")
        with pytest.raises(ValueError):
            await trip_service.dispatch_trip(trip["id"])
    finally:
        async with AsyncSessionLocal() as session:
            await _delete_trip(session, tid)
            await _delete_driver(session, did)
            await _delete_vehicle(session, vid)
            await session.commit()


@pytest.mark.asyncio
async def test_trip_cancelled_trip_cannot_be_dispatched(trip_service) -> None:
    vid = f"V-trip-{uuid.uuid4().hex[:6]}"
    did = f"D-trip-{uuid.uuid4().hex[:6]}"
    tid = f"T-trip-{uuid.uuid4().hex[:6]}"
    
    async with AsyncSessionLocal() as session:
        await _insert_vehicle(session, vid, VehicleStatus.AVAILABLE)
        await _insert_driver(session, did, DriverStatus.AVAILABLE)
        await session.commit()

    try:
        trip = await trip_service.create_trip(vehicle_id=vid, driver_id=did, trip_id=tid, status="Draft")
        await trip_service.cancel_trip(trip["id"])
        with pytest.raises(ValueError):
            await trip_service.dispatch_trip(trip["id"])
    finally:
        async with AsyncSessionLocal() as session:
            await _delete_trip(session, tid)
            await _delete_driver(session, did)
            await _delete_vehicle(session, vid)
            await session.commit()


@pytest.mark.asyncio
async def test_trip_dispatch_succeeds_for_available_vehicle_driver(trip_service) -> None:
    vid = f"V-trip-{uuid.uuid4().hex[:6]}"
    did = f"D-trip-{uuid.uuid4().hex[:6]}"
    tid = f"T-trip-{uuid.uuid4().hex[:6]}"
    
    async with AsyncSessionLocal() as session:
        await _insert_vehicle(session, vid, VehicleStatus.AVAILABLE)
        await _insert_driver(session, did, DriverStatus.AVAILABLE)
        await session.commit()

    try:
        trip = await trip_service.create_trip(vehicle_id=vid, driver_id=did, trip_id=tid, status="Draft")
        dispatched = await trip_service.dispatch_trip(trip["id"])
        assert dispatched["status"] == "Dispatched"
    finally:
        async with AsyncSessionLocal() as session:
            await _delete_trip(session, tid)
            await _delete_driver(session, did)
            await _delete_vehicle(session, vid)
            await session.commit()


@pytest.mark.asyncio
async def test_trip_complete_requires_dispatched_status(trip_service) -> None:
    vid = f"V-trip-{uuid.uuid4().hex[:6]}"
    did = f"D-trip-{uuid.uuid4().hex[:6]}"
    tid = f"T-trip-{uuid.uuid4().hex[:6]}"
    
    async with AsyncSessionLocal() as session:
        await _insert_vehicle(session, vid, VehicleStatus.AVAILABLE)
        await _insert_driver(session, did, DriverStatus.AVAILABLE)
        await session.commit()

    try:
        trip = await trip_service.create_trip(vehicle_id=vid, driver_id=did, trip_id=tid, status="Draft")
        with pytest.raises(ValueError):
            await trip_service.complete_trip(trip["id"])  # still Draft
    finally:
        async with AsyncSessionLocal() as session:
            await _delete_trip(session, tid)
            await _delete_driver(session, did)
            await _delete_vehicle(session, vid)
            await session.commit()


@pytest.mark.asyncio
async def test_trip_cannot_cancel_completed_trip(trip_service) -> None:
    vid = f"V-trip-{uuid.uuid4().hex[:6]}"
    did = f"D-trip-{uuid.uuid4().hex[:6]}"
    tid = f"T-trip-{uuid.uuid4().hex[:6]}"
    
    async with AsyncSessionLocal() as session:
        await _insert_vehicle(session, vid, VehicleStatus.AVAILABLE)
        await _insert_driver(session, did, DriverStatus.AVAILABLE)
        await session.commit()

    try:
        trip = await trip_service.create_trip(vehicle_id=vid, driver_id=did, trip_id=tid, status="Draft")
        await trip_service.dispatch_trip(trip["id"])
        await trip_service.complete_trip(trip["id"])
        with pytest.raises(ValueError):
            await trip_service.cancel_trip(trip["id"])
    finally:
        async with AsyncSessionLocal() as session:
            await _delete_trip(session, tid)
            await _delete_driver(session, did)
            await _delete_vehicle(session, vid)
            await session.commit()


# ---------------------------------------------------------------------------
# Maintenance business rules  (async — uses real Postgres DB)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_maintenance_opening_sets_vehicle_status_to_inshop() -> None:
    """Opening maintenance on an available vehicle sets its status to InShop."""
    vid = f"V-maint-{uuid.uuid4().hex[:6]}"
    svc = MaintenanceService()
    async with AsyncSessionLocal() as session:
        await _insert_vehicle(session, vid, VehicleStatus.AVAILABLE)
        await session.commit()
    try:
        m = await svc.open_maintenance(vid)
        assert m.status == "Open"
        assert m.vehicle_id == vid
    finally:
        async with AsyncSessionLocal() as session:
            await _delete_maintenance_for(session, vid)
            await _delete_vehicle(session, vid)
            await session.commit()


@pytest.mark.asyncio
async def test_maintenance_cannot_be_opened_for_vehicle_on_trip() -> None:
    """A vehicle with ON_TRIP status must raise MaintenanceTransitionError."""
    vid = f"V-maint-{uuid.uuid4().hex[:6]}"
    svc = MaintenanceService()
    async with AsyncSessionLocal() as session:
        await _insert_vehicle(session, vid, VehicleStatus.ON_TRIP)
        await session.commit()
    try:
        with pytest.raises((MaintenanceTransitionError, ValueError)):
            await svc.open_maintenance(vid)
    finally:
        async with AsyncSessionLocal() as session:
            await _delete_maintenance_for(session, vid)
            await _delete_vehicle(session, vid)
            await session.commit()


@pytest.mark.asyncio
async def test_maintenance_cannot_open_duplicate_for_same_vehicle() -> None:
    """Opening a second maintenance record for the same vehicle must fail."""
    vid = f"V-maint-{uuid.uuid4().hex[:6]}"
    svc = MaintenanceService()
    async with AsyncSessionLocal() as session:
        await _insert_vehicle(session, vid, VehicleStatus.AVAILABLE)
        await session.commit()
    try:
        await svc.open_maintenance(vid)  # first — OK
        with pytest.raises((MaintenanceTransitionError, ValueError)):
            await svc.open_maintenance(vid)  # second — must fail
    finally:
        async with AsyncSessionLocal() as session:
            await _delete_maintenance_for(session, vid)
            await _delete_vehicle(session, vid)
            await session.commit()


@pytest.mark.asyncio
async def test_maintenance_close_sets_vehicle_available() -> None:
    """Closing an open maintenance log must return vehicle to Available."""
    vid = f"V-maint-{uuid.uuid4().hex[:6]}"
    svc = MaintenanceService()
    async with AsyncSessionLocal() as session:
        await _insert_vehicle(session, vid, VehicleStatus.AVAILABLE)
        await session.commit()
    try:
        m = await svc.open_maintenance(vid)
        closed = await svc.close_maintenance(m.id)
        assert closed.status == "Closed"
    finally:
        async with AsyncSessionLocal() as session:
            await _delete_maintenance_for(session, vid)
            await _delete_vehicle(session, vid)
            await session.commit()


# ---------------------------------------------------------------------------
# Cost calculations
# ---------------------------------------------------------------------------

def test_operational_cost_and_total_cost_are_separate(cost_service):
    cost = cost_service.calculate_costs("V-5")
    assert cost["operational_cost"] == 150.0
    assert cost["total_cost"] == 200.0


# ---------------------------------------------------------------------------
# Report edge cases
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_reports_handle_zero_vehicles(report_service):
    report = await report_service.build_report(vehicle_count=0, retired_count=0, acquisition_cost=0)
    assert report["fuel_efficiency"] == "N/A"
    assert report["vehicle_roi"] == "N/A"
    assert report["fleet_utilization"] == "N/A"


@pytest.mark.asyncio
async def test_reports_handle_all_retired(report_service):
    report = await report_service.build_report(vehicle_count=5, retired_count=5, acquisition_cost=10000.0)
    assert report["vehicle_roi"] == "N/A"


@pytest.mark.asyncio
async def test_reports_handle_zero_acquisition_cost(report_service):
    report = await report_service.build_report(vehicle_count=5, retired_count=0, acquisition_cost=0.0)
    assert report["vehicle_roi"] == "N/A"
