from __future__ import annotations

from typing import Any

from sqlalchemy import text

from app.core.db import AsyncSessionLocal, engine

MATERIALIZED_VIEW_NAME = "mv_vehicle_costs"


class AnalyticsService:
    async def refresh_vehicle_analytics(self) -> None:
        stmt = text(f"REFRESH MATERIALIZED VIEW CONCURRENTLY {MATERIALIZED_VIEW_NAME}").execution_options(autocommit=True)
        async with engine.connect() as conn:
            await conn.execute(stmt)

    async def get_vehicle_kpis(self) -> list[dict[str, object]]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text(f"SELECT * FROM {MATERIALIZED_VIEW_NAME}"))
            return [dict(row) for row in result.mappings().all()]

    async def get_fleet_aggregates(self) -> dict[str, object]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text(
                    f"SELECT COUNT(*) AS total_vehicles,"
                    f" SUM(CASE WHEN status = 'Retired' THEN 1 ELSE 0 END) AS retired_vehicles,"
                    f" SUM(acquisition_cost) AS total_acquisition_cost,"
                    f" SUM(total_revenue) AS total_revenue,"
                    f" SUM(total_cost) AS total_cost"
                    f" FROM {MATERIALIZED_VIEW_NAME}"
                )
            )
            return dict(result.mappings().first() or {})

    def _normalize_vehicle_status(self, status: str | None) -> str | None:
        if not status:
            return None

        mapping = {
            "available": "Available",
            "ontrip": "OnTrip",
            "inshop": "InShop",
            "retired": "Retired",
            "Available": "Available",
            "OnTrip": "OnTrip",
            "InShop": "InShop",
            "Retired": "Retired",
        }
        return mapping.get(status, status)

    async def get_dashboard_kpis(
        self,
        vehicle_type: str | None = None,
        vehicle_status: str | None = None,
        region: str | None = None,
    ) -> dict[str, Any]:
        try:
            await self.refresh_vehicle_analytics()
        except Exception:
            pass

        where_clauses: list[str] = []
        params: dict[str, Any] = {}

        if vehicle_type:
            where_clauses.append("v.vehicle_type = :vehicle_type")
            params["vehicle_type"] = vehicle_type

        normalized_status = self._normalize_vehicle_status(vehicle_status)
        if normalized_status:
            where_clauses.append("v.status = :vehicle_status")
            params["vehicle_status"] = normalized_status

        if region:
            where_clauses.append("v.region = :region")
            params["region"] = region

        where_clause = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        async with AsyncSessionLocal() as session:
            vehicle_query = text(
                """
                SELECT
                    COUNT(*) AS total_vehicles,
                    SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available_vehicles,
                    SUM(CASE WHEN status = 'OnTrip' THEN 1 ELSE 0 END) AS active_vehicles,
                    SUM(CASE WHEN status = 'InShop' THEN 1 ELSE 0 END) AS in_shop_vehicles,
                    SUM(CASE WHEN status = 'Retired' THEN 1 ELSE 0 END) AS retired_vehicles
                FROM vehicles v
                """
                + where_clause
            )
            trip_query = text(
                """
                SELECT
                    SUM(CASE WHEN t.status = 'Dispatched' THEN 1 ELSE 0 END) AS active_trips,
                    SUM(CASE WHEN t.status = 'Draft' THEN 1 ELSE 0 END) AS pending_trips
                FROM trips t
                JOIN vehicles v ON t.vehicle_id = v.id
                """
                + where_clause
            )
            cost_query = text(
                """
                SELECT
                    SUM(mv.total_revenue) AS total_revenue,
                    SUM(mv.total_cost) AS total_cost,
                    SUM(mv.total_fuel_liters) AS total_fuel_liters
                FROM mv_vehicle_costs mv
                JOIN vehicles v ON mv.vehicle_id = v.id
                """
                + where_clause
            )
            driver_query = text(
                """
                SELECT
                    COUNT(*) AS total_drivers,
                    SUM(CASE WHEN status IN ('Available', 'OnTrip') THEN 1 ELSE 0 END) AS on_duty_drivers
                FROM drivers
                """
            )

            vehicle_result = await session.execute(vehicle_query, params)
            trip_result = await session.execute(trip_query, params)
            cost_result = await session.execute(cost_query, params)
            driver_result = await session.execute(driver_query)

            vehicles = dict(vehicle_result.mappings().first() or {})
            trips = dict(trip_result.mappings().first() or {})
            costs = dict(cost_result.mappings().first() or {})
            drivers = dict(driver_result.mappings().first() or {})

            total_vehicles = int(vehicles.get("total_vehicles", 0) or 0)
            retired_vehicles = int(vehicles.get("retired_vehicles", 0) or 0)
            active_vehicles = int(vehicles.get("active_vehicles", 0) or 0)
            available_vehicles = int(vehicles.get("available_vehicles", 0) or 0)
            in_shop_vehicles = int(vehicles.get("in_shop_vehicles", 0) or 0)
            active_trips = int(trips.get("active_trips", 0) or 0)
            pending_trips = int(trips.get("pending_trips", 0) or 0)
            total_drivers = int(drivers.get("total_drivers", 0) or 0)
            on_duty_drivers = int(drivers.get("on_duty_drivers", 0) or 0)
            total_revenue = float(costs.get("total_revenue", 0) or 0)
            total_cost = float(costs.get("total_cost", 0) or 0)
            total_fuel_liters = float(costs.get("total_fuel_liters", 0) or 0)

            fleet_utilization: float
            if total_vehicles <= 0 or retired_vehicles >= total_vehicles:
                fleet_utilization = 0.0
            else:
                fleet_utilization = round((active_vehicles / (total_vehicles - retired_vehicles)) * 100, 2)

            vehicle_roi: str | float
            if total_vehicles <= 0 or retired_vehicles >= total_vehicles or total_cost <= 0:
                vehicle_roi = "N/A"
            else:
                vehicle_roi = f"{(total_revenue / total_cost):.2f}"

            return {
                "totalVehicles": total_vehicles,
                "activeVehicles": active_vehicles,
                "availableVehicles": available_vehicles,
                "inShopVehicles": in_shop_vehicles,
                "retiredVehicles": retired_vehicles,
                "activeTrips": active_trips,
                "pendingTrips": pending_trips,
                "onDutyDrivers": on_duty_drivers,
                "totalDrivers": total_drivers,
                "fleetUtilization": fleet_utilization,
                "operationalCost": total_cost,
                "totalRevenue": total_revenue,
                "fuelLiters": total_fuel_liters,
                "vehicleROI": vehicle_roi,
                # snake_case copies for tests
                "total_vehicles": total_vehicles,
                "active_vehicles": active_vehicles,
                "available_vehicles": available_vehicles,
                "in_shop_vehicles": in_shop_vehicles,
                "retired_vehicles": retired_vehicles,
                "active_trips": active_trips,
                "pending_trips": pending_trips,
                "on_duty_drivers": on_duty_drivers,
                "total_drivers": total_drivers,
                "fleet_utilization": fleet_utilization,
                "operational_cost": total_cost,
                "total_revenue": total_revenue,
                "fuel_liters": total_fuel_liters,
                "vehicle_roi": vehicle_roi,
            }
