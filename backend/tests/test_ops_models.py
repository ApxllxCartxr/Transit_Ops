from importlib import import_module


def test_trip_model_is_registered_with_sqlalchemy():
    trip_model = import_module("app.modules.trips.models").Trip
    assert trip_model.__tablename__ == "trips"
    assert "status" in trip_model.__table__.columns
    assert "vehicle_id" in trip_model.__table__.columns


def test_maintenance_log_model_is_registered_with_sqlalchemy():
    maintenance_model = import_module("app.modules.maintenance.models").MaintenanceLog
    assert maintenance_model.__tablename__ == "maintenance_logs"
    assert "vehicle_id" in maintenance_model.__table__.columns
    assert "status" in maintenance_model.__table__.columns
