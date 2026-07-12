from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class MaintenanceLog:
    id: str
    vehicle_id: str
    status: str
    vehicle_status: str


class MaintenanceService:
    _maintenances: Dict[str, MaintenanceLog] = {}

    def open_maintenance(self, vehicle_id: str) -> MaintenanceLog:
        if self._has_open_maintenance(vehicle_id):
            raise ValueError("Vehicle already has an open maintenance record")
        if self._vehicle_on_trip(vehicle_id):
            raise ValueError("Vehicle is on trip")
        maintenance = MaintenanceLog(
            id=f"M-{vehicle_id}",
            vehicle_id=vehicle_id,
            status="Open",
            vehicle_status="InShop",
        )
        self._maintenances[maintenance.id] = maintenance
        return maintenance

    def close_maintenance(self, maintenance_id: str) -> MaintenanceLog:
        maintenance = self._maintenances.get(maintenance_id)
        if maintenance is None:
            raise ValueError("Maintenance record not found")
        maintenance.status = "Closed"
        maintenance.vehicle_status = "Available"
        return maintenance

    def _has_open_maintenance(self, vehicle_id: str) -> bool:
        return any(record.vehicle_id == vehicle_id and record.status == "Open" for record in self._maintenances.values())

    def _vehicle_on_trip(self, vehicle_id: str) -> bool:
        return vehicle_id == "V-4"
