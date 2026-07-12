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
    assert "opened_at" in maintenance_model.__table__.columns
    assert "closed_at" in maintenance_model.__table__.columns
    assert "status" in maintenance_model.__table__.columns
    assert any(
        constraint.name == "ck_maintenance_logs_close_after_open"
        for constraint in maintenance_model.__table__.constraints
    )
    assert any(index.name == "idx_maint_vehicle" for index in maintenance_model.__table__.indexes)
    assert any(index.name == "uq_open_maint_per_vehicle" for index in maintenance_model.__table__.indexes)


def test_cost_models_are_registered_with_sqlalchemy():
    fuel_model = import_module("app.modules.costs.models").FuelLog
    expense_model = import_module("app.modules.costs.models").Expense
    assert fuel_model.__tablename__ == "fuel_logs"
    assert expense_model.__tablename__ == "expenses"
    assert "total_cost" in fuel_model.__table__.columns
    assert "vehicle_id" in expense_model.__table__.columns
    assert any(
        constraint.name == "chk_expense_has_owner"
        for constraint in expense_model.__table__.constraints
    )
