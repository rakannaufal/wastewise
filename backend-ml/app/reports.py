import hashlib
from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, Request, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.db import get_db
from app.drafts import get_draft
from app.inference import predictor
from app.models import STATUSES, Report, ReportDraft, ReportEvent, User
from app.responses import (
    CategoryRead,
    Envelope,
    EventRead,
    PredictionRead,
    ReportRead,
    ReportsPage,
    StatusRead,
    SummaryRead,
)
from app.schemas import Category, ReportCreate, ReportUpdate, ReviewUpdate, Status, StatusUpdate
from app.security import admin, current_user, limit
from app.storage import sanitize_upload
from app.workflow import (
    check_revision,
    enqueue,
    ensure_location,
    event,
    location_data,
    lock_request,
    owned,
    report_data,
    report_list,
    scoped,
)
from ml.common import CATEGORIES, CLASSES

router = APIRouter(prefix="/api/v1", tags=["Reports"])


def ok(data=None, message="Berhasil"):
    return {"success": True, "message": message, "data": data}


def apply_draft(row, draft):
    ensure_location(draft)
    prediction = draft.prediction
    if prediction is None:
        raise HTTPException(503, "Analisis foto belum berhasil. Coba analisis draft lagi.")
    for key, value in location_data(draft).items():
        setattr(row, key, value)
    row.latitude, row.longitude = draft.latitude, draft.longitude
    row.image_path, row.thumbnail_path = draft.image_path, draft.thumbnail_path
    row.category = row.ai_predicted_category = prediction["category"]
    row.ai_confidence, row.ai_model_version = prediction["confidence"], prediction["model_version"]
    row.classification_state, row.source_draft_id = draft.classification_state, draft.id
    draft.consumed_at = datetime.now(UTC)


@router.get("/categories", tags=["Metadata"], response_model=Envelope[list[CategoryRead]])
def categories():
    return ok(CATEGORIES)


@router.get("/reports", response_model=Envelope[ReportsPage])
def reports(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=200),
    status: Status | None = None,
    category: Category | None = None,
    user_id: UUID | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    needs_review: bool = False,
    sort: Literal["newest", "oldest"] = "newest",
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    query = scoped(user)
    if user_id is not None:
        if user.role != "admin":
            raise HTTPException(403, "Filter pengguna hanya untuk pengelola")
        query = query.where(Report.user_id == user_id)
    if search:
        query = query.where(Report.description.icontains(search, autoescape=True))
    if status:
        query = query.where(Report.status == status)
    if category:
        query = query.where(Report.category == category.value)
    for stamp in (date_from, date_to):
        if stamp and stamp.tzinfo is None:
            raise HTTPException(422, "Filter waktu harus memiliki zona waktu")
    if date_from and date_to and date_to <= date_from:
        raise HTTPException(422, "Rentang tanggal tidak valid")
    if date_from:
        query = query.where(Report.created_at >= date_from)
    if date_to:
        query = query.where(Report.created_at < date_to)
    if needs_review:
        query = query.where(Report.classification_state == "needs_review")
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    order = (
        (Report.created_at.asc(), Report.id.asc())
        if sort == "oldest"
        else (Report.created_at.desc(), Report.id.desc())
    )
    rows = db.scalars(query.order_by(*order).offset((page - 1) * per_page).limit(per_page)).all()
    return ok(
        {
            "reports": report_list(rows),
            "pagination": {
                "current_page": page,
                "per_page": per_page,
                "total_items": total,
                "total_pages": (total + per_page - 1) // per_page,
            },
        }
    )


@router.post("/reports", status_code=201, response_model=Envelope[ReportRead])
def create_report(
    body: ReportCreate,
    request: Request,
    idempotency_key: UUID = Header(alias="Idempotency-Key"),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limit(request, "report", 30, str(user.id))
    digest = hashlib.sha256(body.model_dump_json().encode()).hexdigest()
    lock_request(db, f"finalize:{user.id}:{idempotency_key}")
    previous = db.scalar(
        select(ReportDraft).where(
            ReportDraft.user_id == user.id, ReportDraft.finalization_key == idempotency_key
        )
    )
    if previous:
        if previous.finalization_hash != digest:
            raise HTTPException(409, "Kunci pengiriman dipakai untuk data berbeda")
        return ok(
            report_data(owned(db, user, previous.result_report_id)), "Laporan sudah tersimpan"
        )
    draft = get_draft(db, user, body.draft_id)
    row = Report(user_id=user.id, description=body.description)
    apply_draft(row, draft)
    db.add(row)
    db.flush()
    draft.result_report_id, draft.finalization_key, draft.finalization_hash = (
        row.id,
        idempotency_key,
        digest,
    )
    event(db, row, user, "created", {"to": "Pending"})
    db.commit()
    return ok(report_data(row), "Laporan tersimpan")


@router.get("/reports/{report_id}", response_model=Envelope[ReportRead])
def detail(report_id: UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return ok(report_data(owned(db, user, report_id)))


@router.patch("/reports/{report_id}", response_model=Envelope[ReportRead])
def edit(
    report_id: UUID,
    body: ReportUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    row = owned(db, user, report_id, lock=True)
    check_revision(row, body.revision)
    if user.role != "admin" and row.status != "Pending":
        raise HTTPException(409, "Laporan hanya dapat diedit saat menunggu")
    changed = row.description != body.description
    if body.draft_id:
        draft = get_draft(db, user, body.draft_id)
        old_paths = (row.image_path, row.thumbnail_path)
        apply_draft(row, draft)
        draft.result_report_id = row.id
        for path in old_paths:
            enqueue(db, path)
        changed = True
    if changed:
        row.description = body.description
        row.revision += 1
        event(db, row, user, "edited", {"photo_replaced": body.draft_id is not None})
        db.commit()
    return ok(report_data(row), "Laporan diperbarui")


@router.get("/reports/{report_id}/events", response_model=Envelope[list[EventRead]])
def history(report_id: UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned(db, user, report_id)
    rows = db.execute(
        select(ReportEvent, User.full_name)
        .outerjoin(User, ReportEvent.actor_id == User.id)
        .where(ReportEvent.report_id == report_id)
        .order_by(ReportEvent.created_at.desc(), ReportEvent.id.desc())
        .limit(100)
    ).all()
    return ok(
        [
            {
                "id": row.id,
                "kind": row.kind,
                "actor_name": name,
                "details": row.details,
                "reason": row.reason,
                "created_at": row.created_at,
            }
            for row, name in rows
        ]
    )


@router.patch("/reports/{report_id}/status", response_model=Envelope[StatusRead])
def update_status(
    report_id: UUID, body: StatusUpdate, user: User = Depends(admin), db: Session = Depends(get_db)
):
    row = owned(db, user, report_id, lock=True)
    check_revision(row, body.revision)
    transitions = {
        "Pending": {"In Progress", "Rejected"},
        "In Progress": {"Completed", "Rejected"},
        "Completed": {"Pending"},
        "Rejected": {"Pending"},
    }
    if body.status != row.status:
        if body.status not in transitions[row.status]:
            raise HTTPException(409, "Transisi status tidak diizinkan")
        reason = body.reason.strip()
        if (body.status == "Rejected" or row.status in {"Completed", "Rejected"}) and len(
            reason
        ) < 5:
            raise HTTPException(
                422, "Penolakan atau pembukaan ulang memerlukan alasan minimal 5 karakter"
            )
        event(
            db, row, user, "status_changed", {"from": row.status, "to": body.status}, reason or None
        )
        row.status, row.revision = body.status, row.revision + 1
        db.commit()
    return ok(
        {"id": row.id, "status": row.status, "updated_at": row.updated_at, "revision": row.revision}
    )


@router.patch("/reports/{report_id}/review", response_model=Envelope[ReportRead])
def review(
    report_id: UUID, body: ReviewUpdate, user: User = Depends(admin), db: Session = Depends(get_db)
):
    row = owned(db, user, report_id, lock=True)
    check_revision(row, body.revision)
    event(
        db,
        row,
        user,
        "category_reviewed",
        {"from": row.category, "to": body.category.value, "ai_category": row.ai_predicted_category},
        body.reason,
    )
    row.category, row.classification_state, row.revision = (
        body.category.value,
        "reviewed",
        row.revision + 1,
    )
    db.commit()
    return ok(report_data(row), "Kategori ditinjau; prediksi asli dipertahankan")


@router.delete("/reports/{report_id}", response_model=Envelope[None])
def delete_report(
    report_id: UUID, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    row = owned(db, user, report_id, lock=True)
    enqueue(db, row.image_path)
    enqueue(db, row.thumbnail_path)
    db.delete(row)
    db.commit()
    return ok(message="Laporan dihapus; pembersihan foto dijadwalkan")


@router.get("/stats/summary", tags=["Statistics"], response_model=Envelope[SummaryRead])
def summary(user: User = Depends(current_user), db: Session = Depends(get_db)):
    base = scoped(user).subquery()
    categories: dict[str, int] = dict(
        db.execute(select(base.c.category, func.count()).group_by(base.c.category)).all()
    )
    statuses: dict[str, int] = dict(
        db.execute(select(base.c.status, func.count()).group_by(base.c.status)).all()
    )
    recent = db.scalars(
        scoped(user).order_by(Report.created_at.desc(), Report.id.desc()).limit(5)
    ).all()
    return ok(
        {
            "total_reports": sum(categories.values()),
            "by_category": {c: categories.get(c, 0) for c in CLASSES},
            "by_status": {s: statuses.get(s, 0) for s in STATUSES},
            "recent_reports": [
                {"id": r.id, "category": r.category, "status": r.status, "created_at": r.created_at}
                for r in recent
            ],
        }
    )


@router.post("/predict", tags=["Machine Learning"], response_model=Envelope[PredictionRead])
async def predict(request: Request, image: UploadFile = File(), user: User = Depends(current_user)):
    limit(request, "predict", 30, str(user.id))
    content = await sanitize_upload(image)
    try:
        result = await run_in_threadpool(predictor.predict, content)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(503, "Model belum tersedia; coba lagi nanti") from exc
    if result is None:
        raise HTTPException(503, "Model belum tersedia; coba lagi nanti")
    return ok(result)
