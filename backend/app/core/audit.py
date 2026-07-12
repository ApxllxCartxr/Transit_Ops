import logging
import asyncio
from typing import Any, Dict

from app.core.db import AsyncSessionLocal
from app.shared.models import AuditLog

logger = logging.getLogger("app.audit")


async def _write_audit_event_task(
    entity_type: str,
    entity_id: str,
    action: str,
    changes: Dict[str, Any] | None,
    actor_id: str | None,
) -> None:
    """Internal task to write audit log in a separate DB session."""
    try:
        async with AsyncSessionLocal() as session:
            log_entry = AuditLog(
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                changes=changes,
                actor_id=actor_id,
            )
            session.add(log_entry)
            await session.commit()
    except Exception as e:
        logger.exception(
            f"Failed to record audit event for {entity_type} {entity_id}: {e}"
        )


def record_audit_event(
    entity_type: str,
    entity_id: str,
    action: str,
    changes: Dict[str, Any] | None = None,
    actor_id: str | None = None,
) -> None:
    """
    Log an audit event asynchronously in the background.
    This call is non-blocking and safe; errors are logged but will not disrupt
    the calling operation.
    """
    # Fire and forget in the current running event loop
    try:
        loop = asyncio.get_running_loop()
        if loop.is_running():
            loop.create_task(
                _write_audit_event_task(entity_type, entity_id, action, changes, actor_id)
            )
        else:
            # Fallback if loop is closed or not running (e.g. in script context)
            asyncio.run(
                _write_audit_event_task(entity_type, entity_id, action, changes, actor_id)
            )
    except RuntimeError:
        # No running event loop
        try:
            asyncio.run(
                _write_audit_event_task(entity_type, entity_id, action, changes, actor_id)
            )
        except Exception as e:
            logger.exception(f"Failed to write audit event (no event loop): {e}")
