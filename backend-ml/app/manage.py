import argparse
import getpass
import json

from pydantic import ValidationError
from sqlalchemy import select, text

from app.config import settings
from app.db import SessionLocal
from app.models import User
from app.schemas import Register
from app.security import hash_password


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["create-admin", "promote-admin", "export-openapi"])
    parser.add_argument("--email")
    parser.add_argument("--name", default="WasteWise Admin")
    args = parser.parse_args()
    if args.command == "export-openapi":
        from app.config import ROOT
        from app.main import app

        (ROOT / "docs/openapi.json").write_text(json.dumps(app.openapi(), indent=2))
        return
    if not args.email:
        parser.error("--email is required")
    if args.command == "promote-admin":
        with SessionLocal.begin() as db:
            db.execute(text("SELECT pg_advisory_xact_lock(81744320)"))
            user = db.scalar(select(User).where(User.email == args.email.strip().lower()))
            if not user:
                raise SystemExit("User must confirm email and sign in to WasteWise first")
            user.role = "admin"
        print("Existing application user promoted")
        return
    if settings.auth_provider != "local":
        raise SystemExit("Register and confirm via Supabase, then use promote-admin --email")
    password = getpass.getpass("Admin password: ")
    try:
        body = Register(email=args.email, password=password, full_name=args.name)
    except ValidationError:
        raise SystemExit("Invalid email, name, or password strength") from None
    with SessionLocal.begin() as db:
        db.execute(text("SELECT pg_advisory_xact_lock(81744320)"))
        if db.scalar(select(User).where(User.email == str(body.email))):
            raise SystemExit("Email already exists")
        db.add(
            User(
                email=str(body.email),
                full_name=body.full_name,
                password_hash=hash_password(body.password),
                role="admin",
            )
        )
    print("Administrator created")


if __name__ == "__main__":
    main()
