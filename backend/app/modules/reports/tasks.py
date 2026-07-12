from __future__ import annotations

import asyncio
from typing import Final

from app.modules.reports.analytics import AnalyticsService

REFRESH_INTERVAL_SECONDS: Final[int] = 300
analytics_service = AnalyticsService()
_refresh_task: asyncio.Task[None] | None = None


def start_vehicle_analytics_refresh() -> None:
    global _refresh_task
    if _refresh_task is None or _refresh_task.done():
        loop = asyncio.get_running_loop()
        _refresh_task = loop.create_task(_refresh_loop())


async def stop_vehicle_analytics_refresh() -> None:
    global _refresh_task
    if _refresh_task is None:
        return

    _refresh_task.cancel()
    try:
        await _refresh_task
    except asyncio.CancelledError:
        pass
    finally:
        _refresh_task = None


async def _refresh_loop() -> None:
    while True:
        try:
            await analytics_service.refresh_vehicle_analytics()
        except Exception:
            pass
        await asyncio.sleep(REFRESH_INTERVAL_SECONDS)
