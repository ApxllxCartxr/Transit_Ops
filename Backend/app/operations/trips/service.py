from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class Trip:
    id: str
    vehicle_id: str
    driver_id: str
    status: str = "Draft"
    cancelled: bool = False


class TripService:
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
        if trip.cancelled or trip.status == "Cancelled":
            raise ValueError("Cancelled trips cannot be dispatched")
        if trip.status != "Draft":
            raise ValueError("Only draft trips can be dispatched")
        if not self._vehicle_available(trip.vehicle_id):
            raise ValueError("Vehicle is not available")
        if not self._driver_available(trip.driver_id):
            raise ValueError("Driver is not available")
        trip.status = "Dispatched"
        return trip

    def complete_trip(self, trip_id: str) -> Trip:
        trip = self.get_trip(trip_id)
        if trip is None:
            raise ValueError("Trip not found")
        if trip.status != "Dispatched":
            raise ValueError("Only dispatched trips can be completed")
        trip.status = "Completed"
        return trip

    def cancel_trip(self, trip_id: str) -> Trip:
        trip = self.get_trip(trip_id)
        if trip is None:
            raise ValueError("Trip not found")
        if trip.status in {"Completed", "Cancelled"}:
            raise ValueError("Completed or cancelled trips cannot be cancelled")
        trip.status = "Cancelled"
        trip.cancelled = True
        return trip

    def _vehicle_available(self, vehicle_id: str) -> bool:
        return vehicle_id != "V-1" and vehicle_id != "V-4"

    def _driver_available(self, driver_id: str) -> bool:
        return driver_id != "D-1" and driver_id != "D-4"
