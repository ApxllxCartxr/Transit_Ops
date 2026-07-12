from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.modules.drivers.schemas import DriverCreate, DriverListResponse, DriverOut, DriverUpdate
from app.modules.drivers.service import DriverService
from app.shared.enums import DriverStatus

router = APIRouter(prefix="/drivers", tags=["drivers"])


def _to_out(driver, service: DriverService) -> DriverOut:
    """Convert ORM Driver → DriverOut, computing the expiry flag via the service."""
    return DriverOut.model_validate(
        {
            **{c.key: getattr(driver, c.key) for c in driver.__table__.columns},
            "is_license_expired": service.is_license_expired(driver),
        }
    )


@router.get("", response_model=DriverListResponse)
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


@router.post("", response_model=DriverOut, status_code=status.HTTP_201_CREATED)
async def create_driver(payload: DriverCreate, db: AsyncSession = Depends(get_db)):
    service = DriverService(db)
    driver = await service.create_driver(payload)
    return _to_out(driver, service)


@router.get("/{driver_id}", response_model=DriverOut)
async def get_driver(driver_id: str, db: AsyncSession = Depends(get_db)):
    service = DriverService(db)
    driver = await service.get_driver(driver_id)
    return _to_out(driver, service)


@router.patch("/{driver_id}", response_model=DriverOut)
async def update_driver(
    driver_id: str, payload: DriverUpdate, db: AsyncSession = Depends(get_db)
):
    service = DriverService(db)
    driver = await service.update_driver(driver_id, payload)
    return _to_out(driver, service)


@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_driver(driver_id: str, db: AsyncSession = Depends(get_db)):
    service = DriverService(db)
    await service.delete_driver(driver_id)
