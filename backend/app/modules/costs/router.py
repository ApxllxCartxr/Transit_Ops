from fastapi import APIRouter, Depends

from app.auth.dependencies import require_roles
from app.modules.costs.service import CostService

router = APIRouter(
    prefix="/api/v1/costs",
    tags=["costs"],
)
service = CostService()


@router.get("/{vehicle_id}", dependencies=[Depends(require_roles("Admin", "Financial Analyst", "Fleet Manager"))])
async def get_costs(vehicle_id: str):
    return service.calculate_costs(vehicle_id)


