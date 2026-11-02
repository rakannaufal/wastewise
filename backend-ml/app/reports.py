import logging
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.db import get_db
from app.inference import predictor
from app.models import STATUSES, CleanupJob, Report, User
from app.responses import (
    CategoryRead,
    Envelope,
    PredictionRead,
    ReportRead,
    ReportsPage,
    StatusRead,
    SummaryRead,
)
from app.schemas import Category, Status, StatusUpdate
from app.security import admin, current_user, limit
from app.storage import sanitize_upload, storage
from ml.common import CATEGORIES, CLASSES

router = APIRouter(prefix="/api/v1", tags=["Reports"])
logger = logging.getLogger(__name__)


def ok(data=None, message="Berhasil"):
    return {"success": True, "message": message, "data": data}


def report_data(report):
    url, expires = storage.signed(report.image_path)
    return {
        "id": report.id,
        "user_id": report.user_id,
        "user_name": report.user.full_name,
        "category": report.category,
        "description": report.description,
        "latitude": float(report.latitude),
        "longitude": float(report.longitude),
        "status": report.status,
        "ai_predicted_category": report.ai_predicted_category,
        "ai_confidence": float(report.ai_confidence) if report.ai_confidence is not None else None,
        "ai_model_version": report.ai_model_version,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
        "image_url": url,
        "image_url_expires_at": expires,
    }


def scoped(user):
    return (
        select(Report) if user.role == "admin" else select(Report).where(Report.user_id == user.id)
    )


def owned(db, user, report_id):
    report = db.scalar(scoped(user).where(Report.id == report_id))
    if report is None:
        raise HTTPException(404, "Laporan tidak ditemukan")
    return report


def enqueue(db, path):
    db.add(CleanupJob(object_path=path, bucket=settings.storage_bucket))


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
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = db.scalars(
        query.order_by(Report.created_at.desc(), Report.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()
    return ok(
        {
            "reports": [report_data(row) for row in rows],
            "pagination": {
                "current_page": page,
                "per_page": per_page,
                "total_items": total,
                "total_pages": (total + per_page - 1) // per_page,
            },
        }
    )


@router.post("/reports", status_code=201, response_model=Envelope[ReportRead])
async def create_report(
    request: Request,
    image: UploadFile = File(),
    category: Category = Form(),
    description: str = Form(min_length=10, max_length=5000),
    latitude: float = Form(ge=-90, le=90, allow_inf_nan=False),
    longitude: float = Form(ge=-180, le=180, allow_inf_nan=False),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    form = await request.form()
    if set(form) - {"image", "category", "description", "latitude", "longitude"} or any(
        len(form.getlist(key)) != 1 for key in form
    ):
        raise HTTPException(422, "Field laporan tidak dikenal atau berulang")
    if len(description.strip()) < 10:
        raise HTTPException(422, "Deskripsi minimal 10 karakter")
    limit(request, "report", 30, str(user.id))
    content = await sanitize_upload(image)
    try:
        prediction = await run_in_threadpool(predictor.predict, content)
    except (RuntimeError, ValueError):
        prediction = None
        logger.warning("report_inference_unavailable")
    try:
        path = await run_in_threadpool(storage.put, str(user.id), content)
    except (OSError, Exception) as exc:
        logger.error("storage_upload_failed", extra={"error_type": type(exc).__name__})
        raise HTTPException(503, "Penyimpanan foto belum tersedia") from exc
    row = Report(
        user_id=user.id,
        category=category.value,
        description=description.strip(),
        latitude=latitude,
        longitude=longitude,
        image_path=path,
        ai_predicted_category=prediction["category"] if prediction else None,
        ai_confidence=prediction["confidence"] if prediction else None,
        ai_model_version=prediction["model_version"] if prediction else None,
    )
    try:
        db.add(row)
        db.commit()
        db.refresh(row)
    except Exception:
        db.rollback()
        try:
            storage.delete(path)
        except Exception:
            enqueue(db, path)
            db.commit()
            logger.error("upload_compensation_queued")
        raise
    return ok(report_data(row), "Laporan tersimpan")


@router.get("/reports/{report_id}", response_model=Envelope[ReportRead])
def detail(report_id: UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return ok(report_data(owned(db, user, report_id)))


@router.patch("/reports/{report_id}/status", response_model=Envelope[StatusRead])
def update_status(
    report_id: UUID, body: StatusUpdate, user: User = Depends(admin), db: Session = Depends(get_db)
):
    row = owned(db, user, report_id)
    row.status = body.status
    db.commit()
    return ok({"id": row.id, "status": row.status, "updated_at": row.updated_at})


@router.delete("/reports/{report_id}", response_model=Envelope[None])
def delete_report(
    report_id: UUID, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    row = owned(db, user, report_id)
    enqueue(db, row.image_path)
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
        raise HTTPException(503, "Model belum tersedia; laporan manual tetap dapat dibuat") from exc
    if result is None:
        raise HTTPException(503, "Model belum tersedia; laporan manual tetap dapat dibuat")
    return ok(result)
