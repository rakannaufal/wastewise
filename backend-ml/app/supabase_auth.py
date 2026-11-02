"""Validate identities with Supabase Auth; application roles remain in PostgreSQL."""

from uuid import UUID

import httpx
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models import BlockedIdentity, User


def verified_identity(token: str) -> dict:
    try:
        with httpx.Client(timeout=10, follow_redirects=False) as client:
            response = client.get(
                settings.supabase_url.rstrip("/") + "/auth/v1/user",
                headers={
                    "apikey": settings.supabase_publishable_key,
                    "Authorization": "Bearer " + token,
                },
            )
        if response.status_code in {401, 403}:
            raise HTTPException(401, "Sesi Supabase tidak valid atau kedaluwarsa")
        if response.status_code != 200:
            raise HTTPException(503, "Layanan autentikasi belum tersedia. Coba kembali.")
        data = response.json()
        UUID(data["id"])
        if not data.get("email_confirmed_at") or data.get("is_anonymous"):
            raise HTTPException(401, "Konfirmasi email sebelum masuk")
        if not isinstance(data.get("email"), str) or "@" not in data["email"]:
            raise ValueError("Missing verified email")
        return data
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
        raise HTTPException(503, "Layanan autentikasi belum tersedia. Coba kembali.") from exc


def profile_for(identity: dict, db: Session) -> User:
    subject = UUID(identity["id"])
    # Deleted profiles must not reappear when an existing provider token is used again.
    db.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:identity, 0))"),
        {"identity": str(subject)},
    )
    if db.get(BlockedIdentity, subject):
        raise HTTPException(403, "Akses akun aplikasi telah dinonaktifkan")
    email = identity["email"].strip().lower()
    user = db.get(User, subject)
    if user and user.auth_provider != "supabase":
        raise HTTPException(409, "Identitas akun perlu ditinjau pengelola")
    if user is None:
        if db.scalar(select(User.id).where(User.email == email)):
            raise HTTPException(409, "Email memiliki akun lokal. Hubungi pengelola untuk migrasi.")
        metadata = identity.get("user_metadata")
        name = metadata.get("full_name") if isinstance(metadata, dict) else None
        name = name.strip()[:255] if isinstance(name, str) else ""
        if len(name) < 3:
            name = "Pengguna WasteWise"
        user = User(id=subject, email=email, full_name=name, auth_provider="supabase", role="user")
        db.add(user)
    elif user.email != email:
        user.email = email
    else:
        db.commit()
        return user
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        existing = db.get(User, subject)
        if existing and existing.auth_provider == "supabase" and existing.email == email:
            return existing
        raise HTTPException(409, "Identitas akun perlu ditinjau pengelola") from exc
    return user
