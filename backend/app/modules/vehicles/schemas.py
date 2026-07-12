from datetime import date
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.shared.enums import VehicleStatus


class VehicleBase(BaseModel):
    registration_number: str = Field(..., min_length=2, max_length=20)
    name: str = Field(..., min_length=2, max_length=80)
    model: str = Field(..., min_length=2, max_length=80)
    vehicle_type: str = Field(..., min_length=2, max_length=40)
    max_load_kg: float = Field(..., gt=0)
    odometer_km: float = Field(default=0, ge=0)
    acquisition_cost: float = Field(..., ge=0)
    acquired_at: date
    status: VehicleStatus = VehicleStatus.AVAILABLE
    region: str | None = None

    @field_validator("registration_number")
    @classmethod
    def normalize_registration_number(cls, value: str) -> str:
        return value.upper()


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    registration_number: str | None = Field(None, min_length=2, max_length=20)
    name: str | None = Field(None, min_length=2, max_length=80)
    model: str | None = Field(None, min_length=2, max_length=80)
    vehicle_type: str | None = Field(None, min_length=2, max_length=40)
    max_load_kg: float | None = Field(None, gt=0)
    odometer_km: float | None = Field(None, ge=0)
    acquisition_cost: float | None = Field(None, ge=0)
    acquired_at: date | None = None
    status: VehicleStatus | None = None
    region: str | None = None


class VehicleOut(VehicleBase):
    id: str
    created_at: str | None = None
    updated_at: str | None = None


class VehicleListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: list[VehicleOut]
