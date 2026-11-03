"""Reference region lookup and bounded authenticated map clusters."""

import math

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import String, func, select
from sqlalchemy.orm import Session

from app.community import filters, ok, public_eligible
from app.db import get_db
from app.models import CommunityPost, Region, Report, User
from app.schemas import Category, Status
from app.security import limit, optional_user

router = APIRouter(prefix="/api/v1", tags=["Regions and maps"])


@router.get("/regions", openapi_extra={"security": [{}]})
def regions(
    request: Request,
    parent: str | None = Query(None, max_length=16),
    search: str = Query("", max_length=100),
    level: int | None = Query(None, ge=1, le=4),
    user: User | None = Depends(optional_user),
    db: Session = Depends(get_db),
):
    limit(request, "public-regions", 120)
    q = select(Region)
    if parent is not None:
        q = q.where(Region.parent_code == parent)
    elif not search:
        q = q.where(Region.level == 1)
    if search:
        q = q.where(Region.name.icontains(search, autoescape=True))
    if level:
        q = q.where(Region.level == level)
    rows = list(db.scalars(q.order_by(Region.name, Region.code).limit(201)))
    return ok(
        {
            "regions": [
                dict(code=r.code, parent_code=r.parent_code, level=r.level, name=r.name)
                for r in rows[:200]
            ],
            "truncated": len(rows) > 200,
        }
    )


@router.get("/community/map", openapi_extra={"security": [{}]})
def map_points(
    request: Request,
    bbox: str = Query("94,-12,142,7", max_length=120),
    zoom: int = Query(4, ge=2, le=20),
    region_code: str | None = Query(None, max_length=16),
    category: Category | None = None,
    status: Status | None = None,
    user: User | None = Depends(optional_user),
    db: Session = Depends(get_db),
):
    limit(request, "public-map", 120)
    try:
        west, south, east, north = [float(v) for v in bbox.split(",")]
        if not all(math.isfinite(x) for x in (west, south, east, north)) or not (
            -180 <= west < east <= 180 and -90 <= south < north <= 90
        ):
            raise ValueError()
    except ValueError as exc:
        raise HTTPException(422, "Area peta tidak valid") from exc
    cell = 360 / (2**zoom) / 4
    gx, gy = func.floor(Report.longitude / cell), func.floor(Report.latitude / cell)
    q = (
        select(
            func.count().label("cluster_count"),
            func.avg(Report.longitude).label("lng"),
            func.avg(Report.latitude).label("lat"),
            func.min(CommunityPost.id.cast(String)).label("post_id"),
        )
        .select_from(CommunityPost)
        .join(Report, Report.id == CommunityPost.report_id)
        .where(
            public_eligible(),
            Report.longitude >= west,
            Report.longitude <= east,
            Report.latitude >= south,
            Report.latitude <= north,
        )
    )
    q = filters(q, db, region_code, category, status)
    rows = db.execute(q.group_by(gx, gy).order_by(gx, gy).limit(501)).all()
    return ok(
        {
            "features": [
                dict(
                    count=r.cluster_count,
                    longitude=float(r.lng),
                    latitude=float(r.lat),
                    post_id=r.post_id if r.cluster_count == 1 else None,
                )
                for r in rows[:500]
            ],
            "truncated": len(rows) > 500,
        }
    )
