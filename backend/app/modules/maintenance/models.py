from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    TIMESTAMP,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.db import Base
from app.shared.enums import VehicleStatus


class MaintenanceLog(Base):
    """Maintenance log entity for vehicle service events."""

    __tablename__ = "maintenance_logs"

    __table_args__ = (
        CheckConstraint(
            "status IN ('Open', 'Closed')",
            name="ck_maintenance_logs_status",
        ),
        CheckConstraint(
            "vehicle_status IN ('Available', 'OnTrip', 'InShop', 'Retired')",
            name="ck_maintenance_logs_vehicle_status",
        ),
        CheckConstraint(
            "closed_at IS NULL OR closed_at >= opened_at",
            name="ck_maintenance_logs_close_after_open",
        ),
        Index("idx_maint_vehicle", "vehicle_id"),
        Index(
            "uq_open_maint_per_vehicle",
            "vehicle_id",
            unique=True,
            postgresql_where=text("closed_at IS NULL"),
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    vehicle_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    opened_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    closed_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    vehicle_status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=VehicleStatus.IN_SHOP
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
