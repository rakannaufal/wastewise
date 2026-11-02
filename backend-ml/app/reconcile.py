"""Audit aged orphan images; optionally enqueue durable cleanup without direct deletion."""

import argparse
import json
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.config import settings
from app.db import SessionLocal
from app.models import CleanupJob, Report
from app.storage import storage


def canonical(key: str) -> bool:
    try:
        owner, filename = key.split("/")
        return str(UUID(owner)) == owner and filename == str(UUID(filename[:-4])) + ".jpg"
    except (ValueError, AttributeError):
        return False


def inventory():
    if storage.local:
        for path in settings.storage_path.glob("*/*.jpg"):
            if path.is_file() and not path.is_symlink():
                yield (
                    path.relative_to(settings.storage_path).as_posix(),
                    datetime.fromtimestamp(path.stat().st_mtime, UTC),
                )
        return

    def listing(prefix):
        offset = 0
        while True:
            rows = storage.request(
                "POST",
                "object/list/" + settings.storage_bucket,
                json={
                    "prefix": prefix,
                    "limit": 1000,
                    "offset": offset,
                    "sortBy": {"column": "name", "order": "asc"},
                },
            ).json()
            if not isinstance(rows, list):
                raise ValueError("Invalid storage inventory response")
            yield from rows
            if len(rows) < 1000:
                break
            offset += len(rows)

    for owner in listing(""):
        name = owner.get("name", "")
        try:
            if str(UUID(name)) != name:
                continue
        except ValueError:
            continue
        for item in listing(name):
            key = name + "/" + item.get("name", "")
            timestamp = item.get("created_at")
            if timestamp and canonical(key):
                created = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                if created.tzinfo is None:
                    raise ValueError("Storage timestamp must include timezone")
                yield key, created


def reconcile(*, enqueue=False, grace_hours=24):
    if grace_hours < 24:
        raise ValueError("Orphan grace period must be at least 24 hours")
    cutoff = datetime.now(UTC) - timedelta(hours=grace_hours)
    scanned = candidates = scheduled = 0
    # Read provider inventory fully before mutations; an interrupted listing enqueues nothing.
    objects = list(inventory())
    with SessionLocal.begin() as db:
        for key, created in objects:
            scanned += 1
            if not canonical(key) or created > cutoff:
                continue
            if db.scalar(select(Report.id).where(Report.image_path == key)):
                continue
            candidates += 1
            if enqueue:
                inserted = db.execute(
                    insert(CleanupJob)
                    .values(object_path=key, bucket=settings.storage_bucket)
                    .on_conflict_do_nothing(index_elements=["bucket", "object_path"])
                    .returning(CleanupJob.id)
                ).scalar_one_or_none()
                scheduled += inserted is not None
    return {
        "mode": "enqueue" if enqueue else "audit",
        "scanned": scanned,
        "aged_orphans": candidates,
        "scheduled": scheduled,
        "grace_hours": grace_hours,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--enqueue", action="store_true")
    parser.add_argument("--grace-hours", type=int, default=24)
    args = parser.parse_args()
    print(json.dumps(reconcile(enqueue=args.enqueue, grace_hours=args.grace_hours)))
