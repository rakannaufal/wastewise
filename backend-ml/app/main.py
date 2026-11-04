import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.auth import router as auth_router
from app.community import router as community_router
from app.config import settings
from app.dashboard import router as dashboard_router
from app.db import engine
from app.drafts import router as drafts_router
from app.http_pool import close_http_pool
from app.inference import predictor
from app.regions import router as regions_router
from app.reports import ok
from app.reports import router as reports_router
from app.responses import Envelope, ErrorEnvelope, LiveRead, ReadyRead
from app.storage import storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("wastewise")
logging.getLogger("uvicorn.access").disabled = True


@asynccontextmanager
async def lifespan(app):
    predictor.load()
    try:
        yield
    finally:
        close_http_pool()


app = FastAPI(
    title="WasteWise API",
    version="1.0.0",
    description="Private waste reports and 12-category image classification. Confidence is a model estimate, not a safety guarantee.",
    lifespan=lifespan,
    responses={
        code: {"model": ErrorEnvelope}
        for code in (400, 401, 403, 404, 409, 413, 415, 422, 429, 500, 503)
    },
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
    expose_headers=["X-Request-ID"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id = str(uuid.uuid4())
    start = time.monotonic()
    # Bound the entire multipart request before parsing; do not trust Content-Length.
    maximum = 6 * 1024 * 1024
    size = 0
    receive = request._receive

    async def bounded_receive():
        nonlocal size
        message = await receive()
        size += len(message.get("body", b""))
        if size > maximum:
            raise HTTPException(413, "Permintaan terlalu besar")
        return message

    request._receive = bounded_receive
    response = await call_next(request)
    response.headers.update(
        {
            "X-Request-ID": request.state.request_id,
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            "Cache-Control": "no-store",
        }
    )
    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
    if request.url.path not in {"/docs", "/redoc"}:
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    route = request.scope.get("route")
    logger.info(
        "request id=%s method=%s route=%s status=%s ms=%.1f",
        request.state.request_id,
        request.method,
        route.path if route else "unmatched",
        response.status_code,
        (time.monotonic() - start) * 1000,
    )
    return response


@app.exception_handler(StarletteHTTPException)
async def http_error(request, exc):
    return JSONResponse(
        {"success": False, "message": str(exc.detail), "data": None},
        status_code=exc.status_code,
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    return JSONResponse(
        {
            "success": False,
            "message": "Data tidak valid",
            "data": {
                "errors": [
                    {"field": ".".join(map(str, error["loc"])), "message": error["msg"]}
                    for error in exc.errors()
                ]
            },
        },
        status_code=422,
    )


@app.exception_handler(Exception)
async def unexpected_error(request, exc):
    logger.error(
        "unhandled_error id=%s type=%s",
        getattr(request.state, "request_id", "unknown"),
        type(exc).__name__,
    )
    return JSONResponse(
        {"success": False, "message": "Terjadi gangguan server", "data": None}, status_code=500
    )


@app.get("/health/live", tags=["Health"], response_model=Envelope[LiveRead])
def live():
    return ok({"status": "alive"})


@app.get(
    "/health/ready",
    tags=["Health"],
    response_model=Envelope[ReadyRead],
    responses={503: {"model": Envelope[ReadyRead]}},
)
def ready():
    database, images = "ready", "ready"
    workers = {"cleanup": "not_required", "community": "not_required"}
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1 FROM app_private.users LIMIT 1"))
            if settings.environment == "production":
                connection.execute(text("SELECT 1 FROM app_private.auth_deletion_jobs LIMIT 1"))
                cutoff = datetime.now(UTC) - timedelta(seconds=120)
                rows = connection.execute(
                    text(
                        "SELECT worker_name FROM app_private.worker_heartbeats "
                        "WHERE worker_name IN ('cleanup', 'community') "
                        "AND heartbeat_at >= :cutoff"
                    ),
                    {"cutoff": cutoff},
                )
                fresh = {row[0] for row in rows}
                workers = {
                    name: "ready" if name in fresh else "unavailable"
                    for name in ("cleanup", "community")
                }
    except Exception:
        database = "unavailable"
        if settings.environment == "production":
            workers = {"cleanup": "unavailable", "community": "unavailable"}
    try:
        storage.ready()
    except Exception:
        images = "unavailable"
    model = "ready" if predictor.net is not None else "unavailable"
    workers_ready = all(value in {"ready", "not_required"} for value in workers.values())
    healthy = database == images == model == "ready" and workers_ready
    return JSONResponse(
        ok(
            {
                "status": "ready" if healthy else "unavailable",
                "database": database,
                "storage": images,
                "model": model,
                "workers": workers,
            }
        ),
        status_code=200 if healthy else 503,
    )


@app.get("/api/v1/media/{token}", include_in_schema=False)
def media(token: str):
    if not storage.local:
        raise HTTPException(404)
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=["HS256"],
            audience="wastewise-media",
            options={"require": ["exp", "key"]},
        )
        path = storage.path(payload["key"])
        if not path.is_file():
            raise HTTPException(404, "Foto tidak ditemukan")
        return FileResponse(path, media_type="image/jpeg")
    except (jwt.InvalidTokenError, ValueError, KeyError) as exc:
        raise HTTPException(403, "Tautan foto tidak valid atau kedaluwarsa") from exc


app.include_router(auth_router)
app.include_router(reports_router)
app.include_router(drafts_router)
app.include_router(dashboard_router)
app.include_router(community_router)
app.include_router(regions_router)
