"""
test_drivers_async.py

Regression tests to catch sync SQLAlchemy 1.x calls (session.query,
session.get, .count(), .all()) accidentally used on an AsyncSession in
DriverRepository or DriverService.

Uses an in-memory async SQLite database — no Postgres required in CI.
Every test awaits real DB operations end-to-end — nothing is mocked.

If DriverRepository or DriverService ever regresses to sync calls, these
tests will raise:
    sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from datetime import date, timedelta

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.db import Base

# Register all models with Base.metadata
from app.auth.models import User, Role, UserRole  # noqa: F401
from app.modules.vehicles.models import Vehicle  # noqa: F401
from app.modules.drivers.models import Driver  # noqa: F401

from app.modules.drivers.repository import DriverRepository
from app.modules.drivers.service import DriverService
from app.shared.enums import DriverStatus
from app.core.exceptions import ConflictError, NotFoundError

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


# ---------------------------------------------------------------------------
# Async session fixture — fresh DB per test function
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture(scope="function")
async def async_session() -> AsyncSession:
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _driver_payload(**overrides) -> dict:
    future = date.today() + timedelta(days=365)
    base = dict(
        full_name="Jane Driver",
        license_number="DL-001",
        license_category="C",
        license_expiry=future,
        contact_number="+1-555-0001",
        safety_score=95,
        status=DriverStatus.AVAILABLE,
    )
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# DriverRepository — async correctness tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_repository_create_and_get(async_session: AsyncSession) -> None:
    """create() and get() must both be fully awaitable."""
    import uuid
    repo = DriverRepository(async_session)
    payload = _driver_payload()
    payload["id"] = str(uuid.uuid4())

    created = await repo.create(payload)
    assert created.id == payload["id"]
    assert created.license_number == "DL-001"

    fetched = await repo.get(created.id)
    assert fetched.id == created.id


@pytest.mark.asyncio
async def test_repository_list_total_and_items(async_session: AsyncSession) -> None:
    """list() must use async count subquery — not sync .count()."""
    import uuid
    repo = DriverRepository(async_session)

    for i in range(4):
        p = _driver_payload(license_number=f"DL-{i:03d}")
        p["id"] = str(uuid.uuid4())
        await repo.create(p)

    total, items = await repo.list(page=1, size=10)
    assert total == 4
    assert len(items) == 4


@pytest.mark.asyncio
async def test_repository_list_filter_by_status(async_session: AsyncSession) -> None:
    """Filter by status must work correctly via async WHERE."""
    import uuid
    repo = DriverRepository(async_session)

    p1 = _driver_payload(license_number="DL-F01", status=DriverStatus.AVAILABLE)
    p1["id"] = str(uuid.uuid4())
    await repo.create(p1)

    p2 = _driver_payload(license_number="DL-F02", status=DriverStatus.SUSPENDED)
    p2["id"] = str(uuid.uuid4())
    await repo.create(p2)

    total, items = await repo.list(status=DriverStatus.AVAILABLE)
    assert total == 1
    assert items[0].license_number == "DL-F01"


@pytest.mark.asyncio
async def test_repository_pagination(async_session: AsyncSession) -> None:
    """Page/size must be respected in async offset/limit."""
    import uuid
    repo = DriverRepository(async_session)

    for i in range(5):
        p = _driver_payload(license_number=f"DL-P{i:02d}")
        p["id"] = str(uuid.uuid4())
        await repo.create(p)

    total, page1 = await repo.list(page=1, size=3)
    assert total == 5
    assert len(page1) == 3

    _, page2 = await repo.list(page=2, size=3)
    assert len(page2) == 2


@pytest.mark.asyncio
async def test_repository_get_raises_not_found(async_session: AsyncSession) -> None:
    """get() on a missing ID must raise NotFoundError, not AttributeError."""
    repo = DriverRepository(async_session)
    with pytest.raises(NotFoundError):
        await repo.get("does-not-exist")


@pytest.mark.asyncio
async def test_repository_update(async_session: AsyncSession) -> None:
    """update() must persist via async flush."""
    import uuid
    repo = DriverRepository(async_session)
    payload = _driver_payload()
    payload["id"] = str(uuid.uuid4())
    created = await repo.create(payload)

    updated = await repo.update(created.id, {"full_name": "Updated Driver"})
    assert updated.full_name == "Updated Driver"

    refetched = await repo.get(created.id)
    assert refetched.full_name == "Updated Driver"


@pytest.mark.asyncio
async def test_repository_soft_delete_hides_record(async_session: AsyncSession) -> None:
    """soft_delete() sets deleted_at; subsequent get() must raise NotFoundError."""
    import uuid
    repo = DriverRepository(async_session)
    payload = _driver_payload()
    payload["id"] = str(uuid.uuid4())
    created = await repo.create(payload)

    await repo.soft_delete(created.id)

    with pytest.raises(NotFoundError):
        await repo.get(created.id)


@pytest.mark.asyncio
async def test_soft_deleted_driver_excluded_from_list(async_session: AsyncSession) -> None:
    """Soft-deleted drivers must not appear in list() results."""
    import uuid
    repo = DriverRepository(async_session)

    p1 = _driver_payload(license_number="DL-DEL1")
    p1["id"] = str(uuid.uuid4())
    d1 = await repo.create(p1)

    p2 = _driver_payload(license_number="DL-DEL2")
    p2["id"] = str(uuid.uuid4())
    await repo.create(p2)

    await repo.soft_delete(d1.id)

    total, items = await repo.list()
    assert total == 1
    assert items[0].license_number == "DL-DEL2"


# ---------------------------------------------------------------------------
# DriverService — business rule tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_service_create_driver(async_session: AsyncSession) -> None:
    """Service must generate a UUID and delegate to repository."""
    from app.modules.drivers.schemas import DriverCreate
    svc = DriverService(async_session)
    schema = DriverCreate(**_driver_payload())
    driver = await svc.create_driver(schema)
    assert driver.id  # UUID was generated
    assert driver.license_number == "DL-001"


@pytest.mark.asyncio
async def test_service_suspended_driver_cannot_go_on_trip(async_session: AsyncSession) -> None:
    """Business rule: Suspended → OnTrip transition must raise ConflictError."""
    from app.modules.drivers.schemas import DriverCreate, DriverUpdate
    svc = DriverService(async_session)

    schema = DriverCreate(**_driver_payload())
    driver = await svc.create_driver(schema)

    # Suspend the driver first via repo
    await svc.repo.update(driver.id, {"status": DriverStatus.SUSPENDED})

    patch = DriverUpdate(status=DriverStatus.ON_TRIP)
    with pytest.raises(ConflictError, match="Suspended"):
        await svc.update_driver(driver.id, patch)


@pytest.mark.asyncio
async def test_service_is_license_expired_flag_future(async_session: AsyncSession) -> None:
    """is_license_expired() must return False for a future expiry date."""
    from app.modules.drivers.schemas import DriverCreate
    svc = DriverService(async_session)
    future_expiry = date.today() + timedelta(days=100)
    schema = DriverCreate(**_driver_payload(license_expiry=future_expiry))
    driver = await svc.create_driver(schema)
    assert DriverService.is_license_expired(driver) is False


@pytest.mark.asyncio
async def test_service_is_license_expired_flag_past(async_session: AsyncSession) -> None:
    """is_license_expired() must return True for a past expiry date."""
    from app.modules.drivers.schemas import DriverCreate
    svc = DriverService(async_session)
    past_expiry = date.today() - timedelta(days=1)
    schema = DriverCreate(**_driver_payload(license_expiry=past_expiry))
    driver = await svc.create_driver(schema)
    assert DriverService.is_license_expired(driver) is True


@pytest.mark.asyncio
async def test_service_list_drivers(async_session: AsyncSession) -> None:
    """list_drivers() must delegate to repo and return correct total."""
    from app.modules.drivers.schemas import DriverCreate
    svc = DriverService(async_session)

    for i in range(3):
        schema = DriverCreate(**_driver_payload(license_number=f"DL-SVC{i}"))
        await svc.create_driver(schema)

    total, items = await svc.list_drivers(page=1, size=10)
    assert total == 3
    assert len(items) == 3


@pytest.mark.asyncio
async def test_service_delete_driver(async_session: AsyncSession) -> None:
    """delete_driver() must soft-delete so subsequent get raises NotFoundError."""
    from app.modules.drivers.schemas import DriverCreate
    svc = DriverService(async_session)
    schema = DriverCreate(**_driver_payload())
    driver = await svc.create_driver(schema)

    await svc.delete_driver(driver.id)

    with pytest.raises(NotFoundError):
        await svc.get_driver(driver.id)
