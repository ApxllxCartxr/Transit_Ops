from fastapi import APIRouter, Depends

from app.auth.dependencies import require_roles

ALL_ROLES = ["Admin", "Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]

router = APIRouter(
    prefix="/api/v1/dashboard",
    tags=["dashboard"],
)


@router.get("/kpis", dependencies=[Depends(require_roles(*ALL_ROLES))])
async def get_kpis():
    """Dashboard KPI summary — placeholder values until real aggregations are wired."""
    return {
        "fleet_utilization": 0.75,
        "operational_cost": 1200.0,
        "maintenance_open": 2,
    }


