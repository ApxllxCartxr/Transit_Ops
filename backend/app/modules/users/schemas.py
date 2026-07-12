from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    is_active: bool
    roles: list[str]
    last_login_at: datetime | str | None = None
    created_at: datetime | str | None = None


class UserListResponse(BaseModel):
    total: int
    page: int
    size: int
    items: list[UserOut]


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)
    roles: list[str] = Field(default_factory=lambda: ["Fleet Manager"])
    is_active: bool = True


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=120)
    is_active: bool | None = None
    roles: list[str] | None = None
