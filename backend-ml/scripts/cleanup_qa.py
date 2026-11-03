"""Remove only the generated browser-test accounts on a local development database."""

import re

from sqlalchemy import select

from app.cleanup import run_once
from app.config import settings
from app.db import SessionLocal
from app.models import CommunityPost, Report, ReportDraft, User
from app.reports import enqueue

if settings.environment != "development" or settings.storage_backend != "local":
    raise SystemExit("QA cleanup is restricted to local development")
count = 0
with SessionLocal.begin() as db:
    candidates = db.scalars(select(User).where(User.full_name == "Penguji WasteWise")).all()
    for user in candidates:
        if not re.fullmatch(r"qa-\d{13}@example\.com", user.email):
            continue
        for model in (Report, ReportDraft, CommunityPost):
            for row in db.scalars(select(model).where(model.user_id == user.id)):
                enqueue(db, row.image_path)
                enqueue(db, row.thumbnail_path)
        db.delete(user)
        count += 1
while run_once():
    pass
print(f"Removed {count} generated QA accounts; processed due cleanup jobs")
