from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class TripCreate(BaseModel):
    vehicle_id: str
    driver_id: str
    status: Optional[str] = "Draft"

class TripOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    vehicle_id: str
    driver_id: str
    status: str
    cancelled: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    vehicle_name: Optional[str] = None
    registration_number: Optional[str] = None
    driver_name: Optional[str] = None

class PaginatedTrips(BaseModel):
    items: List[TripOut]
    total: int
    page: int
    size: int
