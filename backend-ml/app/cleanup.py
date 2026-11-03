"""Durable, lease-based private object deletion worker."""

import argparse
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, or_, select

from app.config import settings
from app.db import SessionLocal
from app.models import CleanupJob, CommunityPost, Report, ReportDraft
from app.storage import storage
from app.worker_loop import run_worker
from app.workflow import enqueue


def referenced(db, path):
    return (
        db.scalar(
            select(CommunityPost.id).where(
                or_(
                    and_(
                        CommunityPost.state == "processing", CommunityPost.source_image_path == path
                    ),
                    CommunityPost.image_path == path,
                    CommunityPost.thumbnail_path == path,
                )
            )
        )
        or db.scalar(
            select(Report.id).where(or_(Report.image_path == path, Report.thumbnail_path == path))
        )
        or db.scalar(
            select(ReportDraft.id).where(
                ReportDraft.consumed_at.is_(None),
                or_(ReportDraft.image_path == path, ReportDraft.thumbnail_path == path),
            )
        )
    )


def expire_drafts():
    with SessionLocal.begin() as db:
        rows = db.scalars(
            select(ReportDraft)
            .where(
                ReportDraft.expires_at <= datetime.now(UTC),
                ~select(Report.id).where(Report.source_draft_id == ReportDraft.id).exists(),
            )
            .with_for_update(skip_locked=True)
            .limit(20)
        ).all()
        for row in rows:
            enqueue(db, row.image_path)
            enqueue(db, row.thumbnail_path)
            db.delete(row)
        return len(rows)


def run_once():
    expire_drafts()
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
        if referenced(db, job.object_path):
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
    run_worker(run_once, once=args.once)
