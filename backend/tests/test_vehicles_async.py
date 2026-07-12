"""
test_vehicles_async.py

Regression test to catch sync SQLAlchemy 1.x calls (session.query,
session.get, .count(), .all()) accidentally used on an AsyncSession.

Uses an in-memory async SQLite database so no Postgres is required in CI.
Every test actually awaits real DB operations end-to-end — nothing is mocked.

If VehicleRepository or VehicleService ever regresses to sync calls,
these tests will raise:
    sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called
or an AttributeError/TypeError at import time.
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from datetime import date

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# Import Base — this also registers all models via their module imports
from app.core.db import Base

# Import models so Base.metadata knows about them
from app.auth.models import User, Role, UserRole  # noqa: F401
from app.modules.vehicles.models import Vehicle  # noqa: F401
from app.modules.drivers.models import Driver  # noqa: F401

from app.modules.vehicles.repository import VehicleRepository
from app.modules.vehicles.service import VehicleService
from app.shared.enums import VehicleStatus
from app.core.exceptions import ConflictError, NotFoundError


# ---------------------------------------------------------------------------
# Async SQLite engine — in-process, no Postgres needed
# ---------------------------------------------------------------------------
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def async_session() -> AsyncSession:
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _vehicle_payload(**overrides) -> dict:
    base = dict(
        registration_number="AB-1234",
        name="Fleet Truck",
        model="Volvo FH16",
        vehicle_type="HGV",
        max_load_kg=15000.0,
        odometer_km=0.0,
        acquisition_cost=120000.0,
        acquired_at=date(2024, 1, 1),
        status=VehicleStatus.AVAILABLE,
        region="North",
    )
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# VehicleRepository — async correctness tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_repository_create_and_get(async_session: AsyncSession) -> None:
    """create() and get() must both be awaitable and return the same record."""
    repo = VehicleRepository(async_session)
    import uuid
    payload = _vehicle_payload()
    payload["id"] = str(uuid.uuid4())

    created = await repo.create(payload)
    assert created.id == payload["id"]
    assert created.registration_number == "AB-1234"

    fetched = await repo.get(created.id)
    assert fetched.id == created.id


@pytest.mark.asyncio
async def test_repository_list_returns_correct_total(async_session: AsyncSession) -> None:
    """list() must use async count subquery — not sync .count()."""
    import uuid
    repo = VehicleRepository(async_session)

    for i in range(3):
        payload = _vehicle_payload(registration_number=f"XX-{i:04d}")
        payload["id"] = str(uuid.uuid4())
        await repo.create(payload)

    total, items = await repo.list(page=1, size=10)
    assert total == 3
    assert len(items) == 3


@pytest.mark.asyncio
async def test_repository_list_filter_by_status(async_session: AsyncSession) -> None:
    """Filter by status must work with async WHERE clause."""
    import uuid
    repo = VehicleRepository(async_session)

    p1 = _vehicle_payload(registration_number="S-0001", status=VehicleStatus.AVAILABLE)
    p1["id"] = str(uuid.uuid4())
    await repo.create(p1)

    p2 = _vehicle_payload(registration_number="S-0002", status=VehicleStatus.IN_SHOP)
    p2["id"] = str(uuid.uuid4())
    await repo.create(p2)

    total, items = await repo.list(status=VehicleStatus.AVAILABLE)
    assert total == 1
    assert items[0].registration_number == "S-0001"


@pytest.mark.asyncio
async def test_repository_get_raises_not_found(async_session: AsyncSession) -> None:
    """get() on a missing ID must raise NotFoundError (not AttributeError)."""
    repo = VehicleRepository(async_session)
    with pytest.raises(NotFoundError):
        await repo.get("does-not-exist")


@pytest.mark.asyncio
async def test_repository_update(async_session: AsyncSession) -> None:
    """update() must persist field changes via async flush."""
    import uuid
    repo = VehicleRepository(async_session)
    payload = _vehicle_payload()
    payload["id"] = str(uuid.uuid4())
    created = await repo.create(payload)

    updated = await repo.update(created.id, {"name": "Updated Truck"})
    assert updated.name == "Updated Truck"

    refetched = await repo.get(created.id)
    assert refetched.name == "Updated Truck"


@pytest.mark.asyncio
async def test_repository_soft_delete_hides_record(async_session: AsyncSession) -> None:
    """soft_delete() must set deleted_at and subsequent get() must raise NotFoundError."""
    import uuid
    repo = VehicleRepository(async_session)
    payload = _vehicle_payload()
    payload["id"] = str(uuid.uuid4())
    created = await repo.create(payload)

    await repo.soft_delete(created.id)

    with pytest.raises(NotFoundError):
        await repo.get(created.id)


# ---------------------------------------------------------------------------
# VehicleService — business rule tests (all async DB calls)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_service_create_vehicle(async_session: AsyncSession) -> None:
    """Service must generate a UUID and delegate creation to the repository."""
    from app.modules.vehicles.schemas import VehicleCreate
    svc = VehicleService(async_session)
    schema = VehicleCreate(**_vehicle_payload())
    vehicle = await svc.create_vehicle(schema)
    assert vehicle.id  # UUID was generated
    assert vehicle.registration_number == "AB-1234"


@pytest.mark.asyncio
async def test_service_create_retired_vehicle_rejected(async_session: AsyncSession) -> None:
    """Creating a vehicle with status=Retired must raise ConflictError."""
    from app.modules.vehicles.schemas import VehicleCreate
    svc = VehicleService(async_session)
    schema = VehicleCreate(**_vehicle_payload(status=VehicleStatus.RETIRED))
    with pytest.raises(ConflictError, match="Retired"):
        await svc.create_vehicle(schema)


@pytest.mark.asyncio
async def test_service_unretire_vehicle_rejected(async_session: AsyncSession) -> None:
    """Changing a Retired vehicle's status must raise ConflictError (SRS §10)."""
    from app.modules.vehicles.schemas import VehicleCreate, VehicleUpdate
    svc = VehicleService(async_session)

    # Create Available, then manually retire via repo
    schema = VehicleCreate(**_vehicle_payload())
    vehicle = await svc.create_vehicle(schema)
    await svc.repo.update(vehicle.id, {"status": VehicleStatus.RETIRED})

    patch = VehicleUpdate(status=VehicleStatus.AVAILABLE)
    with pytest.raises(ConflictError, match="un-retired"):
        await svc.update_vehicle(vehicle.id, patch)


@pytest.mark.asyncio
async def test_service_odometer_decrease_rejected(async_session: AsyncSession) -> None:
    """Decreasing the odometer reading must raise ConflictError (SRS §5.3)."""
    from app.modules.vehicles.schemas import VehicleCreate, VehicleUpdate
    svc = VehicleService(async_session)

    schema = VehicleCreate(**_vehicle_payload(odometer_km=500.0))
    vehicle = await svc.create_vehicle(schema)

    patch = VehicleUpdate(odometer_km=100.0)
    with pytest.raises(ConflictError, match="decrease"):
        await svc.update_vehicle(vehicle.id, patch)


@pytest.mark.asyncio
async def test_service_list_vehicles_pagination(async_session: AsyncSession) -> None:
    """list_vehicles() must return correct total and respect page/size."""
    from app.modules.vehicles.schemas import VehicleCreate
    svc = VehicleService(async_session)

    for i in range(5):
        schema = VehicleCreate(**_vehicle_payload(registration_number=f"PG-{i:04d}"))
        await svc.create_vehicle(schema)

    total, page1 = await svc.list_vehicles(page=1, size=3)
    assert total == 5
    assert len(page1) == 3

    _, page2 = await svc.list_vehicles(page=2, size=3)
    assert len(page2) == 2
