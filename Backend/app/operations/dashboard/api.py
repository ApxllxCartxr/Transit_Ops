from fastapi import APIRouter

router = APIRouter()


@router.get("/kpis")
def get_kpis():
    return {
        "fleet_utilization": 0.75,
        "operational_cost": 1200.0,
        "maintenance_open": 2,
    }
