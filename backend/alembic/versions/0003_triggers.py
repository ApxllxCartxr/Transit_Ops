"""add odometer monotonicity and updated_at DB triggers

Revision ID: 0003_triggers
Revises: 0002_vehicles_drivers
Create Date: 2026-07-12

SRS §7.5 — Database Triggers

Two trigger functions are created with raw plpgsql (op.execute), because
Alembic autogenerate cannot generate plpgsql functions or trigger bindings.

────────────────────────────────────────────────────────────────────────────
FUNCTION 1 — set_updated_at()
  A BEFORE UPDATE trigger function that stamps updated_at = NOW() on any row
  that is being modified. Attached to: vehicles, drivers.
  (trips and maintenance_logs are BE2's tables — not created yet; they will
  add `CREATE TRIGGER trg_updated_at ON <table>` in their own migration once
  those tables exist. The shared function is created here so BE2 can reference
  it immediately.)

FUNCTION 2 — enforce_odometer_monotonic()
  A BEFORE UPDATE trigger function on vehicles that raises a plpgsql EXCEPTION
  if the incoming NEW.odometer_km < OLD.odometer_km. The service layer also
  enforces this at the application level (VehicleService.update_vehicle), but
  the DB trigger is the hard backstop — it prevents any raw SQL UPDATE from
  bypassing the application rule.

Trigger bindings:
  trg_updated_at_vehicles   → set_updated_at()            BEFORE UPDATE ON vehicles
  trg_updated_at_drivers    → set_updated_at()            BEFORE UPDATE ON drivers
  trg_vehicle_odometer      → enforce_odometer_monotonic() BEFORE UPDATE ON vehicles

Downgrade drops all triggers and functions in reverse order.
────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

from alembic import op

# ---------------------------------------------------------------------------
# Revision identifiers
# ---------------------------------------------------------------------------
revision: str = "0003_triggers"
down_revision: str | None = "0002_vehicles_drivers"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


# ---------------------------------------------------------------------------
# plpgsql source — kept as module-level strings for readability and testing
# ---------------------------------------------------------------------------

# Shared updated_at stamper — usable by any table with an updated_at column
_CREATE_FN_SET_UPDATED_AT = """
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
"""

# Odometer monotonicity enforcer — vehicles-specific
_CREATE_FN_ODOMETER_MONOTONIC = """
CREATE OR REPLACE FUNCTION enforce_odometer_monotonic()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.odometer_km < OLD.odometer_km THEN
        RAISE EXCEPTION
            'odometer reading cannot decrease: current=%, attempted=%',
            OLD.odometer_km,
            NEW.odometer_km
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;
"""

# ---------------------------------------------------------------------------
# Trigger DDL
# ---------------------------------------------------------------------------

_CREATE_TRG_UPDATED_AT_VEHICLES = """
CREATE TRIGGER trg_updated_at_vehicles
BEFORE UPDATE ON vehicles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
"""

_CREATE_TRG_UPDATED_AT_DRIVERS = """
CREATE TRIGGER trg_updated_at_drivers
BEFORE UPDATE ON drivers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
"""

_CREATE_TRG_ODOMETER_VEHICLES = """
CREATE TRIGGER trg_vehicle_odometer_monotonic
BEFORE UPDATE ON vehicles
FOR EACH ROW
WHEN (OLD.odometer_km IS DISTINCT FROM NEW.odometer_km)
EXECUTE FUNCTION enforce_odometer_monotonic();
"""

# ---------------------------------------------------------------------------
# Downgrade DDL
# ---------------------------------------------------------------------------

_DROP_TRG_UPDATED_AT_VEHICLES = (
    "DROP TRIGGER IF EXISTS trg_updated_at_vehicles ON vehicles;"
)
_DROP_TRG_UPDATED_AT_DRIVERS = (
    "DROP TRIGGER IF EXISTS trg_updated_at_drivers ON drivers;"
)
_DROP_TRG_ODOMETER_VEHICLES = (
    "DROP TRIGGER IF EXISTS trg_vehicle_odometer_monotonic ON vehicles;"
)
_DROP_FN_SET_UPDATED_AT = "DROP FUNCTION IF EXISTS set_updated_at() CASCADE;"
_DROP_FN_ODOMETER_MONOTONIC = (
    "DROP FUNCTION IF EXISTS enforce_odometer_monotonic() CASCADE;"
)


# ---------------------------------------------------------------------------
# Migration
# ---------------------------------------------------------------------------

def upgrade() -> None:
    # 1. Create shared updated_at function
    op.execute(_CREATE_FN_SET_UPDATED_AT)

    # 2. Create odometer function
    op.execute(_CREATE_FN_ODOMETER_MONOTONIC)

    # 3. Bind updated_at trigger to vehicles and drivers
    op.execute(_CREATE_TRG_UPDATED_AT_VEHICLES)
    op.execute(_CREATE_TRG_UPDATED_AT_DRIVERS)

    # 4. Bind odometer monotonicity trigger to vehicles
    #    WHEN clause limits firing to rows where odometer actually changes —
    #    avoids unnecessary overhead on updates that don't touch odometer_km.
    op.execute(_CREATE_TRG_ODOMETER_VEHICLES)


def downgrade() -> None:
    # Drop triggers first, then the functions they reference
    op.execute(_DROP_TRG_ODOMETER_VEHICLES)
    op.execute(_DROP_TRG_UPDATED_AT_DRIVERS)
    op.execute(_DROP_TRG_UPDATED_AT_VEHICLES)
    op.execute(_DROP_FN_ODOMETER_MONOTONIC)
    # CASCADE so any other triggers referencing set_updated_at are also dropped
    op.execute(_DROP_FN_SET_UPDATED_AT)
