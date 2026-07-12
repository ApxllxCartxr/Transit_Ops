from fastapi import APIRouter

from app.operations.maintenance.service import MaintenanceService

router = APIRouter()
service = MaintenanceService()


@router.post("/open")
def open_maintenance(vehicle_id: str):
    return service.open_maintenance(vehicle_id)


@router.post("/{maintenance_id}/close")
def close_maintenance(maintenance_id: str):
    return service.close_maintenance(maintenance_id)
