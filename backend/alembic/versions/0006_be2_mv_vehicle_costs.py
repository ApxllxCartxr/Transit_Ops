"""create mv_vehicle_costs materialized view

Revision ID: 0006_be2_mv_vehicle_costs
Revises: 0005_be2_fuel_expenses
Create Date: 2026-07-12
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "0006_be2_mv_vehicle_costs"
down_revision: str | None = "0005_be2_fuel_expenses"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None

VIEW_NAME = "mv_vehicle_costs"


def upgrade() -> None:
    op.execute(
        f"""
        CREATE MATERIALIZED VIEW {VIEW_NAME} AS
        SELECT
            v.id AS vehicle_id,
            v.registration_number,
            v.status,
            v.acquisition_cost,
            v.odometer_km,
            COALESCE(fuel.total_fuel_liters, 0) AS total_fuel_liters,
            COALESCE(fuel.total_fuel_cost, 0) AS total_fuel_cost,
            COALESCE(expense.total_expense_cost, 0) AS total_expense_cost,
            COALESCE(trip.total_revenue, 0) AS total_revenue,
            COALESCE(fuel.total_fuel_cost, 0)
              + COALESCE(expense.total_expense_cost, 0) AS total_cost
        FROM vehicles v
        LEFT JOIN (
            SELECT vehicle_id, SUM(liters) AS total_fuel_liters, SUM(total_cost) AS total_fuel_cost
            FROM fuel_logs
            GROUP BY vehicle_id
        ) fuel ON fuel.vehicle_id = v.id
        LEFT JOIN (
            SELECT vehicle_id, SUM(amount) AS total_expense_cost
            FROM expenses
            GROUP BY vehicle_id
        ) expense ON expense.vehicle_id = v.id
        LEFT JOIN (
            SELECT vehicle_id, SUM(COALESCE(revenue, 0)) AS total_revenue
            FROM trips
            GROUP BY vehicle_id
        ) trip ON trip.vehicle_id = v.id;
        """
    )
    op.execute(f"CREATE UNIQUE INDEX idx_mv_vehicle_costs_vehicle_id ON {VIEW_NAME} (vehicle_id);")


def downgrade() -> None:
    op.execute(f"DROP MATERIALIZED VIEW IF EXISTS {VIEW_NAME} CASCADE;")
