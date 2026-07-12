from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.db import Base
from app.modules.vehicles.models import Vehicle  # noqa: F401
from app.modules.drivers.models import Driver  # noqa: F401
from app.modules.trips.models import Trip  # noqa: F401
from app.modules.maintenance.models import MaintenanceLog  # noqa: F401
from app.modules.costs.models import FuelLog, Expense  # noqa: F401
from app.auth.models import User, Role, UserRole  # noqa: F401
from app.shared.models import AuditLog  # noqa: F401

config = context.config

from app.core.config import get_settings

database_url = os.environ.get("DATABASE_URL") or get_settings().database_url
# Use psycopg v3 driver (`postgresql+psycopg://`) which supports sync queries in alembic
if database_url.startswith("postgresql://"):
    sync_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
elif "+asyncpg" in database_url:
    sync_url = database_url.replace("+asyncpg", "+psycopg")
else:
    sync_url = database_url
config.set_main_option("sqlalchemy.url", sync_url)

if config.config_file_name is not None:
    try:
        fileConfig(config.config_file_name)
    except Exception:
        pass

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
