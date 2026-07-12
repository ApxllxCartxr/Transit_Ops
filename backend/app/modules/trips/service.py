from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from app.shared.enums import TripStatus


@dataclass
class Trip:
    id: str
    vehicle_id: str
    driver_id: str
    status: str = TripStatus.DRAFT
    cancelled: bool = False


class TripService:
    """
    In-memory trip service from BE2 (feat/backend-ops-analytics).
    Business rules:
    - Only Draft trips can be dispatched.
    - Cancelled trips cannot be dispatched.
    - Only Dispatched trips can be completed.
    - Completed or Cancelled trips cannot be cancelled.
    - Dispatching requires vehicle and driver to be available.
    """

    _trips: Dict[str, Trip] = {}

    def create_trip(self, trip_id: str, vehicle_id: str, driver_id: str) -> Trip:
        trip = Trip(id=trip_id, vehicle_id=vehicle_id, driver_id=driver_id)
        self._trips[trip_id] = trip
        return trip

    def get_trip(self, trip_id: str) -> Optional[Trip]:
        return self._trips.get(trip_id)

    def dispatch_trip(self, trip_id: str) -> Trip:
        trip = self.get_trip(trip_id)
        if trip is None:
            raise ValueError("Trip not found")
        if trip.cancelled or trip.status == TripStatus.CANCELLED:
            raise ValueError("Cancelled trips cannot be dispatched")
        if trip.status != TripStatus.DRAFT:
            raise ValueError("Only draft trips can be dispatched")
        if not self._vehicle_available(trip.vehicle_id):
            raise ValueError("Vehicle is not available")
        if not self._driver_available(trip.driver_id):
            raise ValueError("Driver is not available")
        trip.status = TripStatus.DISPATCHED
        return trip

    def complete_trip(self, trip_id: str) -> Trip:
        trip = self.get_trip(trip_id)
        if trip is None:
            raise ValueError("Trip not found")
        if trip.status != TripStatus.DISPATCHED:
            raise ValueError("Only dispatched trips can be completed")
        trip.status = TripStatus.COMPLETED
        return trip

    def cancel_trip(self, trip_id: str) -> Trip:
        trip = self.get_trip(trip_id)
        if trip is None:
            raise ValueError("Trip not found")
        if trip.status in {TripStatus.COMPLETED, TripStatus.CANCELLED}:
            raise ValueError("Completed or cancelled trips cannot be cancelled")
        trip.status = TripStatus.CANCELLED
        trip.cancelled = True
        return trip

    def _vehicle_available(self, vehicle_id: str) -> bool:
        # Placeholder — real impl checks DB vehicle status
        return vehicle_id not in ("V-1", "V-4")

    def _driver_available(self, driver_id: str) -> bool:
        # Placeholder — real impl checks DB driver status
        return driver_id not in ("D-1", "D-4")
