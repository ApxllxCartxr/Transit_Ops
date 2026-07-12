from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict

from app.shared.enums import DriverStatus


class DriverBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    license_number: str = Field(..., min_length=3, max_length=30)
    license_category: str = Field(..., min_length=1, max_length=10)
    license_expiry: date
    contact_number: str = Field(..., min_length=4, max_length=20)
    safety_score: int = Field(default=100, ge=0, le=100)
    status: DriverStatus = DriverStatus.AVAILABLE


class DriverCreate(DriverBase):
    pass


class DriverUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(None, min_length=2, max_length=120)
    license_number: str | None = Field(None, min_length=3, max_length=30)
    license_category: str | None = Field(None, min_length=1, max_length=10)
    license_expiry: date | None = None
    contact_number: str | None = Field(None, min_length=4, max_length=20)
    safety_score: int | None = Field(None, ge=0, le=100)
    status: DriverStatus | None = None


class DriverOut(DriverBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_license_expired: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


class DriverListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: list[DriverOut]
