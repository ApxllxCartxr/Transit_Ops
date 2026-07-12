from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import require_roles
from app.modules.reports.analytics import AnalyticsService

ALL_ROLES = ["Admin", "Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]

router = APIRouter(
    prefix="/api/v1/dashboard",
    tags=["dashboard"],
)
analytics_service = AnalyticsService()


@router.get("/kpis", dependencies=[Depends(require_roles(*ALL_ROLES))])
async def get_kpis(
    vehicle_type: str | None = Query(None, alias="type"),
    vehicle_status: str | None = Query(None, alias="status"),
    region: str | None = None,
):
    return await analytics_service.get_dashboard_kpis(
        vehicle_type=vehicle_type,
        vehicle_status=vehicle_status,
        region=region,
    )
