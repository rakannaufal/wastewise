import threading
import time
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from uuid import UUID

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import User

bearer = HTTPBearer(auto_error=False)
events: dict[tuple[str, str], deque[float]] = defaultdict(deque)
guard = threading.Lock()
DUMMY_HASH = bcrypt.hashpw(b"WasteWiseDummy1!", bcrypt.gensalt(rounds=12))


def limit(request: Request, scope: str, maximum: int, identity: str | None = None):
    if not settings.rate_limit_enabled:
        return
    key = (scope, identity or (request.client.host if request.client else "unknown"))
    timestamp = time.monotonic()
    with guard:
        for stale in [
            key for key, queue in events.items() if not queue or queue[-1] < timestamp - 60
        ]:
            del events[stale]
        queue = events[key]
        while queue and queue[0] < timestamp - 60:
            queue.popleft()
        if len(queue) >= maximum:
            raise HTTPException(
                429,
                "Terlalu banyak permintaan. Coba lagi satu menit.",
                headers={"Retry-After": "60"},
            )
        queue.append(timestamp)


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
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    if settings.auth_provider == "supabase":
        from app.supabase_auth import profile_for, verified_identity

        if credentials is None:
            raise HTTPException(
                401, "Masuk untuk melanjutkan", headers={"WWW-Authenticate": "Bearer"}
            )
        return profile_for(verified_identity(credentials.credentials), db)
    try:
        if credentials is None:
            raise ValueError("Missing credentials")
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


def admin(user: User = Depends(current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Akses pengelola diperlukan")
    return user
