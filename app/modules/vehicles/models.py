from sqlalchemy import Date, Numeric, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.db import Base
from app.shared.enums import VehicleStatus


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    registration_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(40), nullable=False)
    max_load_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    odometer_km: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    acquisition_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    acquired_at: Mapped[str] = mapped_column(Date, nullable=False)
    status: Mapped[VehicleStatus] = mapped_column(default=VehicleStatus.AVAILABLE, nullable=False)
    region: Mapped[str | None] = mapped_column(String(60), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])
