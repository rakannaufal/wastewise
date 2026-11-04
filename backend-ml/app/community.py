"""Authenticated social projection; private report endpoints retain their original scope."""

import base64
import binascii
import json
from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, delete, false, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.community_schemas import (
    CommentCreate,
    EditPost,
    FeedRead,
    FlagCreate,
    Moderation,
    PostRead,
    PublishPost,
)
from app.db import get_db
from app.models import (
    CommunityAudit,
    CommunityPost,
    ContentFlag,
    PostComment,
    PostLike,
    Region,
    Report,
    User,
)
from app.responses import Envelope
from app.schemas import Category, Status
from app.security import admin, current_user, limit, optional_user
from app.storage import storage
from app.workflow import check_revision, enqueue_many, lock_request

router = APIRouter(prefix="/api/v1", tags=["Community"])


def ok(data=None, message="Berhasil"):
    return {"success": True, "message": message, "data": data}


PUBLIC_STATUSES = ("Pending", "In Progress", "Completed")
PUBLIC_POLICY = "public-gps-v2"


def public_eligible():
    return and_(
        CommunityPost.state == "published",
        CommunityPost.privacy_version == PUBLIC_POLICY,
        Report.status.in_(PUBLIC_STATUSES),
    )


def post_for(db, post_id, user, lock=False):
    # Report-first locks serialize interactions with report status transitions.
    report = (
        db.scalar(
            select(Report)
            .join(CommunityPost)
            .where(CommunityPost.id == post_id)
            .with_for_update(of=Report)
        )
        if lock
        else None
    )
    query = select(CommunityPost).where(CommunityPost.id == post_id)
    row = db.scalar(query.with_for_update() if lock else query)
    if row is None:
        raise HTTPException(404, "Posting tidak tersedia")
    report = report or db.get(Report, row.report_id)
    eligible = (
        row.state == "published"
        and row.privacy_version == PUBLIC_POLICY
        and report.status in PUBLIC_STATUSES
    )
    privileged = user is not None and (row.user_id == user.id or user.role == "admin")
    if report.status == "Rejected" or not (eligible or privileged):
        raise HTTPException(404, "Posting tidak tersedia")
    return row


def active_post(db, post_id, user, lock=True):
    row = post_for(db, post_id, user, lock=lock)
    if row.state != "published" or row.privacy_version != PUBLIC_POLICY:
        raise HTTPException(409, "Posting belum tersedia untuk interaksi")
    return row


def publish(db, report, user, caption):
    if report.status == "Rejected":
        raise HTTPException(409, "Laporan ditolak tidak dapat dipublikasikan")
    if report.user_id != user.id:
        raise HTTPException(403, "Hanya pemilik dapat membagikan laporan")
    lock_request(db, f"share:{report.id}")
    row = db.scalar(
        select(CommunityPost).where(CommunityPost.report_id == report.id).with_for_update()
    )
    if row and row.state == "hidden":
        raise HTTPException(409, "Posting disembunyikan moderator")
    if row is None:
        row = CommunityPost(
            report_id=report.id,
            user_id=user.id,
            caption=caption.strip(),
            source_image_path=report.image_path,
            privacy_version=PUBLIC_POLICY,
        )
        db.add(row)
    elif row.state == "withdrawn":
        row.caption, row.state, row.source_image_path = (
            caption.strip(),
            "processing",
            report.image_path,
        )
        row.attempts = 0
        from app.models import now

        row.next_attempt_at = now()
    row.privacy_version = PUBLIC_POLICY
    db.flush()
    db.add(
        CommunityAudit(
            post_id=row.id,
            actor_id=user.id,
            action="publication_policy",
            reason="Public photo and precise GPS: " + PUBLIC_POLICY,
        )
    )
    return row


def retire_media(db, rows):
    for row in rows:
        enqueue_many(db, [row.image_path, row.thumbnail_path])
        row.image_path = row.thumbnail_path = None


def project(db, rows, user):
    ids = [p.id for p in rows]
    likes = (
        dict(
            db.execute(
                select(PostLike.post_id, func.count())
                .where(PostLike.post_id.in_(ids))
                .group_by(PostLike.post_id)
            ).all()
        )
        if ids
        else {}
    )
    comments = (
        dict(
            db.execute(
                select(PostComment.post_id, func.count())
                .where(PostComment.post_id.in_(ids), PostComment.state == "visible")
                .group_by(PostComment.post_id)
            ).all()
        )
        if ids
        else {}
    )
    mine = (
        set(
            db.scalars(
                select(PostLike.post_id).where(
                    PostLike.post_id.in_(ids), PostLike.user_id == user.id
                )
            )
        )
        if ids and user is not None
        else set()
    )
    reports = {
        r.id: r
        for r in db.scalars(select(Report).where(Report.id.in_([p.report_id for p in rows])))
    }
    links = storage.signed_many(
        [p.image_path for p in rows if p.image_path and p.state == "published"]
    )
    result = []
    for p in rows:
        r = reports[p.report_id]
        url, expires = links.get(p.image_path, (None, None))
        result.append(
            dict(
                id=p.id,
                author_name="Warga",
                is_owner=user is not None and p.user_id == user.id,
                caption=p.caption,
                state=p.state,
                image_url=url,
                image_url_expires_at=expires,
                category=r.category,
                classification_state=r.classification_state,
                status=r.status,
                latitude=float(r.latitude),
                longitude=float(r.longitude),
                location_source=r.location_source,
                location_accuracy_m=float(r.location_accuracy_m)
                if r.location_accuracy_m is not None
                else None,
                location_label=p.location_label,
                location_state=p.location_state,
                region_code=p.region_code,
                like_count=likes.get(p.id, 0),
                comment_count=comments.get(p.id, 0),
                liked_by_me=p.id in mine,
                revision=p.revision,
                created_at=p.created_at,
            )
        )
    return result


def filters(query, db, region_code, category, status):
    if region_code:
        if db.get(Region, region_code) is None:
            raise HTTPException(422, "Wilayah tidak dikenal")
        query = query.where(
            or_(
                CommunityPost.region_code == region_code,
                CommunityPost.region_code.startswith(region_code + "."),
            )
        )
    if category:
        query = query.where(Report.category == category.value)
    if status:
        query = query.where(Report.status == status)
    return query


def decode_cursor(value):
    try:
        stamp, identity = json.loads(base64.urlsafe_b64decode(value))
        stamp = datetime.fromisoformat(stamp)
        if stamp.tzinfo is None:
            raise ValueError()
        return stamp, UUID(identity)
    except (ValueError, TypeError, binascii.Error, json.JSONDecodeError) as exc:
        raise HTTPException(422, "Cursor tidak valid") from exc


def cursor_for(row):
    return base64.urlsafe_b64encode(
        json.dumps([row.created_at.isoformat(), str(row.id)]).encode()
    ).decode()


@router.get("/community/feed", response_model=Envelope[FeedRead], openapi_extra={"security": [{}]})
def feed(
    request: Request,
    cursor: str | None = Query(None, max_length=256),
    region_code: str | None = Query(None, max_length=16),
    category: Category | None = None,
    status: Status | None = None,
    per_page: int = Query(15, ge=1, le=30),
    order: Literal["newest", "oldest"] = "newest",
    user: User | None = Depends(optional_user),
    db: Session = Depends(get_db),
):
    limit(request, "public-feed", 120, None, db)
    q = (
        select(CommunityPost)
        .join(Report, Report.id == CommunityPost.report_id)
        .where(
            or_(
                public_eligible(),
                and_(
                    CommunityPost.user_id == user.id if user else false(),
                    CommunityPost.state == "processing",
                    CommunityPost.privacy_version == PUBLIC_POLICY,
                    Report.status.in_(PUBLIC_STATUSES),
                ),
            )
        )
    )
    q = filters(q, db, region_code, category, status)
    if cursor:
        stamp, identity = decode_cursor(cursor)
        q = q.where(
            or_(
                CommunityPost.created_at > stamp
                if order == "oldest"
                else CommunityPost.created_at < stamp,
                and_(
                    CommunityPost.created_at == stamp,
                    CommunityPost.id > identity
                    if order == "oldest"
                    else CommunityPost.id < identity,
                ),
            )
        )
    ordering = (
        (CommunityPost.created_at.asc(), CommunityPost.id.asc())
        if order == "oldest"
        else (CommunityPost.created_at.desc(), CommunityPost.id.desc())
    )
    rows = list(db.scalars(q.order_by(*ordering).limit(per_page + 1)))
    return ok(
        {
            "posts": project(db, rows[:per_page], user),
            "next_cursor": cursor_for(rows[per_page - 1]) if len(rows) > per_page else None,
        }
    )


@router.get("/reports/{report_id}/publication", response_model=Envelope[PostRead | None])
def publication(report_id: UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    report = db.get(Report, report_id)
    if report is None or (report.user_id != user.id and user.role != "admin"):
        raise HTTPException(404, "Laporan tidak tersedia")
    row = db.scalar(select(CommunityPost).where(CommunityPost.report_id == report.id))
    return ok(project(db, [row], user)[0] if row else None)


@router.post("/community/posts", status_code=201, response_model=Envelope[PostRead])
def share(
    body: PublishPost,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limit(request, "share", 20, str(user.id), db)
    report = db.scalar(
        select(Report)
        .where(Report.id == body.report_id, Report.user_id == user.id)
        .with_for_update(of=Report)
    )
    if report is None:
        raise HTTPException(404, "Laporan tidak tersedia")
    row = publish(
        db, report, user, body.caption if "caption" in body.model_fields_set else report.description
    )
    db.commit()
    return ok(project(db, [row], user)[0], "Posting disiapkan")


@router.get(
    "/community/posts/{post_id}",
    response_model=Envelope[PostRead],
    openapi_extra={"security": [{}]},
)
def detail(
    post_id: UUID,
    request: Request,
    user: User | None = Depends(optional_user),
    db: Session = Depends(get_db),
):
    limit(request, "public-post", 120, None, db)
    return ok(project(db, [post_for(db, post_id, user)], user)[0])


@router.patch("/community/posts/{post_id}", response_model=Envelope[PostRead])
def edit(
    post_id: UUID, body: EditPost, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    row = post_for(db, post_id, user, lock=True)
    if row.user_id != user.id:
        raise HTTPException(403, "Hanya pemilik dapat mengedit caption")
    check_revision(row, body.revision)
    row.caption, row.revision = body.caption.strip(), row.revision + 1
    db.commit()
    return ok(project(db, [row], user)[0])


@router.delete("/community/posts/{post_id}", response_model=Envelope[None])
def unshare(post_id: UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = db.scalar(
        select(CommunityPost)
        .where(CommunityPost.id == post_id, CommunityPost.user_id == user.id)
        .with_for_update()
    )
    if row:
        if row.state != "hidden":
            row.state = "withdrawn"
        retire_media(db, [row])
        row.revision += 1
        db.commit()
    return ok(message="Publikasi dibatalkan; laporan tetap privat")


@router.put("/community/posts/{post_id}/like", response_model=Envelope[None])
def like(
    post_id: UUID,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limit(request, "like", 60, str(user.id), db)
    active_post(db, post_id, user)
    db.execute(insert(PostLike).values(post_id=post_id, user_id=user.id).on_conflict_do_nothing())
    db.commit()
    return ok()


@router.delete("/community/posts/{post_id}/like", response_model=Envelope[None])
def unlike(post_id: UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    active_post(db, post_id, user)
    db.execute(delete(PostLike).where(PostLike.post_id == post_id, PostLike.user_id == user.id))
    db.commit()
    return ok()


@router.get("/community/posts/{post_id}/comments", openapi_extra={"security": [{}]})
def comments(
    post_id: UUID,
    request: Request,
    parent_id: UUID | None = None,
    cursor: str | None = Query(None, max_length=256),
    user: User | None = Depends(optional_user),
    db: Session = Depends(get_db),
):
    limit(request, "public-comments", 120, None, db)
    active_post(db, post_id, user, lock=False)
    if parent_id is not None:
        parent = db.get(PostComment, parent_id)
        if (
            parent is None
            or parent.post_id != post_id
            or parent.parent_id is not None
            or parent.state != "visible"
        ):
            raise HTTPException(404, "Komentar utama tidak tersedia")
    q = (
        select(PostComment)
        .where(
            PostComment.post_id == post_id,
            PostComment.state == "visible",
            PostComment.parent_id == parent_id,
        )
    )
    if cursor:
        stamp, identity = decode_cursor(cursor)
        q = q.where(
            or_(
                PostComment.created_at < stamp,
                and_(PostComment.created_at == stamp, PostComment.id < identity),
            )
        )
    rows = list(
        db.scalars(q.order_by(PostComment.created_at.desc(), PostComment.id.desc()).limit(31))
    )
    counts = (
        dict(
            db.execute(
                select(PostComment.parent_id, func.count())
                    .where(
                    PostComment.parent_id.in_([c.id for c in rows[:30]]),
                    PostComment.state == "visible",
                )
                .group_by(PostComment.parent_id)
            ).all()
        )
        if parent_id is None and rows
        else {}
    )
    return ok(
        {
            "comments": [
                dict(
                    id=c.id,
                    parent_id=c.parent_id,
                    reply_count=counts.get(c.id, 0),
                    body=c.body,
                    author_name="Warga",
                    is_owner=user is not None and c.user_id == user.id,
                    created_at=c.created_at,
                )
                for c in rows[:30]
            ],
            "next_cursor": cursor_for(rows[29]) if len(rows) > 30 else None,
        }
    )


@router.post("/community/posts/{post_id}/comments", status_code=201)
def comment(
    post_id: UUID,
    body: CommentCreate,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limit(request, "comment", 20, str(user.id), db)
    active_post(db, post_id, user)
    if body.parent_id is not None:
        parent = db.get(PostComment, body.parent_id)
        if parent is None or parent.post_id != post_id or parent.state != "visible":
            raise HTTPException(404, "Komentar utama tidak tersedia")
        if parent.parent_id is not None:
            raise HTTPException(422, "Balas melalui komentar utama")
    lock_request(db, f"comment:{user.id}:{body.request_id}")
    row = db.scalar(
        select(PostComment).where(
            PostComment.user_id == user.id, PostComment.request_id == body.request_id
        )
    )
    if row and (row.post_id != post_id or row.body != body.body or row.parent_id != body.parent_id):
        raise HTTPException(409, "Kunci komentar sudah digunakan")
    if row is None:
        row = PostComment(
            post_id=post_id,
            user_id=user.id,
            request_id=body.request_id,
            body=body.body,
            parent_id=body.parent_id,
        )
        db.add(row)
        db.commit()
    return ok({"id": row.id}, "Komentar tersimpan")


@router.delete("/community/comments/{comment_id}", response_model=Envelope[None])
def delete_comment(
    comment_id: UUID, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    row = db.get(PostComment, comment_id)
    if row:
        db.scalar(
            select(Report)
            .join(CommunityPost)
            .where(CommunityPost.id == row.post_id)
            .with_for_update(of=Report)
        )
        db.scalar(select(CommunityPost).where(CommunityPost.id == row.post_id).with_for_update())
        db.refresh(row, with_for_update=True)
        if row.user_id != user.id and user.role != "admin":
            raise HTTPException(403, "Komentar bukan milikmu")
        row.state = "deleted"
        if row.parent_id is None:
            db.execute(
                update(PostComment).where(PostComment.parent_id == row.id).values(state="deleted")
            )
        if user.role == "admin" and row.user_id != user.id:
            db.add(
                CommunityAudit(
                    post_id=row.post_id,
                    actor_id=user.id,
                    action="comment_deleted",
                    reason=f"Admin removed comment {row.id}",
                )
            )
        db.commit()
    return ok()


@router.post("/community/flags", status_code=201)
def flag(
    body: FlagCreate,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limit(request, "flag", 10, str(user.id), db)
    active_post(db, body.post_id, user)
    db.execute(
        insert(ContentFlag)
        .values(post_id=body.post_id, user_id=user.id, reason=body.reason)
        .on_conflict_do_nothing()
    )
    db.commit()
    return ok(message="Laporan konten diterima pengelola")


@router.get("/admin/community/flags")
def flags(user: User = Depends(admin), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(ContentFlag)
        .where(ContentFlag.state == "open")
        .order_by(ContentFlag.created_at)
        .limit(100)
    ).all()
    return ok(
        [dict(id=r.id, post_id=r.post_id, reason=r.reason, created_at=r.created_at) for r in rows]
    )


@router.patch("/admin/community/posts/{post_id}", response_model=Envelope[PostRead])
def moderate(
    post_id: UUID, body: Moderation, user: User = Depends(admin), db: Session = Depends(get_db)
):
    row = post_for(db, post_id, user, lock=True)
    check_revision(row, body.revision)
    if body.state == "published" and (not row.image_path or row.state == "withdrawn"):
        raise HTTPException(409, "Foto tidak tersedia atau publikasi dicabut pemilik")
    row.state, row.revision = body.state, row.revision + 1
    db.add(CommunityAudit(post_id=row.id, actor_id=user.id, action=body.state, reason=body.reason))
    for f in db.scalars(
        select(ContentFlag).where(ContentFlag.post_id == post_id, ContentFlag.state == "open")
    ):
        f.state = "resolved"
    db.commit()
    return ok(project(db, [row], user)[0])
