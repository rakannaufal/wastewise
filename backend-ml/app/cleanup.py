"""Durable, lease-based private object deletion worker."""

import argparse
import time
from datetime import UTC, datetime, timedelta

from sqlalchemy import or_, select

from app.config import settings
from app.db import SessionLocal
from app.models import CleanupJob, Report
from app.storage import storage


def run_once():
    now = datetime.now(UTC)
    with SessionLocal.begin() as db:
        job = db.scalar(
            select(CleanupJob)
            .where(
                CleanupJob.bucket == settings.storage_bucket,
                CleanupJob.status != "completed",
                CleanupJob.next_attempt_at <= now,
                or_(CleanupJob.locked_until.is_(None), CleanupJob.locked_until < now),
            )
            .order_by(CleanupJob.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if job is None:
            return False
        if db.scalar(select(Report.id).where(Report.image_path == job.object_path)):
            job.status = "completed"
            job.locked_until = None
            job.last_error_code = "ReferencedObjectPreserved"
            return True
        job.status = "processing"
        job.attempts += 1
        job.locked_until = now + timedelta(seconds=60)
        job_id, path = job.id, job.object_path
    try:
        storage.delete(path)
        error = None
    except Exception as exc:
        error = type(exc).__name__[:100]
    with SessionLocal.begin() as db:
        job = db.get(CleanupJob, job_id)
        if job is None:
            return True
        job.locked_until = None
        job.last_error_code = error
        job.status = "pending" if error else "completed"
        job.next_attempt_at = now + timedelta(seconds=min(3600, 2 ** min(job.attempts, 11)))
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    if args.once:
        while run_once():
            pass
    else:
        while True:
            if not run_once():
                time.sleep(5)
