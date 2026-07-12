from fastapi import APIRouter

from app.operations.reports.service import ReportService

router = APIRouter()
service = ReportService()


@router.get("/")
def get_report(vehicle_count: int = 0, retired_count: int = 0, acquisition_cost: float = 0.0):
    return service.build_report(vehicle_count, retired_count, acquisition_cost)
