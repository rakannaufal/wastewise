from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import STATUSES, Report, ReportEvent, User
from app.reports import ok
from app.responses import AdminDashboardRead, Envelope
from app.schemas import Category, Status
from app.security import admin
from app.workflow import report_list
from ml.common import CLASSES

router = APIRouter(prefix="/api/v1/admin", tags=["Administration"])


@router.get("/dashboard", response_model=Envelope[AdminDashboardRead])
def dashboard(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    timezone: str = "Asia/Jakarta",
    category: Category | None = None,
    status: Status | None = None,
    user: User = Depends(admin),
    db: Session = Depends(get_db),
):
    try:
        zone = ZoneInfo(timezone)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise HTTPException(422, "Zona waktu tidak valid") from exc
    now = datetime.now(UTC)
    end = date_to or now.astimezone(zone).replace(
        hour=0, minute=0, second=0, microsecond=0
    ) + timedelta(days=1)
    start = date_from or end - timedelta(days=30)
    if (
        start.tzinfo is None
        or end.tzinfo is None
        or not timedelta(0) < end - start <= timedelta(days=366)
    ):
        raise HTTPException(422, "Periode harus memiliki zona waktu, maksimal 366 hari")
    filters = []
    if category:
        filters.append(Report.category == category.value)
    if status:
        filters.append(Report.status == status)
    cohort = [*filters, Report.created_at >= start, Report.created_at < end]
    statuses = dict(
        db.execute(select(Report.status, func.count()).where(*cohort).group_by(Report.status)).all()
    )
    categories = dict(
        db.execute(
            select(Report.category, func.count()).where(*cohort).group_by(Report.category)
        ).all()
    )
    total = sum(statuses.values())
    needs_review = (
        db.scalar(
            select(func.count())
            .select_from(Report)
            .where(*cohort, Report.classification_state == "needs_review")
        )
        or 0
    )
    previous = (
        db.scalar(
            select(func.count())
            .select_from(Report)
            .where(*filters, Report.created_at >= start - (end - start), Report.created_at < start)
        )
        or 0
    )
    day = func.date(func.timezone(timezone, Report.created_at))
    daily: dict = dict(
        db.execute(select(day, func.count()).where(*cohort).group_by(day).order_by(day)).all()
    )
    trend = []
    cursor = start.astimezone(zone).date()
    while cursor <= (end.astimezone(zone) - timedelta(microseconds=1)).date():
        trend.append({"date": cursor.isoformat(), "count": daily.get(cursor, 0)})
        cursor += timedelta(days=1)
    backlog_filters = [Report.category == category.value] if category else []
    active = [*backlog_filters, Report.status.in_(["Pending", "In Progress"])]
    active_count = db.scalar(select(func.count()).select_from(Report).where(*active)) or 0
    review_count = (
        db.scalar(
            select(func.count())
            .select_from(Report)
            .where(*backlog_filters, Report.classification_state == "needs_review")
        )
        or 0
    )
    queue = db.scalars(
        select(Report).where(*active).order_by(Report.created_at.asc(), Report.id.asc()).limit(5)
    ).all()
    review_rows = db.scalars(
        select(Report)
        .where(*backlog_filters, Report.classification_state == "needs_review")
        .order_by(Report.created_at.asc(), Report.id.asc())
        .limit(5)
    ).all()
    complete = (ReportEvent.kind == "status_changed") & (
        ReportEvent.details["to"].astext == "Completed"
    )
    respond = (ReportEvent.kind == "status_changed") & (
        ReportEvent.details["to"].astext == "In Progress"
    )
    times = (
        select(
            Report.id,
            Report.created_at,
            func.min(case((complete, ReportEvent.created_at))).label("completed"),
            func.min(case((respond, ReportEvent.created_at))).label("responded"),
            func.count().filter(ReportEvent.kind == "created").label("tracked"),
        )
        .join(ReportEvent, ReportEvent.report_id == Report.id)
        .where(*cohort)
        .group_by(Report.id)
        .subquery()
    )

    def median(column):
        value = db.scalar(
            select(
                func.percentile_cont(0.5).within_group(
                    func.extract("epoch", column - times.c.created_at) / 3600
                )
            ).where(times.c.tracked > 0, column.is_not(None))
        )
        return round(float(value), 2) if value is not None else None

    return ok(
        {
            "generated_at": now,
            "date_from": start,
            "date_to": end,
            "timezone": timezone,
            "category": category,
            "status": status,
            "cohort": {
                "total": total,
                "by_status": {key: statuses.get(key, 0) for key in STATUSES},
                "by_category": {key: categories.get(key, 0) for key in CLASSES},
                "needs_review": needs_review,
            },
            "previous_total": previous,
            "change_percent": round((total - previous) / previous * 100, 1) if previous else None,
            "backlog": {"active": active_count, "needs_review": review_count},
            "queue": report_list(queue),
            "review_queue": report_list(review_rows),
            "trend": trend,
            "median_response_hours": median(times.c.responded),
            "median_completion_hours": median(times.c.completed),
        }
    )
