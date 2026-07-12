from datetime import date
from app.core.exceptions import ConflictError, NotFoundError
from app.modules.drivers.models import Driver
from app.modules.drivers.schemas import DriverCreate, DriverUpdate
from app.shared.enums import DriverStatus


class DriverService:
    def __init__(self, session):
        self.session = session

    async def create_driver(self, payload: DriverCreate) -> Driver:
        driver = Driver(**payload.model_dump())
        self.session.add(driver)
        await self.session.flush()
        return driver

    async def update_driver(self, driver_id: str, payload: DriverUpdate) -> Driver:
        driver = await self.get_driver(driver_id)
        if payload.status == DriverStatus.SUSPENDED and driver.status != DriverStatus.SUSPENDED:
            pass
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(driver, field, value)
        await self.session.flush()
        return driver

    async def get_driver(self, driver_id: str) -> Driver:
        driver = self.session.get(Driver, driver_id)
        if not driver:
            raise NotFoundError("Driver not found")
        return driver

    async def list_drivers(self, *, page: int, size: int, status: str | None = None):
        query = self.session.query(Driver)
        if status:
            query = query.filter(Driver.status == status)
        total = query.count()
        items = query.offset((page - 1) * size).limit(size).all()
        return total, items
