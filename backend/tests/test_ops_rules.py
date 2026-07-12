"""
Tests ported from BE2 (feat/backend-ops-analytics: Backend/tests/test_ops_rules.py).
Adapted to import from app.modules.* (our canonical backend structure).
"""

import pytest

from app.modules.trips.service import TripService
from app.modules.maintenance.service import MaintenanceService
from app.modules.costs.service import CostService
from app.modules.reports.service import ReportService


@pytest.fixture
def trip_service():
    svc = TripService()
    svc._trips = {}  # ensure clean state per test
    return svc


@pytest.fixture
def maintenance_service():
    svc = MaintenanceService()
    svc._maintenances = {}
    return svc


@pytest.fixture
def cost_service():
    return CostService()


@pytest.fixture
def report_service():
    return ReportService()


# ---------------------------------------------------------------------------
# Trip business rules
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
# Maintenance business rules
# ---------------------------------------------------------------------------

def test_maintenance_opening_sets_vehicle_status_to_inshop(maintenance_service):
    maintenance = maintenance_service.open_maintenance("V-3")
    assert maintenance.vehicle_status == "InShop"


def test_maintenance_cannot_be_opened_for_vehicle_on_trip(maintenance_service):
    with pytest.raises(ValueError):
        maintenance_service.open_maintenance("V-4")


def test_maintenance_cannot_open_duplicate_for_same_vehicle(maintenance_service):
    maintenance_service.open_maintenance("V-5")
    with pytest.raises(ValueError):
        maintenance_service.open_maintenance("V-5")


def test_maintenance_close_sets_vehicle_available(maintenance_service):
    m = maintenance_service.open_maintenance("V-6")
    closed = maintenance_service.close_maintenance(m.id)
    assert closed.vehicle_status == "Available"


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
