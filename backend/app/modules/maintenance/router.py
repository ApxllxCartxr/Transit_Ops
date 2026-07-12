import dataclasses

from fastapi import APIRouter, Depends

from app.auth.dependencies import require_roles
from app.modules.maintenance.service import MaintenanceService

router = APIRouter(prefix="/api/v1/maintenance", tags=["maintenance"])
service = MaintenanceService()

@router.post("/open", dependencies=[Depends(require_roles("Admin", "Fleet Manager"))])
async def open_maintenance(vehicle_id: str):
    return dataclasses.asdict(await service.open_maintenance(vehicle_id))


@router.post("/{maintenance_id}/close", dependencies=[Depends(require_roles("Admin", "Fleet Manager"))])
async def close_maintenance(maintenance_id: str):
    return dataclasses.asdict(await service.close_maintenance(maintenance_id))


