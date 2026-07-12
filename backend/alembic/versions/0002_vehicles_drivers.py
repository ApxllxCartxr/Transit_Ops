"""create vehicles and drivers tables

Revision ID: 0002_vehicles_drivers
Revises: 0001_users_roles
Create Date: 2026-07-12

SRS §7.4.3 — vehicles table
SRS §7.4.4 — drivers table

NOTE: Alembic autogenerate was intentionally NOT used for the CHECK constraints
and named indexes — autogenerate reliably misses both. Every constraint below
was written by hand and verified line-by-line against §7.4.3/§7.4.4.

Constraints verified:
  vehicles:
    ✓ UNIQUE on registration_number
    ✓ CHECK max_load_kg > 0          (ck_vehicles_max_load_kg_positive)
    ✓ CHECK odometer_km >= 0         (ck_vehicles_odometer_km_nonneg)
    ✓ CHECK acquisition_cost >= 0    (ck_vehicles_acquisition_cost_nonneg)
    ✓ INDEX idx_vehicles_status      (status)
    ✓ INDEX idx_vehicles_type_region (vehicle_type, region)

  drivers:
    ✓ UNIQUE on license_number
    ✓ CHECK safety_score BETWEEN 0 AND 100  (ck_drivers_safety_score_range)
    ✓ INDEX idx_drivers_status              (status)
    ✓ INDEX idx_drivers_license_expiry      (license_expiry)
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# ---------------------------------------------------------------------------
# Revision identifiers
# ---------------------------------------------------------------------------
revision: str = "0002_vehicles_drivers"
down_revision: str | None = "0001_users_roles"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # vehicles (SRS §7.4.3)
    # Depends on: users (FK for created_by / updated_by)
    # ------------------------------------------------------------------
    op.create_table(
        "vehicles",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("registration_number", sa.String(20), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("model", sa.String(80), nullable=False),
        sa.Column("vehicle_type", sa.String(40), nullable=False),
        sa.Column("max_load_kg", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "odometer_km",
            sa.Numeric(12, 2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("acquisition_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("acquired_at", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'Available'"),
        ),
        sa.Column("region", sa.String(60), nullable=True),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
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
        sa.Column(
            "created_by",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "updated_by",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # ------ CHECK constraints (SRS §7.4.3) ------
        sa.CheckConstraint("max_load_kg > 0", name="ck_vehicles_max_load_kg_positive"),
        sa.CheckConstraint("odometer_km >= 0", name="ck_vehicles_odometer_km_nonneg"),
        sa.CheckConstraint(
            "acquisition_cost >= 0", name="ck_vehicles_acquisition_cost_nonneg"
        ),
    )

    # UNIQUE on registration_number (SRS §7.4.3)
    op.create_index(
        "uq_vehicles_registration_number",
        "vehicles",
        ["registration_number"],
        unique=True,
    )

    # Named indexes required by SRS §7.4.3
    op.create_index("idx_vehicles_status", "vehicles", ["status"])
    op.create_index(
        "idx_vehicles_type_region", "vehicles", ["vehicle_type", "region"]
    )

    # ------------------------------------------------------------------
    # drivers (SRS §7.4.4)
    # Depends on: users (FK for created_by / updated_by)
    # ------------------------------------------------------------------
    op.create_table(
        "drivers",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("license_number", sa.String(30), nullable=False),
        sa.Column("license_category", sa.String(10), nullable=False),
        sa.Column("license_expiry", sa.Date(), nullable=False),
        sa.Column("contact_number", sa.String(20), nullable=False),
        sa.Column(
            "safety_score",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("100"),
        ),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'Available'"),
        ),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
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
        sa.Column(
            "created_by",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "updated_by",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # ------ CHECK constraints (SRS §7.4.4) ------
        sa.CheckConstraint(
            "safety_score BETWEEN 0 AND 100", name="ck_drivers_safety_score_range"
        ),
    )

    # UNIQUE on license_number (SRS §7.4.4)
    op.create_index(
        "uq_drivers_license_number", "drivers", ["license_number"], unique=True
    )

    # Named indexes required by SRS §7.4.4
    op.create_index("idx_drivers_status", "drivers", ["status"])
    op.create_index("idx_drivers_license_expiry", "drivers", ["license_expiry"])


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_index("idx_drivers_license_expiry", table_name="drivers")
    op.drop_index("idx_drivers_status", table_name="drivers")
    op.drop_index("uq_drivers_license_number", table_name="drivers")
    op.drop_table("drivers")

    op.drop_index("idx_vehicles_type_region", table_name="vehicles")
    op.drop_index("idx_vehicles_status", table_name="vehicles")
    op.drop_index("uq_vehicles_registration_number", table_name="vehicles")
    op.drop_table("vehicles")
