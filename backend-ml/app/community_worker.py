"""Lease-based social image derivatives and offline administrative point lookup."""

import argparse
import io
import logging
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from PIL import Image
from sqlalchemy import Float, select, update

from app.db import SessionLocal
from app.models import CleanupJob, CommunityPost, Region, Report
from app.region_reference import contains
from app.storage import storage, thumbnail
from app.worker_loop import run_worker
from app.workflow import enqueue_many

logger = logging.getLogger("wastewise.community")


def resolve(db, latitude, longitude):
    box = Region.geometry["bbox"]
    candidates = db.scalars(
        select(Region).where(
            Region.geometry.is_not(None),
            box[0].astext.cast(Float) <= longitude,
            box[2].astext.cast(Float) >= longitude,
            box[1].astext.cast(Float) <= latitude,
            box[3].astext.cast(Float) >= latitude,
        )
    ).all()
    matches = [r for r in candidates if contains(r.geometry, latitude, longitude)]
    if len(matches) != 1:
        return None, None, "ambiguous" if matches else "unresolved"
    row = matches[0]
    parts = [row.name]
    parent = row.parent_code
    while parent:
        ancestor = db.get(Region, parent)
        if ancestor is None:
            break
        parts.append(ancestor.name)
        parent = ancestor.parent_code
    return row.code, ", ".join(parts), "resolved"


def run_once():
    now = datetime.now(UTC)
    with SessionLocal.begin() as db:
        post = db.scalar(
            select(CommunityPost)
            .where(CommunityPost.state == "processing", CommunityPost.next_attempt_at <= now)
            .order_by(CommunityPost.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if post is None:
            return False
        post.attempts += 1
        post.next_attempt_at = now + timedelta(minutes=5)
        identity, source, owner, attempt = (
            post.id,
            post.source_image_path,
            post.user_id,
            post.attempts,
        )
        report = db.get(Report, post.report_id)
        assert report is not None
        latitude, longitude = float(report.latitude), float(report.longitude)
    paths = [f"{owner}/{uuid4()}.jpg", f"{owner}/{uuid4()}.jpg"]
    # Reserve cleanup before remote writes so a process crash cannot lose uploaded objects.
    with SessionLocal.begin() as db:
        enqueue_many(db, paths)
        db.execute(
            update(CleanupJob)
            .where(CleanupJob.object_path.in_(paths))
            .values(next_attempt_at=now + timedelta(minutes=10))
        )
    error = False
    try:
        raw = storage.get(source)
        with Image.open(io.BytesIO(raw)) as image:
            image.thumbnail((1080, 1080))
            output = io.BytesIO()
            image.convert("RGB").save(output, "JPEG", quality=82)
            content = output.getvalue()
        thumb = thumbnail(content)
        storage.put(owner, content, key=paths[0])
        storage.put(owner, thumb, key=paths[1])
        with SessionLocal.begin() as db:
            code, label, state = resolve(db, latitude, longitude)
            post = db.scalar(
                select(CommunityPost).where(CommunityPost.id == identity).with_for_update()
            )
            if (
                post is None
                or post.state != "processing"
                or post.source_image_path != source
                or post.attempts != attempt
                or post.next_attempt_at <= datetime.now(UTC)
            ):
                enqueue_many(db, paths)
            else:
                post.image_path, post.thumbnail_path = paths
                post.region_code, post.location_label, post.location_state = code, label, state
                post.state, post.revision = "published", post.revision + 1
    except Exception as exc:
        logger.warning(
            "community_publish_failed post_id=%s attempt=%s error=%s",
            identity,
            attempt,
            type(exc).__name__,
        )
        error = True
    if error:
        with SessionLocal.begin() as db:
            enqueue_many(db, paths)
            post = db.scalar(
                select(CommunityPost).where(CommunityPost.id == identity).with_for_update()
            )
            if post and post.state == "processing" and post.attempts == attempt:
                post.next_attempt_at = now + timedelta(seconds=min(3600, 2 ** min(attempt, 11)))
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    run_worker(run_once, once=args.once)
