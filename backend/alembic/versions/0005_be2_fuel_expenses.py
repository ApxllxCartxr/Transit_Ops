"""define fuel_logs and expenses tables for BE2 cost workflows

Revision ID: 0005_be2_fuel_expenses
Revises: 0004_be2_trip_maintenance
Create Date: 2026-07-12
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "0005_be2_fuel_expenses"
down_revision: str | None = "0004_be2_trip_maintenance"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    op.create_table(
        "fuel_logs",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("vehicle_id", sa.String(36), nullable=False),
        sa.Column("liters", sa.Numeric(10, 2), nullable=False),
        sa.Column("cost_per_liter", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "total_cost",
            sa.Numeric(12, 2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "logged_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.CheckConstraint("liters > 0", name="ck_fuel_logs_liters_positive"),
        sa.CheckConstraint(
            "cost_per_liter >= 0",
            name="ck_fuel_logs_cost_per_liter_nonneg",
        ),
    )
    op.create_index("idx_fuel_logs_vehicle", "fuel_logs", ["vehicle_id"])
    op.create_index("idx_fuel_logs_date", "fuel_logs", ["logged_at"])

    op.create_table(
        "expenses",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("vehicle_id", sa.String(36), nullable=True),
        sa.Column("trip_id", sa.String(36), nullable=True),
        sa.Column(
            "category",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'Other'"),
        ),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "incurred_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="SET NULL"),
        sa.CheckConstraint(
            "vehicle_id IS NOT NULL OR trip_id IS NOT NULL",
            name="chk_expense_has_owner",
        ),
        sa.CheckConstraint("amount >= 0", name="ck_expenses_amount_nonneg"),
    )
    op.create_index("idx_expenses_vehicle", "expenses", ["vehicle_id"])
    op.create_index("idx_expenses_trip", "expenses", ["trip_id"])
    op.create_index("idx_expenses_category", "expenses", ["category"])


def downgrade() -> None:
    op.drop_index("idx_expenses_category", table_name="expenses")
    op.drop_index("idx_expenses_trip", table_name="expenses")
    op.drop_index("idx_expenses_vehicle", table_name="expenses")
    op.drop_table("expenses")
    op.drop_index("idx_fuel_logs_date", table_name="fuel_logs")
    op.drop_index("idx_fuel_logs_vehicle", table_name="fuel_logs")
    op.drop_table("fuel_logs")
