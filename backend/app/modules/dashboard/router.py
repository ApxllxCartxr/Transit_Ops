from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/kpis")
def get_kpis():
    """Dashboard KPI summary — placeholder values until real aggregations are wired."""
    return {
        "fleet_utilization": 0.75,
        "operational_cost": 1200.0,
        "maintenance_open": 2,
    }
