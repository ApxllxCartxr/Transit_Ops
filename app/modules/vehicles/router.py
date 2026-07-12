from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.modules.vehicles.schemas import VehicleCreate, VehicleListResponse, VehicleOut, VehicleUpdate
from app.modules.vehicles.service import VehicleService
from app.shared.enums import VehicleStatus

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("", response_model=VehicleListResponse)
async def list_vehicles(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: VehicleStatus | None = None,
    vehicle_type: str | None = None,
    region: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    service = VehicleService(db)
    total, items = await service.list_vehicles(page=page, size=size, status=status.value if status else None, vehicle_type=vehicle_type, region=region)
    return VehicleListResponse(total=total, page=page, size=size, items=[VehicleOut.model_validate(item) for item in items])


@router.post("", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
async def create_vehicle(payload: VehicleCreate, db: AsyncSession = Depends(get_db)):
    service = VehicleService(db)
    vehicle = await service.create_vehicle(payload)
    return VehicleOut.model_validate(vehicle)


@router.get("/{vehicle_id}", response_model=VehicleOut)
async def get_vehicle(vehicle_id: str, db: AsyncSession = Depends(get_db)):
    service = VehicleService(db)
    vehicle = await service.get_vehicle(vehicle_id)
    return VehicleOut.model_validate(vehicle)


@router.patch("/{vehicle_id}", response_model=VehicleOut)
async def update_vehicle(vehicle_id: str, payload: VehicleUpdate, db: AsyncSession = Depends(get_db)):
    service = VehicleService(db)
    vehicle = await service.update_vehicle(vehicle_id, payload)
    return VehicleOut.model_validate(vehicle)
