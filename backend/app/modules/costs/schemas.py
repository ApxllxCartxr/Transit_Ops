from datetime import date

from pydantic import BaseModel, ConfigDict


class FuelEntry(BaseModel):
    id: str
    liters: float
    cost_per_liter: float
    total_cost: float
    logged_at: str

    model_config = ConfigDict(from_attributes=True)


class ExpenseEntry(BaseModel):
    id: str
    category: str
    description: str | None = None
    amount: float
    incurred_at: str

    model_config = ConfigDict(from_attributes=True)


class CostDetails(BaseModel):
    vehicle_id: str
    fuel_cost: float
    maintenance_cost: float
    expense_cost: float
    operational_cost: float
    total_cost: float
    start_date: date | None = None
    end_date: date | None = None
    fuel_entries: list[FuelEntry] = []
    expenses: list[ExpenseEntry] = []

    model_config = ConfigDict(from_attributes=True)
