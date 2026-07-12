from sqlalchemy import (
    CheckConstraint,
    Date,
    Index,
    Numeric,
    String,
    TIMESTAMP,
    ForeignKey,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.db import Base
from app.shared.enums import VehicleStatus


class Vehicle(Base):
    """Vehicle entity — SRS §7.4.3."""

    __tablename__ = "vehicles"

    __table_args__ = (
        # SRS §7.4.3 CHECK constraints
        CheckConstraint("max_load_kg > 0", name="ck_vehicles_max_load_kg_positive"),
        CheckConstraint("odometer_km >= 0", name="ck_vehicles_odometer_km_nonneg"),
        CheckConstraint("acquisition_cost >= 0", name="ck_vehicles_acquisition_cost_nonneg"),
        # SRS §7.4.3 indexes
        Index("idx_vehicles_status", "status"),
        Index("idx_vehicles_type_region", "vehicle_type", "region"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    registration_number: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(40), nullable=False)
    max_load_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    odometer_km: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    acquisition_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    acquired_at: Mapped[str] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=VehicleStatus.AVAILABLE
    )
    region: Mapped[str | None] = mapped_column(String(60), nullable=True)
    deleted_at: Mapped[str | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_at: Mapped[str] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    created_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    updated_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )

    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])
