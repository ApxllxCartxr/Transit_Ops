from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import require_roles
from app.modules.maintenance.schemas import (
    MaintenanceListResponse,
    MaintenanceOut,
    OpenMaintenanceRequest,
)
from app.modules.maintenance.service import MaintenanceService

router = APIRouter(prefix="/api/v1/maintenance", tags=["maintenance"])
service = MaintenanceService()

@router.get("", response_model=MaintenanceListResponse, dependencies=[Depends(require_roles("Admin", "Fleet Manager"))])
async def list_maintenance(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: str | None = None,
):
    total, items = await service.list_maintenances(page=page, size=size, status=status)
    return MaintenanceListResponse(
        total=total,
        page=page,
        size=size,
        items=[
            MaintenanceOut(
                id=item.id,
                vehicle_id=item.vehicle_id,
                vehicle_registration_number=(item.vehicle.registration_number if item.vehicle else None),
                vehicle_name=(item.vehicle.name if item.vehicle else None),
                status=item.status,
                vehicle_status=item.vehicle_status,
                opened_at=item.opened_at,
                closed_at=item.closed_at,
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
            for item in items
        ],
    )


@router.post("/open", response_model=MaintenanceOut, dependencies=[Depends(require_roles("Admin", "Fleet Manager"))])
async def open_maintenance(payload: OpenMaintenanceRequest):
    maintenance = await service.open_maintenance(payload.vehicle_id)
    return MaintenanceOut(
        id=maintenance.id,
        vehicle_id=maintenance.vehicle_id,
        status=maintenance.status,
        vehicle_status=maintenance.vehicle_status,
        opened_at=maintenance.opened_at,
        closed_at=maintenance.closed_at,
        created_at=maintenance.created_at,
        updated_at=maintenance.updated_at,
    )


@router.post("/{maintenance_id}/close", response_model=MaintenanceOut, dependencies=[Depends(require_roles("Admin", "Fleet Manager"))])
async def close_maintenance(maintenance_id: str):
    maintenance = await service.close_maintenance(maintenance_id)
    return MaintenanceOut(
        id=maintenance.id,
        vehicle_id=maintenance.vehicle_id,
        status=maintenance.status,
        vehicle_status=maintenance.vehicle_status,
        opened_at=maintenance.opened_at,
        closed_at=maintenance.closed_at,
        created_at=maintenance.created_at,
        updated_at=maintenance.updated_at,
    )


