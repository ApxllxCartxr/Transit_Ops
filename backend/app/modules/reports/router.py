from fastapi import APIRouter

from app.modules.reports.service import ReportService

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])
service = ReportService()


@router.get("/")
def get_report(
    vehicle_count: int = 0,
    retired_count: int = 0,
    acquisition_cost: float = 0.0,
):
    return service.build_report(vehicle_count, retired_count, acquisition_cost)
