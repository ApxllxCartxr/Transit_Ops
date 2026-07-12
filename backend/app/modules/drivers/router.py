from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.auth.dependencies import require_roles, get_current_user
from app.auth.models import User
from app.modules.drivers.schemas import DriverCreate, DriverListResponse, DriverOut, DriverUpdate
from app.modules.drivers.service import DriverService
from app.shared.enums import DriverStatus

router = APIRouter(prefix="/drivers", tags=["drivers"])

ALL_ROLES = ["Admin", "Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]


def _to_out(driver, service: DriverService) -> DriverOut:
    """Convert ORM Driver → DriverOut, computing the expiry flag via the service."""
    return DriverOut.model_validate(
        {
            **{c.key: getattr(driver, c.key) for c in driver.__table__.columns},
            "is_license_expired": service.is_license_expired(driver),
        }
    )


@router.get(
    "",
    response_model=DriverListResponse,
    dependencies=[Depends(require_roles(*ALL_ROLES))],
)
async def list_drivers(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: DriverStatus | None = None,
    db: AsyncSession = Depends(get_db),
):
    service = DriverService(db)
    total, items = await service.list_drivers(
        page=page,
        size=size,
        status=status.value if status else None,
    )
    return DriverListResponse(
        total=total,
        page=page,
        size=size,
        items=[_to_out(item, service) for item in items],
    )


@router.post(
    "",
    response_model=DriverOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("Admin", "Safety Officer"))],
)
async def create_driver(payload: DriverCreate, db: AsyncSession = Depends(get_db)):
    service = DriverService(db)
    driver = await service.create_driver(payload)
    return _to_out(driver, service)


@router.get(
    "/{driver_id}",
    response_model=DriverOut,
    dependencies=[Depends(require_roles(*ALL_ROLES))],
)
async def get_driver(driver_id: str, db: AsyncSession = Depends(get_db)):
    service = DriverService(db)
    driver = await service.get_driver(driver_id)
    return _to_out(driver, service)


@router.patch(
    "/{driver_id}",
    response_model=DriverOut,
    dependencies=[Depends(require_roles("Admin", "Safety Officer"))],
)
async def update_driver(
    driver_id: str,
    payload: DriverUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = DriverService(db)
    driver = await service.update_driver(driver_id, payload, actor_id=current_user.id)
    return _to_out(driver, service)


@router.delete(
    "/{driver_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("Admin", "Safety Officer"))],
)
async def delete_driver(driver_id: str, db: AsyncSession = Depends(get_db)):
    service = DriverService(db)
    await service.delete_driver(driver_id)

