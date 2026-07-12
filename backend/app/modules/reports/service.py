from __future__ import annotations

from typing import Dict

from app.modules.reports.analytics import AnalyticsService


class ReportService:
    def __init__(self) -> None:
        self.analytics = AnalyticsService()

    async def build_report(self, acquisition_cost: float) -> Dict[str, str]:
        aggregates = await self.analytics.get_fleet_aggregates()
        total_vehicles = int(aggregates.get("total_vehicles", 0) or 0)
        retired_vehicles = int(aggregates.get("retired_vehicles", 0) or 0)
        total_revenue = float(aggregates.get("total_revenue", 0) or 0)

        if total_vehicles <= 0:
            fleet_utilization = "N/A"
        else:
            fleet_utilization = f"{(total_vehicles - retired_vehicles) / total_vehicles * 100:.2f}%"

        if total_vehicles <= 0:
            fuel_efficiency = "N/A"
        else:
            fuel_efficiency = f"{(total_revenue / total_vehicles):.2f} mpg"

        if retired_vehicles >= total_vehicles and total_vehicles > 0:
            vehicle_roi = "N/A"
        elif acquisition_cost <= 0:
            vehicle_roi = "N/A"
        else:
            vehicle_roi = f"{(total_revenue / acquisition_cost):.2f}"

        return {
            "fuel_efficiency": fuel_efficiency,
            "vehicle_roi": vehicle_roi,
            "fleet_utilization": fleet_utilization,
        }
