from __future__ import annotations

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    TIMESTAMP,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.db import Base
from app.shared.enums import TripStatus


class Trip(Base):
    """Trip entity for fleet dispatch workflows."""

    __tablename__ = "trips"

    __table_args__ = (
        CheckConstraint(
            "status IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')",
            name="ck_trips_status",
        ),
        Index("idx_trips_status", "status"),
        Index("idx_trips_vehicle_driver", "vehicle_id", "driver_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    vehicle_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=False
    )
    driver_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("drivers.id", ondelete="SET NULL"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=TripStatus.DRAFT
    )
    cancelled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[str] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[str] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
    driver = relationship("Driver", foreign_keys=[driver_id])
