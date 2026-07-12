from __future__ import annotations

from typing import Dict


class ReportService:
    def build_report(self, vehicle_count: int, retired_count: int, acquisition_cost: float) -> Dict[str, str]:
        if vehicle_count <= 0:
            fuel_efficiency = "N/A"
        else:
            fuel_efficiency = f"{(vehicle_count / max(retired_count, 1)):.2f} mpg"

        if retired_count >= vehicle_count and vehicle_count > 0:
            vehicle_roi = "N/A"
        elif acquisition_cost <= 0:
            vehicle_roi = "N/A"
        else:
            vehicle_roi = f"{(vehicle_count / acquisition_cost):.2f}"

        if vehicle_count <= 0:
            fleet_utilization = "N/A"
        else:
            fleet_utilization = f"{(vehicle_count / max(vehicle_count, 1) * 100):.2f}%"

        return {
            "fuel_efficiency": fuel_efficiency,
            "vehicle_roi": vehicle_roi,
            "fleet_utilization": fleet_utilization,
        }
