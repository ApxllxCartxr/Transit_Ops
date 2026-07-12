from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload

from app.core.db import AsyncSessionLocal
from app.modules.trips.models import Trip
from app.modules.vehicles.models import Vehicle
from app.modules.drivers.models import Driver
from app.shared.enums import TripStatus, VehicleStatus, DriverStatus


class TripService:
    """Real PostgreSQL trip service handling dispatch, completion, and cancellation workflows."""

    async def list_trips(
        self,
        page: int = 1,
        size: int = 15,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> dict[str, Any]:
        async with AsyncSessionLocal() as session:
            query = select(Trip).options(
                selectinload(Trip.vehicle),
                selectinload(Trip.driver),
            )
            count_query = select(func.count()).select_from(Trip)

            if status and status.lower() != "all":
                query = query.where(func.lower(Trip.status) == status.lower())
                count_query = count_query.where(func.lower(Trip.status) == status.lower())

            total = await session.scalar(count_query) or 0

            query = query.order_by(Trip.created_at.desc()).offset((page - 1) * size).limit(size)
            result = await session.execute(query)
            trips = result.scalars().all()

            items = []
            for t in trips:
                items.append({
                    "id": t.id,
                    "vehicle_id": t.vehicle_id,
                    "driver_id": t.driver_id,
                    "status": t.status,
                    "cancelled": t.cancelled,
                    "created_at": t.created_at,
                    "updated_at": t.updated_at,
                    "vehicle_name": t.vehicle.name if t.vehicle else "Unassigned",
                    "registration_number": t.vehicle.registration_number if t.vehicle else "N/A",
                    "driver_name": t.driver.full_name if t.driver else "Unassigned",
                })

            return {
                "items": items,
                "total": total,
                "page": page,
                "size": size,
            }

    async def create_trip(self, vehicle_id: str, driver_id: str, trip_id: Optional[str] = None, status: str = "Draft") -> dict[str, Any]:
        async with AsyncSessionLocal() as session:
            # Verify vehicle
            vehicle = await session.get(Vehicle, vehicle_id)
            if not vehicle:
                raise ValueError("Specified vehicle does not exist.")
            
            # Verify driver
            driver = await session.get(Driver, driver_id)
            if not driver:
                raise ValueError("Specified driver does not exist.")

            new_id = trip_id if trip_id and trip_id != "trip" else str(uuid.uuid4())
            trip = Trip(
                id=new_id,
                vehicle_id=vehicle_id,
                driver_id=driver_id,
                status=status,
                cancelled=False,
            )
            session.add(trip)

            # If created straight to Dispatched, update vehicle/driver status
            if status == TripStatus.DISPATCHED:
                vehicle.status = VehicleStatus.ON_TRIP
                driver.status = DriverStatus.ON_TRIP

            await session.commit()
            await session.refresh(trip)

            return {
                "id": trip.id,
                "vehicle_id": trip.vehicle_id,
                "driver_id": trip.driver_id,
                "status": trip.status,
                "cancelled": trip.cancelled,
                "created_at": trip.created_at,
                "updated_at": trip.updated_at,
                "vehicle_name": vehicle.name,
                "registration_number": vehicle.registration_number,
                "driver_name": driver.full_name,
            }

    async def get_trip(self, trip_id: str) -> Optional[Trip]:
        async with AsyncSessionLocal() as session:
            query = select(Trip).options(
                selectinload(Trip.vehicle),
                selectinload(Trip.driver),
            ).where(Trip.id == trip_id)
            result = await session.execute(query)
            return result.scalar_one_or_none()

    async def dispatch_trip(self, trip_id: str) -> dict[str, Any]:
        async with AsyncSessionLocal() as session:
            query = select(Trip).options(
                selectinload(Trip.vehicle),
                selectinload(Trip.driver),
            ).where(Trip.id == trip_id)
            result = await session.execute(query)
            trip = result.scalar_one_or_none()

            if trip is None:
                raise ValueError("Trip not found.")
            if trip.cancelled or trip.status == TripStatus.CANCELLED:
                raise ValueError("Cancelled trips cannot be dispatched.")
            if trip.status != TripStatus.DRAFT:
                raise ValueError("Only draft trips can be dispatched.")
            
            if trip.vehicle and trip.vehicle.status != VehicleStatus.AVAILABLE:
                raise ValueError(f"Vehicle ({trip.vehicle.registration_number}) is not available.")
            if trip.driver and trip.driver.status != DriverStatus.AVAILABLE:
                raise ValueError(f"Driver ({trip.driver.full_name}) is not available.")

            trip.status = TripStatus.DISPATCHED
            if trip.vehicle:
                trip.vehicle.status = VehicleStatus.ON_TRIP
            if trip.driver:
                trip.driver.status = DriverStatus.ON_TRIP

            await session.commit()
            return {
                "id": trip.id,
                "vehicle_id": trip.vehicle_id,
                "driver_id": trip.driver_id,
                "status": trip.status,
                "cancelled": trip.cancelled,
                "vehicle_name": trip.vehicle.name if trip.vehicle else None,
                "registration_number": trip.vehicle.registration_number if trip.vehicle else None,
                "driver_name": trip.driver.full_name if trip.driver else None,
            }

    async def complete_trip(self, trip_id: str) -> dict[str, Any]:
        async with AsyncSessionLocal() as session:
            query = select(Trip).options(
                selectinload(Trip.vehicle),
                selectinload(Trip.driver),
            ).where(Trip.id == trip_id)
            result = await session.execute(query)
            trip = result.scalar_one_or_none()

            if trip is None:
                raise ValueError("Trip not found.")
            if trip.status != TripStatus.DISPATCHED:
                raise ValueError("Only dispatched trips can be completed.")

            trip.status = TripStatus.COMPLETED
            if trip.vehicle and trip.vehicle.status == VehicleStatus.ON_TRIP:
                trip.vehicle.status = VehicleStatus.AVAILABLE
            if trip.driver and trip.driver.status == DriverStatus.ON_TRIP:
                trip.driver.status = DriverStatus.AVAILABLE

            await session.commit()
            return {
                "id": trip.id,
                "vehicle_id": trip.vehicle_id,
                "driver_id": trip.driver_id,
                "status": trip.status,
                "cancelled": trip.cancelled,
                "vehicle_name": trip.vehicle.name if trip.vehicle else None,
                "registration_number": trip.vehicle.registration_number if trip.vehicle else None,
                "driver_name": trip.driver.full_name if trip.driver else None,
            }

    async def cancel_trip(self, trip_id: str) -> dict[str, Any]:
        async with AsyncSessionLocal() as session:
            query = select(Trip).options(
                selectinload(Trip.vehicle),
                selectinload(Trip.driver),
            ).where(Trip.id == trip_id)
            result = await session.execute(query)
            trip = result.scalar_one_or_none()

            if trip is None:
                raise ValueError("Trip not found.")
            if trip.status in {TripStatus.COMPLETED, TripStatus.CANCELLED}:
                raise ValueError("Completed or cancelled trips cannot be cancelled.")

            was_dispatched = (trip.status == TripStatus.DISPATCHED)
            trip.status = TripStatus.CANCELLED
            trip.cancelled = True

            if was_dispatched:
                if trip.vehicle and trip.vehicle.status == VehicleStatus.ON_TRIP:
                    trip.vehicle.status = VehicleStatus.AVAILABLE
                if trip.driver and trip.driver.status == DriverStatus.ON_TRIP:
                    trip.driver.status = DriverStatus.AVAILABLE

            await session.commit()
            return {
                "id": trip.id,
                "vehicle_id": trip.vehicle_id,
                "driver_id": trip.driver_id,
                "status": trip.status,
                "cancelled": trip.cancelled,
                "vehicle_name": trip.vehicle.name if trip.vehicle else None,
                "registration_number": trip.vehicle.registration_number if trip.vehicle else None,
                "driver_name": trip.driver.full_name if trip.driver else None,
            }
