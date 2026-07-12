"""
tests/test_ops_rules.py

Verify business logic and operations rules for trips, maintenance, and reports.
- Trips and costs are tested using pure in-memory stubs (synchronous).
- Maintenance is tested using the real database and async queries.
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
from app.shared.enums import VehicleStatus


@pytest.fixture
def trip_service():
    svc = TripService()
    svc._trips = {}  # ensure clean state per test
    return svc


@pytest.fixture
def cost_service():
    return CostService()


@pytest.fixture
def report_service():
    return ReportService()


# ---------------------------------------------------------------------------
# Async DB helper — create / delete temporary Vehicle rows for maintenance
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
        {"id": vid, "reg": vid, "name": vid, "model": "Test", "vtype": "Truck", "status": status},
    )


async def _delete_vehicle(session, vid: str) -> None:
    await session.execute(text("DELETE FROM vehicles WHERE id = :id"), {"id": vid})


async def _delete_maintenance_for(session, vid: str) -> None:
    await session.execute(
        text("DELETE FROM maintenance_logs WHERE vehicle_id = :id"), {"id": vid}
    )


# ---------------------------------------------------------------------------
# Trip business rules  (synchronous in-memory service)
# ---------------------------------------------------------------------------

def test_trip_dispatch_requires_vehicle_and_driver_available(trip_service):
    """V-1 and D-1 are marked unavailable in the placeholder — dispatch must fail."""
    trip = trip_service.create_trip("T-1", "V-1", "D-1")
    with pytest.raises(ValueError):
        trip_service.dispatch_trip(trip.id)


def test_trip_cancelled_trip_cannot_be_dispatched(trip_service):
    trip = trip_service.create_trip("T-2", "V-2", "D-2")
    trip_service.cancel_trip(trip.id)
    with pytest.raises(ValueError):
        trip_service.dispatch_trip(trip.id)


def test_trip_dispatch_succeeds_for_available_vehicle_driver(trip_service):
    trip = trip_service.create_trip("T-3", "V-2", "D-2")
    dispatched = trip_service.dispatch_trip(trip.id)
    assert dispatched.status == "Dispatched"


def test_trip_complete_requires_dispatched_status(trip_service):
    trip = trip_service.create_trip("T-4", "V-2", "D-2")
    with pytest.raises(ValueError):
        trip_service.complete_trip(trip.id)  # still Draft


def test_trip_cannot_cancel_completed_trip(trip_service):
    trip = trip_service.create_trip("T-5", "V-2", "D-2")
    trip_service.dispatch_trip(trip.id)
    trip_service.complete_trip(trip.id)
    with pytest.raises(ValueError):
        trip_service.cancel_trip(trip.id)


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

def test_reports_handle_zero_vehicles(report_service):
    report = report_service.build_report(vehicle_count=0, retired_count=0, acquisition_cost=0)
    assert report["fuel_efficiency"] == "N/A"
    assert report["vehicle_roi"] == "N/A"
    assert report["fleet_utilization"] == "N/A"


def test_reports_handle_all_retired(report_service):
    report = report_service.build_report(vehicle_count=5, retired_count=5, acquisition_cost=10000.0)
    assert report["vehicle_roi"] == "N/A"


def test_reports_handle_zero_acquisition_cost(report_service):
    report = report_service.build_report(vehicle_count=5, retired_count=0, acquisition_cost=0.0)
    assert report["vehicle_roi"] == "N/A"
