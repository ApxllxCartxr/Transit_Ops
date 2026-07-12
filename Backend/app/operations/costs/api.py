from fastapi import APIRouter

from app.operations.costs.service import CostService

router = APIRouter()
service = CostService()


@router.get("/{vehicle_id}")
def get_costs(vehicle_id: str):
    return service.calculate_costs(vehicle_id)
