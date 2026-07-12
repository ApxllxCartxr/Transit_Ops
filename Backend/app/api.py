from fastapi import APIRouter

from app.operations.trips.api import router as trips_router
from app.operations.maintenance.api import router as maintenance_router
from app.operations.costs.api import router as costs_router
from app.operations.reports.api import router as reports_router
from app.operations.dashboard.api import router as dashboard_router
from app.operations.exports.api import router as exports_router

router = APIRouter()
router.include_router(trips_router, prefix="/trips", tags=["trips"])
router.include_router(maintenance_router, prefix="/maintenance", tags=["maintenance"])
router.include_router(costs_router, prefix="/costs", tags=["costs"])
router.include_router(reports_router, prefix="/reports", tags=["reports"])
router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
router.include_router(exports_router, prefix="/exports", tags=["exports"])
