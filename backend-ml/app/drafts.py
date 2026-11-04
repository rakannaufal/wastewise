import hashlib
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.db import get_db
from app.inference import predictor
from app.models import ReportDraft, User
from app.responses import DraftRead, Envelope
from app.schemas import LocationUpdate
from app.security import current_user, limit
from app.storage import sanitize_upload, storage, thumbnail
from app.workflow import classification, enqueue_many, location_data, lock_request

router = APIRouter(prefix="/api/v1/report-drafts", tags=["Report drafts"])
draft_pipeline_slots = threading.BoundedSemaphore(3)


def draft_data(row):
    url, expires = storage.signed(row.image_path)
    return {
        "id": row.id,
        "image_url": url,
        "image_url_expires_at": expires,
        "prediction": row.prediction,
        "classification_state": row.classification_state,
        "expires_at": row.expires_at,
        "latitude": row.latitude,
        "longitude": row.longitude,
        **location_data(row),
    }


def get_draft(db, user, draft_id, editable=True):
    row = db.scalar(
        select(ReportDraft)
        .where(ReportDraft.id == draft_id, ReportDraft.user_id == user.id)
        .with_for_update()
    )
    if row is None:
        raise HTTPException(404, "Draft tidak ditemukan")
    if row.consumed_at and editable:
        raise HTTPException(409, "Draft sudah menjadi laporan")
    if row.expires_at <= datetime.now(UTC) and not row.consumed_at:
        raise HTTPException(409, "Draft kedaluwarsa. Pilih foto lagi.")
    return row


def analyze(content):
    try:
        return predictor.predict(content)
    except (RuntimeError, ValueError):
        return None


@router.post("", status_code=201, response_model=Envelope[DraftRead])
async def create_draft(
    request: Request,
    image: UploadFile = File(),
    request_id: UUID = Form(),
    photo_source: Literal["camera", "gallery"] = Form(),
    captured_at: datetime | None = Form(None),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    form = await request.form()
    if set(form) - {"image", "request_id", "photo_source", "captured_at"} or any(
        len(form.getlist(k)) != 1 for k in form
    ):
        raise HTTPException(422, "Field draft tidak dikenal atau berulang")
    now = datetime.now(UTC)
    if captured_at and (captured_at.tzinfo is None or captured_at > now + timedelta(seconds=5)):
        raise HTTPException(422, "Waktu pengambilan foto tidak valid")
    if photo_source == "camera" and (
        captured_at is None or now - captured_at > timedelta(hours=24)
    ):
        raise HTTPException(422, "Foto kamera memerlukan waktu pengambilan yang valid")
    limit(request, "draft", 30, str(user.id), db)
    content = await sanitize_upload(image)
    if not draft_pipeline_slots.acquire(blocking=False):
        raise HTTPException(
            503,
            "Antrean penyimpanan foto penuh. Coba lagi sebentar.",
            headers={"Retry-After": "2"},
        )
    try:
        return await run_in_threadpool(
            store_draft, db, user, request_id, photo_source, captured_at, content, now
        )
    finally:
        draft_pipeline_slots.release()


def store_draft(db, user, request_id, photo_source, captured_at, content, now):
    # Keep advisory locks and all synchronous I/O off the ASGI event loop.
    digest = hashlib.sha256(content).hexdigest()
    lock_request(db, f"draft:{user.id}:{request_id}")
    existing = db.scalar(
        select(ReportDraft).where(
            ReportDraft.user_id == user.id, ReportDraft.request_id == request_id
        )
    )
    if existing:
        if (
            existing.image_hash != digest
            or existing.photo_source != photo_source
            or existing.captured_at != captured_at
        ):
            raise HTTPException(409, "Kunci draft dipakai untuk foto berbeda")
        get_draft(db, user, existing.id, editable=False)
        return {"success": True, "message": "Draft dipulihkan", "data": draft_data(existing)}
    paths = []
    try:
        thumb_content = thumbnail(content)
        with ThreadPoolExecutor(max_workers=3) as pool:
            uploads = [
                pool.submit(storage.put, str(user.id), content),
                pool.submit(storage.put, str(user.id), thumb_content),
            ]
            inference = pool.submit(analyze, content)
            failure = None
            for upload in uploads:
                try:
                    paths.append(upload.result())
                except Exception as exc:
                    failure = exc
            prediction = inference.result()
            if failure:
                raise failure
        path, thumb = paths
        row = ReportDraft(
            user_id=user.id,
            request_id=request_id,
            image_path=path,
            thumbnail_path=thumb,
            image_hash=digest,
            photo_source=photo_source,
            captured_at=captured_at,
            prediction=prediction,
            classification_state=classification(prediction),
            expires_at=now + timedelta(hours=24),
        )
        db.add(row)
        db.commit()
    except Exception as exc:
        db.rollback()
        enqueue_many(db, paths)
        db.commit()
        raise HTTPException(503, "Draft belum tersimpan. Coba lagi dengan foto yang sama.") from exc
    return {
        "success": True,
        "message": "Foto dianalisis"
        if prediction
        else "Model belum tersedia; draft tersimpan untuk dicoba lagi",
        "data": draft_data(row),
    }


@router.get("/{draft_id}", response_model=Envelope[DraftRead])
def detail(draft_id: UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return {
        "success": True,
        "message": "Draft",
        "data": draft_data(get_draft(db, user, draft_id, editable=False)),
    }


@router.patch("/{draft_id}", response_model=Envelope[DraftRead])
def locate(
    draft_id: UUID,
    body: LocationUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    row = get_draft(db, user, draft_id)
    stamp = body.location_recorded_at
    now = datetime.now(UTC)
    if row.photo_source == "camera":
        if (
            body.location_source != "device_capture"
            or row.captured_at is None
            or stamp is None
            or abs((row.captured_at - stamp).total_seconds()) > 30
        ):
            raise HTTPException(422, "GPS harus berdekatan dengan waktu foto kamera")
    elif body.location_source == "device_capture":
        raise HTTPException(422, "Foto galeri tidak boleh mengklaim GPS kamera")
    if body.location_source == "device_upload_confirmed" and (
        stamp is None or abs((now - stamp).total_seconds()) > 30
    ):
        raise HTTPException(422, "GPS konfirmasi sudah lama. Ambil lokasi saat ini lagi.")
    for key, value in body.model_dump(exclude={"confirmed"}).items():
        setattr(row, key, value)
    db.commit()
    return {"success": True, "message": "Sumber lokasi tersimpan", "data": draft_data(row)}


@router.post("/{draft_id}/retry", response_model=Envelope[DraftRead])
def retry(
    draft_id: UUID,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    row = get_draft(db, user, draft_id)
    limit(request, "predict", 30, str(user.id), db)
    if row.prediction is None:
        content = storage.get(row.image_path)
        row.prediction = analyze(content)
        row.classification_state = classification(row.prediction)
        db.commit()
    return {"success": True, "message": "Analisis draft", "data": draft_data(row)}


@router.delete("/{draft_id}", response_model=Envelope[None])
def discard(draft_id: UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = db.scalar(
        select(ReportDraft)
        .where(ReportDraft.id == draft_id, ReportDraft.user_id == user.id)
        .with_for_update()
    )
    if row is None:
        return {"success": True, "message": "Draft sudah dibatalkan", "data": None}
    if row.consumed_at:
        raise HTTPException(409, "Draft sudah menjadi laporan")
    enqueue_many(db, [row.image_path, row.thumbnail_path])
    db.delete(row)
    db.commit()
    return {"success": True, "message": "Draft dibatalkan", "data": None}
