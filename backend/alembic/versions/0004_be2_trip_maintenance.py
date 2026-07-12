"""define trips and maintenance_logs tables for BE2 operations workflows

Revision ID: 0004_be2_trip_maintenance
Revises: 0003_triggers
Create Date: 2026-07-12
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "0004_be2_trip_maintenance"
down_revision: str | None = "0003_triggers"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    op.create_table(
        "trips",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("vehicle_id", sa.String(36), nullable=False),
        sa.Column("driver_id", sa.String(36), nullable=False),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'Draft'"),
        ),
        sa.Column("revenue", sa.Numeric(10, 2), nullable=False, server_default=sa.text("'0.00'")),
        sa.Column("cancelled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
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
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="SET NULL"),
        sa.CheckConstraint(
            "status IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')",
            name="ck_trips_status",
        ),
    )
    op.create_index("idx_trips_status", "trips", ["status"])
    op.create_index("idx_trips_vehicle_driver", "trips", ["vehicle_id", "driver_id"])

    op.create_table(
        "maintenance_logs",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("vehicle_id", sa.String(36), nullable=False),
        sa.Column(
            "opened_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("closed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column(
            "vehicle_status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'InShop'"),
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
        sa.CheckConstraint(
            "status IN ('Open', 'Closed')",
            name="ck_maintenance_logs_status",
        ),
        sa.CheckConstraint(
            "vehicle_status IN ('Available', 'OnTrip', 'InShop', 'Retired')",
            name="ck_maintenance_logs_vehicle_status",
        ),
        sa.CheckConstraint(
            "closed_at IS NULL OR closed_at >= opened_at",
            name="ck_maintenance_logs_close_after_open",
        ),
    )
    op.create_index("idx_maint_vehicle", "maintenance_logs", ["vehicle_id"])
    op.create_index(
        "uq_open_maint_per_vehicle",
        "maintenance_logs",
        ["vehicle_id"],
        unique=True,
        postgresql_where=sa.text("closed_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_open_maint_per_vehicle", table_name="maintenance_logs")
    op.drop_index("idx_maint_vehicle", table_name="maintenance_logs")
    op.drop_table("maintenance_logs")
    op.drop_index("idx_trips_vehicle_driver", table_name="trips")
    op.drop_index("idx_trips_status", table_name="trips")
    op.drop_table("trips")
