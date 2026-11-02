import json
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import select, text

from app.config import ROOT, settings
from app.inference import predictor
from app.models import CleanupJob, Report, ReportEvent
from app.storage import storage

LOCATION_FIELDS = (
    "photo_source",
    "captured_at",
    "location_source",
    "location_recorded_at",
    "location_accuracy_m",
)


def lock_request(db, key):
    db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"), {"key": key})


def classification(prediction):
    policy_path = ROOT / "backend-ml/ml/models/review_policy.json"
    if prediction is None:
        return "analysis_failed"
    if not policy_path.exists():
        return "needs_review"
    policy = json.loads(policy_path.read_text())
    if (
        policy.get("model_version") != prediction["model_version"]
        or policy.get("checkpoint_sha256") != predictor.checkpoint_sha256
    ):
        return "needs_review"
    scores = sorted(prediction.get("probabilities", {}).values(), reverse=True)
    return (
        "classified"
        if len(scores) >= 2
        and scores[0] >= policy["confidence"]
        and scores[0] - scores[1] >= policy["margin"]
        else "needs_review"
    )


def scoped(user):
    return (
        select(Report) if user.role == "admin" else select(Report).where(Report.user_id == user.id)
    )


def owned(db, user, report_id, lock=False):
    query = scoped(user).where(Report.id == report_id)
    if lock:
        query = query.with_for_update(of=Report)
    row = db.scalar(query)
    if row is None:
        raise HTTPException(404, "Laporan tidak ditemukan")
    return row


def check_revision(row, revision):
    if row.revision != revision:
        raise HTTPException(409, "Laporan berubah. Muat ulang sebelum menyimpan.")


def event(db, row, user, kind, details, reason=None):
    db.add(
        ReportEvent(report_id=row.id, actor_id=user.id, kind=kind, details=details, reason=reason)
    )


def enqueue(db, path):
    if not path:
        return
    if not db.scalar(
        select(CleanupJob.id).where(
            CleanupJob.bucket == settings.storage_bucket, CleanupJob.object_path == path
        )
    ):
        db.add(CleanupJob(object_path=path, bucket=settings.storage_bucket))


def location_data(row):
    return {key: getattr(row, key) for key in LOCATION_FIELDS}


def report_data(row, links=None):
    links = (
        links if links is not None else storage.signed_many([row.image_path, row.thumbnail_path])
    )
    url, expires = links[row.image_path]
    thumb, _ = links[row.thumbnail_path] if row.thumbnail_path else (url, expires)
    return {
        "id": row.id,
        "user_id": row.user_id,
        "user_name": row.user.full_name,
        "category": row.category,
        "description": row.description,
        "latitude": float(row.latitude),
        "longitude": float(row.longitude),
        "status": row.status,
        "ai_predicted_category": row.ai_predicted_category,
        "ai_confidence": float(row.ai_confidence) if row.ai_confidence is not None else None,
        "ai_model_version": row.ai_model_version,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "image_url": url,
        "image_url_expires_at": expires,
        "thumbnail_url": thumb,
        "revision": row.revision,
        "classification_state": row.classification_state,
        **location_data(row),
    }


def ensure_location(draft):
    if (
        draft.latitude is None
        or draft.longitude is None
        or draft.location_source == "legacy_unknown"
    ):
        raise HTTPException(
            422, "Lokasi otomatis belum lengkap. Aktifkan GPS atau konfirmasi lokasi foto galeri."
        )
    if draft.expires_at <= datetime.now(UTC):
        raise HTTPException(409, "Draft kedaluwarsa. Ambil atau pilih foto lagi.")


def report_list(rows):
    links = storage.signed_many(
        [path for row in rows for path in (row.image_path, row.thumbnail_path)]
    )
    return [report_data(row, links) for row in rows]
