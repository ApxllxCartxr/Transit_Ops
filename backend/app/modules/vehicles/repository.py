from app.core.exceptions import NotFoundError
from app.modules.vehicles.models import Vehicle
from app.shared.enums import VehicleStatus


class VehicleRepository:
    def __init__(self, session):
        self.session = session

    async def list(self, *, page: int = 1, size: int = 20, status: str | None = None, vehicle_type: str | None = None, region: str | None = None):
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

    async def get(self, vehicle_id: str) -> Vehicle:
        vehicle = self.session.get(Vehicle, vehicle_id)
        if not vehicle:
            raise NotFoundError("Vehicle not found")
        return vehicle

    async def create(self, data: dict) -> Vehicle:
        vehicle = Vehicle(**data)
        self.session.add(vehicle)
        await self.session.flush()
        return vehicle

    async def update(self, vehicle_id: str, data: dict) -> Vehicle:
        vehicle = await self.get(vehicle_id)
        for key, value in data.items():
            setattr(vehicle, key, value)
        await self.session.flush()
        return vehicle

    async def soft_delete(self, vehicle_id: str) -> Vehicle:
        vehicle = await self.get(vehicle_id)
        vehicle.deleted_at = None
        await self.session.flush()
        return vehicle
