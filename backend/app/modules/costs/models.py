from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Numeric,
    String,
    TIMESTAMP,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.db import Base
from app.shared.enums import ExpenseCategory


class FuelLog(Base):
    """Fuel log entity for vehicle refueling events."""

    __tablename__ = "fuel_logs"

    __table_args__ = (
        CheckConstraint("liters > 0", name="ck_fuel_logs_liters_positive"),
        CheckConstraint("cost_per_liter >= 0", name="ck_fuel_logs_cost_per_liter_nonneg"),
        Index("idx_fuel_logs_vehicle", "vehicle_id"),
        Index("idx_fuel_logs_date", "logged_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    vehicle_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    liters: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    cost_per_liter: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_cost: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    logged_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])


class Expense(Base):
    """Expense entity for trips and vehicles."""

    __tablename__ = "expenses"

    __table_args__ = (
        CheckConstraint(
            "vehicle_id IS NOT NULL OR trip_id IS NOT NULL",
            name="chk_expense_has_owner",
        ),
        CheckConstraint(
            "amount >= 0",
            name="ck_expenses_amount_nonneg",
        ),
        Index("idx_expenses_vehicle", "vehicle_id"),
        Index("idx_expenses_trip", "trip_id"),
        Index("idx_expenses_category", "category"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    vehicle_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )
    trip_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True
    )
    category: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=ExpenseCategory.OTHER
    )
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    incurred_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    vehicle = relationship("Vehicle", foreign_keys=[vehicle_id])
    trip = relationship("Trip", foreign_keys=[trip_id])
