"""Keep continuous workers alive across transient database outages."""

import logging
import time
from collections.abc import Callable

from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger("wastewise.worker")


def run_worker(
    job: Callable[[], bool], *, once: bool = False, pause: Callable[[float], None] = time.sleep
):
    delay = 5
    while True:
        try:
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
