from fastapi import APIRouter, Depends

from app.auth.dependencies import require_roles
from app.modules.reports.service import ReportService

router = APIRouter(
    prefix="/api/v1/reports",
    tags=["reports"],
)
service = ReportService()


@router.get("/", dependencies=[Depends(require_roles("Admin", "Financial Analyst", "Fleet Manager"))])
async def get_report(
    vehicle_count: int = 0,
    retired_count: int = 0,
    acquisition_cost: float = 0.0,
):
    return service.build_report(vehicle_count, retired_count, acquisition_cost)


