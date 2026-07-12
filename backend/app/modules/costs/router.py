from fastapi import APIRouter

from app.modules.costs.service import CostService

router = APIRouter(prefix="/api/v1/costs", tags=["costs"])
service = CostService()


@router.get("/{vehicle_id}")
def get_costs(vehicle_id: str):
    return service.calculate_costs(vehicle_id)
