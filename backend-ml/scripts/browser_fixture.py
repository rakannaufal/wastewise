"""Create a temporary administrator solely for local UI verification."""

import json
import secrets
import time

from app.config import ROOT, settings
from app.db import SessionLocal
from app.models import User
from app.security import hash_password

if settings.environment != "development" or settings.storage_backend != "local":
    raise SystemExit("Browser fixtures require local development")
email = f"qa-{int(time.time() * 1000)}@example.com"
password = "WasteWise1!" + secrets.token_hex(12)
with SessionLocal.begin() as db:
    db.add(
        User(
            email=email,
            password_hash=hash_password(password),
            full_name="Penguji WasteWise",
            role="admin",
        )
    )
path = ROOT / ".local/browser-admin.json"
path.write_text(json.dumps({"email": email, "password": password}))
path.chmod(0o600)
print("Temporary browser administrator prepared")
