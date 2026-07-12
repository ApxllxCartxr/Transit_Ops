from fastapi import APIRouter, Depends

from app.auth.dependencies import require_roles

router = APIRouter(prefix="/api/v1/trips", tags=["trips"])

ALL_ROLES = ["Admin", "Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]


@router.post("/", dependencies=[Depends(require_roles("Admin", "Dispatcher"))])
def create_trip(vehicle_id: str, driver_id: str, trip_id: str = "trip"):
    from app.modules.trips.service import TripService
    service = TripService()
    return service.create_trip(trip_id, vehicle_id, driver_id)


@router.post("/{trip_id}/dispatch", dependencies=[Depends(require_roles("Admin", "Dispatcher"))])
def dispatch_trip(trip_id: str):
    from app.modules.trips.service import TripService
    service = TripService()
    return service.dispatch_trip(trip_id)


@router.post("/{trip_id}/complete", dependencies=[Depends(require_roles("Admin", "Dispatcher"))])
def complete_trip(trip_id: str):
    from app.modules.trips.service import TripService
    service = TripService()
    return service.complete_trip(trip_id)


@router.post("/{trip_id}/cancel", dependencies=[Depends(require_roles("Admin", "Dispatcher"))])
def cancel_trip(trip_id: str):
    from app.modules.trips.service import TripService
    service = TripService()
    return service.cancel_trip(trip_id)
