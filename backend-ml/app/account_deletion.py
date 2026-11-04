from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    AuthDeletionJob,
    BlockedIdentity,
    CommunityPost,
    Report,
    ReportDraft,
    User,
)
from app.reports import enqueue


def schedule_account_deletion(db: Session, user: User):
    if user.auth_provider == "supabase":
        if not settings.supabase_service_key.get_secret_value():
            raise HTTPException(503, "Penghapusan akun autentikasi belum dikonfigurasi")
        db.add(BlockedIdentity(id=user.id))
        db.add(AuthDeletionJob(user_id=user.id))

    for path, thumb in db.execute(
        select(Report.image_path, Report.thumbnail_path).where(Report.user_id == user.id)
    ):
        enqueue(db, path)
        enqueue(db, thumb)
    for path, thumb in db.execute(
        select(ReportDraft.image_path, ReportDraft.thumbnail_path).where(
            ReportDraft.user_id == user.id
        )
    ):
        enqueue(db, path)
        enqueue(db, thumb)

    from app.community import retire_media

    posts = db.scalars(select(CommunityPost).where(CommunityPost.user_id == user.id)).all()
    retire_media(db, posts)
    db.delete(user)
