from __future__ import annotations

from typing import Dict


class CostService:
    """
    Cost calculation service from BE2 (feat/backend-ops-analytics).
    Operational cost = fuel + maintenance. Total = operational + expenses.
    Placeholder values — real impl will aggregate from DB fuel_logs/expenses tables.
    """

    def calculate_costs(self, vehicle_id: str) -> Dict[str, float]:
        fuel_cost = 100.0
        maintenance_cost = 50.0
        expense_cost = 50.0

        operational_cost = fuel_cost + maintenance_cost
        total_cost = operational_cost + expense_cost
        return {
            "vehicle_id": vehicle_id,
            "fuel_cost": fuel_cost,
            "maintenance_cost": maintenance_cost,
            "expense_cost": expense_cost,
            "operational_cost": operational_cost,
            "total_cost": total_cost,
        }
