import pytest

from app.operations.trips.service import TripService
from app.operations.maintenance.service import MaintenanceService
from app.operations.costs.service import CostService
from app.operations.reports.service import ReportService


@pytest.fixture
def trip_service():
    return TripService()


@pytest.fixture
def maintenance_service():
    return MaintenanceService()


@pytest.fixture
def cost_service():
    return CostService()


@pytest.fixture
def report_service():
    return ReportService()


def test_trip_dispatch_requires_vehicle_and_driver_available(trip_service):
    trip = trip_service.create_trip("T-1", "V-1", "D-1")

    with pytest.raises(ValueError):
        trip_service.dispatch_trip(trip.id)


def test_trip_cancelled_trip_cannot_be_dispatched(trip_service):
    trip = trip_service.create_trip("T-2", "V-2", "D-2")
    trip_service.cancel_trip(trip.id)

    with pytest.raises(ValueError):
        trip_service.dispatch_trip(trip.id)


def test_maintenance_opening_sets_vehicle_status_to_inshop(maintenance_service):
    maintenance = maintenance_service.open_maintenance("V-3")
    assert maintenance.vehicle_status == "InShop"


def test_maintenance_cannot_be_opened_for_vehicle_on_trip(maintenance_service):
    with pytest.raises(ValueError):
        maintenance_service.open_maintenance("V-4")


def test_operational_cost_and_total_cost_are_separate(cost_service):
    cost = cost_service.calculate_costs("V-5")
    assert cost["operational_cost"] == 150.0
    assert cost["total_cost"] == 200.0


def test_reports_handle_zero_cost_and_all_retired(report_service):
    report = report_service.build_report(vehicle_count=0, retired_count=0, acquisition_cost=0)
    assert report["fuel_efficiency"] == "N/A"
    assert report["vehicle_roi"] == "N/A"
    assert report["fleet_utilization"] == "N/A"
