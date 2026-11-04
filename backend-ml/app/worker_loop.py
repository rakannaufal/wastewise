"""Keep continuous workers alive across transient database outages."""

import logging
import time
from collections.abc import Callable
from datetime import UTC, datetime

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError

from app.db import SessionLocal
from app.models import WorkerHeartbeat

logger = logging.getLogger("wastewise.worker")


def heartbeat(worker_name: str):
    now = datetime.now(UTC)
    statement = insert(WorkerHeartbeat).values(worker_name=worker_name, heartbeat_at=now)
    statement = statement.on_conflict_do_update(
        index_elements=[WorkerHeartbeat.worker_name],
        set_={"heartbeat_at": now},
    )
    with SessionLocal.begin() as db:
        db.execute(statement)


def run_worker(
    job: Callable[[], bool],
    *,
    once: bool = False,
    worker_name: str | None = None,
    pause: Callable[[float], None] = time.sleep,
):
    delay = 5
    while True:
        try:
            if worker_name:
                heartbeat(worker_name)
            worked = job()
        except SQLAlchemyError as exc:
            if once:
                raise
            # Never log SQL parameters, connection URLs, or credential-bearing diagnostics.
            logger.warning(
                "worker_database_unavailable error=%s retry_seconds=%s", type(exc).__name__, delay
            )
            pause(delay)
            delay = min(delay * 2, 60)
            continue
        delay = 5
        if not worked:
            if once:
                return
            pause(5)
