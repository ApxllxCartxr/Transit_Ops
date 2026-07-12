from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/trips", tags=["trips"])


@router.post("/")
def create_trip(vehicle_id: str, driver_id: str, trip_id: str = "trip"):
    from app.modules.trips.service import TripService
    service = TripService()
    return service.create_trip(trip_id, vehicle_id, driver_id)


@router.post("/{trip_id}/dispatch")
def dispatch_trip(trip_id: str):
    from app.modules.trips.service import TripService
    service = TripService()
    return service.dispatch_trip(trip_id)


@router.post("/{trip_id}/complete")
def complete_trip(trip_id: str):
    from app.modules.trips.service import TripService
    service = TripService()
    return service.complete_trip(trip_id)


@router.post("/{trip_id}/cancel")
def cancel_trip(trip_id: str):
    from app.modules.trips.service import TripService
    service = TripService()
    return service.cancel_trip(trip_id)
