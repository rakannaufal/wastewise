from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.account_deletion import schedule_account_deletion
from app.config import settings
from app.db import get_db
from app.models import Report, User
from app.reports import ok
from app.responses import AuthConfigRead, Envelope, TokenRead, UserRead, UsersPage
from app.schemas import AccountDeletion, Credentials, Register, UserUpdate
from app.security import (
    DUMMY_HASH,
    admin,
    current_user,
    hash_password,
    limit,
    token_for,
    verify_password,
)

router = APIRouter(prefix="/api/v1", tags=["Authentication"])


@router.get("/auth/config", response_model=Envelope[AuthConfigRead])
def auth_config():
    enabled = settings.auth_provider == "supabase"
    return ok(
        {
            "provider": settings.auth_provider,
            "supabase_url": settings.supabase_url if enabled else None,
            "supabase_publishable_key": settings.supabase_publishable_key if enabled else None,
            "web_url": settings.public_web_url,
        }
    )


def user_data(user):
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


@router.post("/auth/register", status_code=201, response_model=Envelope[UserRead])
def register(body: Register, request: Request, db: Session = Depends(get_db)):
    if settings.auth_provider != "local":
        raise HTTPException(409, "Pendaftaran menggunakan Supabase Auth pada aplikasi")
    limit(request, "register", 5, None, db)
    user = User(
        email=str(body.email), full_name=body.full_name, password_hash=hash_password(body.password)
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Email sudah terdaftar") from exc
    return ok(user_data(user), "Akun berhasil dibuat")


@router.post("/auth/login", response_model=Envelope[TokenRead])
def login(body: Credentials, request: Request, db: Session = Depends(get_db)):
    if settings.auth_provider != "local":
        raise HTTPException(409, "Login menggunakan Supabase Auth pada aplikasi")
    limit(request, "login", 10, None, db)
    user = db.scalar(select(User).where(User.email == str(body.email)))
    valid = verify_password(body.password, user.password_hash if user else DUMMY_HASH.decode())
    if user is None or not valid:
        raise HTTPException(401, "Email atau kata sandi salah")
    return ok(
        {
            "access_token": token_for(user),
            "token_type": "bearer",
            "expires_in": 3600,
            "user": user_data(user),
        }
    )


@router.get("/auth/me", response_model=Envelope[UserRead])
def me(user: User = Depends(current_user)):
    return ok(user_data(user))

@router.delete("/auth/me", status_code=202, response_model=Envelope[None])
def delete_me(
    body: AccountDeletion,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    limit(request, "delete-account", 5, str(user.id), db)
    password = body.password.get_secret_value()
    if settings.auth_provider == "supabase":
        from app.supabase_auth import verify_password as verify_supabase_password

        if not verify_supabase_password(user.id, user.email, password):
            raise HTTPException(401, "Kata sandi saat ini salah")
    elif not verify_password(password, user.password_hash):
        raise HTTPException(401, "Kata sandi saat ini salah")

    target = locked_user(db, user.id)
    db.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:identity, 0))"),
        {"identity": str(user.id)},
    )
    target = db.get(User, user.id, populate_existing=True)
    if target is None:
        raise HTTPException(404, "Akun tidak ditemukan")
    protect_last_admin(db, target)
    schedule_account_deletion(db, target)
    db.commit()
    return ok(message="Akun dinonaktifkan; pembersihan data dijadwalkan")


@router.get("/users", tags=["Administration"], response_model=Envelope[UsersPage])
def users(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=200),
    role: Literal["admin", "user"] | None = None,
    user: User = Depends(admin),
    db: Session = Depends(get_db),
):
    query = select(User)
    if search:
        query = query.where(
            User.full_name.icontains(search, autoescape=True)
            | User.email.icontains(search, autoescape=True)
        )
    if role:
        query = query.where(User.role == role)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    report_count = (
        select(func.count(Report.id))
        .where(Report.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )
    rows = db.execute(
        query.add_columns(report_count)
        .order_by(User.created_at.desc(), User.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    ).all()
    return ok(
        {
            "users": [{**user_data(row), "report_count": count} for row, count in rows],
            "pagination": {
                "current_page": page,
                "per_page": per_page,
                "total_items": total,
                "total_pages": (total + per_page - 1) // per_page,
            },
        }
    )


def locked_user(db, user_id):
    # Serializes every admin-membership change, including concurrent last-admin deletion.
    db.execute(text("SELECT pg_advisory_xact_lock(81744320)"))
    target = db.get(User, user_id, populate_existing=True)
    if target is None:
        raise HTTPException(404, "Pengguna tidak ditemukan")
    return target


def protect_last_admin(db, target):
    if (
        target.role == "admin"
        and db.scalar(select(func.count()).select_from(User).where(User.role == "admin")) <= 1
    ):
        raise HTTPException(409, "Minimal satu pengelola harus tetap tersedia")


@router.patch("/users/{user_id}", tags=["Administration"], response_model=Envelope[UserRead])
def update_user(
    user_id: UUID, body: UserUpdate, user: User = Depends(admin), db: Session = Depends(get_db)
):
    target = locked_user(db, user_id)
    db.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:identity, 0))"),
        {"identity": str(user_id)},
    )
    db.refresh(user)
    if user.role != "admin":
        raise HTTPException(403, "Akses pengelola diperlukan")
    if body.role is not None and body.role != target.role:
        protect_last_admin(db, target)
        target.role = body.role
    if body.full_name is not None:
        target.full_name = body.full_name
    db.commit()
    return ok(user_data(target))


@router.delete("/users/{user_id}", tags=["Administration"], response_model=Envelope[None])
def delete_user(user_id: UUID, user: User = Depends(admin), db: Session = Depends(get_db)):
    if user_id == user.id:
        raise HTTPException(409, "Pengelola tidak dapat menghapus akun sendiri")
    target = locked_user(db, user_id)
    db.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:identity, 0))"),
        {"identity": str(user_id)},
    )
    db.refresh(user)
    if user.role != "admin":
        raise HTTPException(403, "Akses pengelola diperlukan")
    protect_last_admin(db, target)
    schedule_account_deletion(db, target)
    db.commit()
    return ok(message="Akun dihapus; pembersihan data dijadwalkan")
