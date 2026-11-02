import io
import uuid
import warnings
from datetime import UTC, datetime, timedelta

import httpx
import jwt
from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app.config import settings

MAX_BYTES = 5 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000


async def sanitize_upload(upload: UploadFile):
    raw = await upload.read(MAX_BYTES + 1)
    await upload.close()
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "Ukuran foto maksimal 5 MiB")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as decoded:
                if decoded.format not in {"JPEG", "PNG", "WEBP"}:
                    raise HTTPException(415, "Gunakan foto JPEG, PNG, atau WebP")
                decoded.load()
                image = ImageOps.exif_transpose(decoded).convert("RGB")
                image.thumbnail((2048, 2048))
                output = io.BytesIO()
                image.save(output, "JPEG", quality=90)
                return output.getvalue()
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise HTTPException(422, "Foto tidak valid atau dimensinya terlalu besar") from exc


class Storage:
    def __init__(self):
        self.local = settings.storage_backend == "local"
        if self.local:
            settings.storage_path.mkdir(parents=True, exist_ok=True, mode=0o700)

    def path(self, key):
        path = settings.storage_path / key
        if not path.resolve().is_relative_to(settings.storage_path.resolve()):
            raise ValueError("Invalid storage key")
        return path

    def request(self, method, suffix, **kwargs):
        with httpx.Client(timeout=15) as client:
            response = client.request(
                method,
                settings.supabase_url.rstrip("/") + "/storage/v1/" + suffix,
                headers={
                    "Authorization": "Bearer " + settings.supabase_service_key.get_secret_value(),
                    "apikey": settings.supabase_service_key.get_secret_value(),
                    **kwargs.pop("headers", {}),
                },
                **kwargs,
            )
            response.raise_for_status()
            return response

    def put(self, owner, content):
        key = f"{owner}/{uuid.uuid4()}.jpg"
        if self.local:
            path = self.path(key)
            path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            path.write_bytes(content)
            path.chmod(0o600)
        else:
            self.request(
                "POST",
                f"object/{settings.storage_bucket}/{key}",
                content=content,
                headers={"Content-Type": "image/jpeg", "x-upsert": "false", "cache-control": "0"},
            )
        return key

    def delete(self, key):
        if self.local:
            self.path(key).unlink(missing_ok=True)
        else:
            self.request("DELETE", f"object/{settings.storage_bucket}", json={"prefixes": [key]})

    def signed(self, key):
        expires = datetime.now(UTC) + timedelta(seconds=900)
        if self.local:
            token = jwt.encode(
                {"key": key, "exp": expires, "aud": "wastewise-media"},
                settings.jwt_secret.get_secret_value(),
                algorithm="HS256",
            )
            url = f"{settings.public_api_url}/api/v1/media/{token}"
        else:
            data = self.request(
                "POST", f"object/sign/{settings.storage_bucket}/{key}", json={"expiresIn": 900}
            ).json()
            url = settings.supabase_url.rstrip("/") + "/storage/v1" + data["signedURL"]
        return url, expires

    def ready(self):
        if self.local:
            probe = self.path(".health")
            probe.write_bytes(b"ok")
            probe.unlink()
        else:
            data = self.request("GET", "bucket/" + settings.storage_bucket).json()
            if data.get("public") is not False:
                raise ValueError("Storage bucket must be private")


storage = Storage()
