from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.auth.dependencies import require_roles
from app.core.db import AsyncSessionLocal
from app.modules.trips.models import Trip

ALL_ROLES = ["Admin", "Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"]

router = APIRouter(
    prefix="/api/v1/exports",
    tags=["exports"],
)


def _format_csv_value(value: object | None) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, datetime):
        return value.isoformat()
    text = str(value)
    return f'"{text.replace("\"", "\"\"")}"' if "," in text or '"' in text or "\n" in text else text


@router.get("/csv", dependencies=[Depends(require_roles(*ALL_ROLES))])
async def export_csv(
    status: str | None = Query(None),
    vehicle_id: str | None = Query(None),
    driver_id: str | None = Query(None),
):
    async def row_stream():
        header = [
            "id",
            "vehicle_id",
            "driver_id",
            "status",
            "cancelled",
            "created_at",
            "updated_at",
        ]
        yield ",".join(header) + "\n"

        stmt = select(
            Trip.id,
            Trip.vehicle_id,
            Trip.driver_id,
            Trip.status,
            Trip.cancelled,
            Trip.created_at,
            Trip.updated_at,
        )
        if status:
            stmt = stmt.where(Trip.status == status)
        if vehicle_id:
            stmt = stmt.where(Trip.vehicle_id == vehicle_id)
        if driver_id:
            stmt = stmt.where(Trip.driver_id == driver_id)

        async with AsyncSessionLocal() as session:
            async with session.stream(stmt) as result:
                async for row in result:
                    values = [
                        _format_csv_value(row.id),
                        _format_csv_value(row.vehicle_id),
                        _format_csv_value(row.driver_id),
                        _format_csv_value(row.status),
                        _format_csv_value(row.cancelled),
                        _format_csv_value(row.created_at),
                        _format_csv_value(row.updated_at),
                    ]
                    yield ",".join(values) + "\n"

    return StreamingResponse(
        row_stream(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=trips.csv"},
    )
