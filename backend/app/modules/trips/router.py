from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional

from app.auth.dependencies import require_roles
from app.modules.trips.service import TripService
from app.modules.trips.schemas import PaginatedTrips, TripCreate, TripOut

router = APIRouter(prefix="/api/v1/trips", tags=["trips"])

ALL_ROLES = ["Admin", "Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]


@router.get("/", response_model=PaginatedTrips, dependencies=[Depends(require_roles(*ALL_ROLES))])
async def get_trips(
    page: int = Query(1, ge=1),
    size: int = Query(15, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    service = TripService()
    return await service.list_trips(page=page, size=size, status=status, search=search)


@router.post("/", response_model=TripOut, dependencies=[Depends(require_roles("Admin", "Dispatcher"))])
async def create_trip(payload: TripCreate):
    service = TripService()
    try:
        return await service.create_trip(
            vehicle_id=payload.vehicle_id,
            driver_id=payload.driver_id,
            status=payload.status or "Draft"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{trip_id}/dispatch", response_model=TripOut, dependencies=[Depends(require_roles("Admin", "Dispatcher"))])
async def dispatch_trip(trip_id: str):
    service = TripService()
    try:
        return await service.dispatch_trip(trip_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{trip_id}/complete", response_model=TripOut, dependencies=[Depends(require_roles("Admin", "Dispatcher"))])
async def complete_trip(trip_id: str):
    service = TripService()
    try:
        return await service.complete_trip(trip_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{trip_id}/cancel", response_model=TripOut, dependencies=[Depends(require_roles("Admin", "Dispatcher"))])
async def cancel_trip(trip_id: str):
    service = TripService()
    try:
        return await service.cancel_trip(trip_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
