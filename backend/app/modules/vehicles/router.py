from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.auth.dependencies import require_roles
from app.modules.vehicles.schemas import VehicleCreate, VehicleListResponse, VehicleOut, VehicleUpdate
from app.modules.vehicles.service import VehicleService
from app.shared.enums import VehicleStatus

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

ALL_ROLES = ["Admin", "Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]


@router.get(
    "",
    response_model=VehicleListResponse,
    dependencies=[Depends(require_roles(*ALL_ROLES))],
)
async def list_vehicles(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: VehicleStatus | None = None,
    vehicle_type: str | None = None,
    region: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    total, items = await service.list_vehicles(
        page=page,
        size=size,
        status=status.value if status else None,
        vehicle_type=vehicle_type,
        region=region,
    )
    return VehicleListResponse(
        total=total,
        page=page,
        size=size,
        items=[VehicleOut.model_validate(item) for item in items],
    )


@router.post(
    "",
    response_model=VehicleOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("Admin", "Fleet Manager"))],
)
async def create_vehicle(payload: VehicleCreate, db: AsyncSession = Depends(get_db)):
    service = VehicleService(db)
    vehicle = await service.create_vehicle(payload)
    return VehicleOut.model_validate(vehicle)


@router.get(
    "/{vehicle_id}",
    response_model=VehicleOut,
    dependencies=[Depends(require_roles(*ALL_ROLES))],
)
async def get_vehicle(vehicle_id: str, db: AsyncSession = Depends(get_db)):
    service = VehicleService(db)
    vehicle = await service.get_vehicle(vehicle_id)
    return VehicleOut.model_validate(vehicle)


@router.patch(
    "/{vehicle_id}",
    response_model=VehicleOut,
    dependencies=[Depends(require_roles("Admin", "Fleet Manager"))],
)
async def update_vehicle(
    vehicle_id: str, payload: VehicleUpdate, db: AsyncSession = Depends(get_db)
):
    service = VehicleService(db)
    vehicle = await service.update_vehicle(vehicle_id, payload)
    return VehicleOut.model_validate(vehicle)


@router.delete(
    "/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("Admin"))],
)
async def delete_vehicle(vehicle_id: str, db: AsyncSession = Depends(get_db)):
    service = VehicleService(db)
    await service.delete_vehicle(vehicle_id)
