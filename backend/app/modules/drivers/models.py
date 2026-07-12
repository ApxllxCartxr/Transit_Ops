from datetime import date
from sqlalchemy import (
    CheckConstraint,
    Date,
    Index,
    Integer,
    String,
    TIMESTAMP,
    ForeignKey,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.db import Base
from app.shared.enums import DriverStatus


class Driver(Base):
    """Driver entity — SRS §7.4.4."""

    __tablename__ = "drivers"

    __table_args__ = (
        # SRS §7.4.4 CHECK constraints
        CheckConstraint(
            "safety_score BETWEEN 0 AND 100", name="ck_drivers_safety_score_range"
        ),
        # SRS §7.4.4 indexes
        Index("idx_drivers_status", "status"),
        Index("idx_drivers_license_expiry", "license_expiry"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    license_number: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )
    license_category: Mapped[str] = mapped_column(String(10), nullable=False)
    license_expiry: Mapped[date] = mapped_column(Date, nullable=False)
    contact_number: Mapped[str] = mapped_column(String(20), nullable=False)
    safety_score: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="100"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=DriverStatus.AVAILABLE
    )
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
