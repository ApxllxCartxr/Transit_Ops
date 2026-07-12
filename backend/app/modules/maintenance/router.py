from fastapi import APIRouter

from app.modules.maintenance.service import MaintenanceService

router = APIRouter(prefix="/api/v1/maintenance", tags=["maintenance"])
service = MaintenanceService()


@router.post("/open")
async def open_maintenance(vehicle_id: str):
    return await service.open_maintenance(vehicle_id)


@router.post("/{maintenance_id}/close")
async def close_maintenance(maintenance_id: str):
    return await service.close_maintenance(maintenance_id)
