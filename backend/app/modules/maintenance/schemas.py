from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OpenMaintenanceRequest(BaseModel):
    vehicle_id: str


class MaintenanceOut(BaseModel):
    id: str
    vehicle_id: str
    vehicle_registration_number: str | None = None
    vehicle_name: str | None = None
    status: str
    vehicle_status: str
    opened_at: datetime
    closed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class MaintenanceListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: list[MaintenanceOut]
