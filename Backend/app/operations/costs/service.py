from __future__ import annotations

from typing import Dict


class CostService:
    def calculate_costs(self, vehicle_id: str) -> Dict[str, float]:
        fuel_cost = 100.0
        maintenance_cost = 50.0
        expense_cost = 50.0

        operational_cost = fuel_cost + maintenance_cost
        total_cost = operational_cost + expense_cost
        return {
            "operational_cost": operational_cost,
            "total_cost": total_cost,
        }
