from fastapi import APIRouter, Depends

from app.auth.dependencies import require_roles
from app.modules.reports.service import ReportService

router = APIRouter(
    prefix="/api/v1/reports",
    tags=["reports"],
    dependencies=[Depends(require_roles("Admin", "Financial Analyst", "Fleet Manager"))],
)
service = ReportService()


@router.get("/")
async def get_report(acquisition_cost: float = 0.0):
    return await service.build_report(acquisition_cost)
