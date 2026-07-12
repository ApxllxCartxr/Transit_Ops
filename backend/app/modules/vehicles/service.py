from datetime import date
from app.core.exceptions import ConflictError, NotFoundError, PermissionDeniedError
from app.modules.vehicles.models import Vehicle
from app.modules.vehicles.schemas import VehicleCreate, VehicleUpdate
from app.shared.enums import VehicleStatus


class VehicleService:
    def __init__(self, session):
        self.session = session

    async def create_vehicle(self, payload: VehicleCreate) -> Vehicle:
        if payload.status == VehicleStatus.RETIRED:
            raise ConflictError("Retired vehicles must be created explicitly")
        vehicle = Vehicle(**payload.model_dump())
        self.session.add(vehicle)
        await self.session.flush()
        return vehicle

    async def update_vehicle(self, vehicle_id: str, payload: VehicleUpdate) -> Vehicle:
        vehicle = await self.get_vehicle(vehicle_id)
        if vehicle.status == VehicleStatus.RETIRED and payload.status != VehicleStatus.RETIRED:
            raise ConflictError("Retired vehicles cannot be un-retired")
        if payload.odometer_km is not None and payload.odometer_km < float(vehicle.odometer_km):
            raise ConflictError("Odometer cannot decrease")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(vehicle, field, value)
        await self.session.flush()
        return vehicle

    async def get_vehicle(self, vehicle_id: str) -> Vehicle:
        vehicle = self.session.get(Vehicle, vehicle_id)
        if not vehicle:
            raise NotFoundError("Vehicle not found")
        return vehicle

    async def list_vehicles(self, *, page: int, size: int, status: str | None = None, vehicle_type: str | None = None, region: str | None = None):
        query = self.session.query(Vehicle)
        if status:
            query = query.filter(Vehicle.status == status)
        if vehicle_type:
            query = query.filter(Vehicle.vehicle_type == vehicle_type)
        if region:
            query = query.filter(Vehicle.region == region)
        total = query.count()
        items = query.offset((page - 1) * size).limit(size).all()
        return total, items
