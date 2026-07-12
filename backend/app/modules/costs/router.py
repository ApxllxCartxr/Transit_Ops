from datetime import date

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import require_roles
from app.modules.costs.schemas import CostDetails
from app.modules.costs.service import CostService

router = APIRouter(
    prefix="/api/v1/costs",
    tags=["costs"],
)
service = CostService()


@router.get("/{vehicle_id}", response_model=CostDetails, dependencies=[Depends(require_roles("Admin", "Financial Analyst", "Fleet Manager"))])
async def get_costs(
    vehicle_id: str,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
):
    return service.calculate_costs(vehicle_id, start_date=start_date, end_date=end_date)


