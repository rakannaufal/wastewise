import hashlib
import hmac
from datetime import UTC, datetime, timedelta
from ipaddress import ip_address
from uuid import UUID

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import RateLimitWindow, User

bearer = HTTPBearer(auto_error=False)
DUMMY_HASH = bcrypt.hashpw(b"WasteWiseDummy1!", bcrypt.gensalt(rounds=12))


def client_ip(request: Request):
    peer_host = request.client.host if request.client else "unknown"
    try:
        peer = ip_address(peer_host)
    except ValueError:
        return peer_host

    networks = settings.trusted_proxy_networks

    def trusted(address):
        return any(
            address.version == network.version and address in network for network in networks
        )

    if not trusted(peer):
        return str(peer)
    forwarded = request.headers.get("x-forwarded-for")
    if not forwarded:
        return str(peer)
    try:
        chain = [ip_address(value.strip()) for value in forwarded.split(",")]
    except ValueError:
        return str(peer)
    if not chain:
        return str(peer)

    client = peer
    for address in reversed(chain):
        if not trusted(client):
            break
        client = address
    return str(client)


def limit(
    request: Request,
    scope: str,
    maximum: int,
    identity: str | None,
    db: Session,
):
    if not settings.rate_limit_enabled:
        return
    subject = identity or client_ip(request)
    raw_key = f"{scope}:{subject}".encode()
    secret = settings.jwt_secret.get_secret_value().encode()
    bucket_key = hmac.new(secret, raw_key, hashlib.sha256).hexdigest()
    now = datetime.now(UTC)
    window = now.replace(second=0, microsecond=0)
    statement = (
        insert(RateLimitWindow)
        .values(bucket_key=bucket_key, window_started_at=window, hits=1)
        .on_conflict_do_update(
            index_elements=[RateLimitWindow.bucket_key, RateLimitWindow.window_started_at],
            set_={"hits": func.least(RateLimitWindow.hits + 1, maximum + 1)},
        )
        .returning(RateLimitWindow.hits)
    )
    try:
        hits = db.scalar(statement)
        if hits is None:
            db.rollback()
            raise HTTPException(503, "Pembatasan permintaan sedang tidak tersedia")
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(503, "Pembatasan permintaan sedang tidak tersedia") from exc
    if hits > maximum:
        retry_after = max(1, int((window + timedelta(minutes=1) - now).total_seconds() + 0.999))
        raise HTTPException(
            429,
            "Terlalu banyak permintaan. Coba lagi sebentar.",
            headers={"Retry-After": str(retry_after)},
        )


def hash_password(value):
    return bcrypt.hashpw(value.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(value, hashed):
    if not hashed or len(value.encode()) > 72:
        return False
    return bcrypt.checkpw(value.encode(), hashed.encode())


def token_for(user):
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": str(user.id),
            "iat": now,
            "exp": now + timedelta(hours=1),
            "iss": "wastewise",
            "aud": "wastewise-api",
        },
        settings.jwt_secret.get_secret_value(),
        algorithm="HS256",
    )


def current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    if credentials is None:
        raise HTTPException(
            401, "Sesi tidak valid atau kedaluwarsa", headers={"WWW-Authenticate": "Bearer"}
        )
    if settings.auth_provider == "supabase":
        limit(request, "authenticated-api", 300, None, db)
        from app.supabase_auth import profile_for, verified_identity

        return profile_for(verified_identity(credentials.credentials), db)
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret.get_secret_value(),
            algorithms=["HS256"],
            issuer="wastewise",
            audience="wastewise-api",
            options={"require": ["sub", "iat", "exp"]},
        )
        user = db.get(User, UUID(payload["sub"]))
        if user is None or user.auth_provider != "local":
            raise ValueError("Deleted user")
        return user
    except (ValueError, jwt.InvalidTokenError) as exc:
        raise HTTPException(
            401, "Sesi tidak valid atau kedaluwarsa", headers={"WWW-Authenticate": "Bearer"}
        ) from exc


def optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    # A supplied malformed/expired credential must never downgrade to anonymous.
    if credentials is None:
        if request.headers.get("Authorization"):
            raise HTTPException(401, "Sesi tidak valid")
        return None
    return current_user(request, credentials, db)


def admin(user: User = Depends(current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Akses pengelola diperlukan")
    return user
