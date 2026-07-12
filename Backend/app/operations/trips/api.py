from fastapi import APIRouter

from app.operations.trips.service import TripService

router = APIRouter()
service = TripService()


@router.post("/")
def create_trip(vehicle_id: str, driver_id: str, trip_id: str = "trip"):
    return service.create_trip(trip_id, vehicle_id, driver_id)


@router.post("/{trip_id}/dispatch")
def dispatch_trip(trip_id: str):
    return service.dispatch_trip(trip_id)
