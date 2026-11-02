import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import Numeric

from ml.common import CLASSES

STATUSES = ["Pending", "In Progress", "Completed", "Rejected"]


def now():
    return datetime.now(UTC)


class Base(DeclarativeBase):
    metadata = MetaData(
        schema="app_private",
        naming_convention={
            "ix": "ix_%(table_name)s_%(column_0_name)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s",
            "pk": "pk_%(table_name)s",
        },
    )


class Timestamps:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


role_type = Enum("admin", "user", name="user_role", schema="app_private")
category_type = Enum(*CLASSES, name="waste_category", schema="app_private")
status_type = Enum(*STATUSES, name="report_status", schema="app_private")


class User(Timestamps, Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    auth_provider: Mapped[str] = mapped_column(String(16), default="local", server_default="local")
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(role_type, default="user", server_default="user")
    __table_args__ = (
        CheckConstraint(
            "(auth_provider = 'local' AND password_hash IS NOT NULL) OR (auth_provider = 'supabase' AND password_hash IS NULL)",
            name="provider_credentials",
        ),
        CheckConstraint("email = lower(btrim(email))", name="email_normalized"),
        CheckConstraint("char_length(btrim(full_name)) BETWEEN 3 AND 255", name="name_length"),
    )


class BlockedIdentity(Base):
    __tablename__ = "blocked_identities"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class LocationFields:
    photo_source: Mapped[str | None] = mapped_column(String(16))
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    location_source: Mapped[str] = mapped_column(
        String(32), default="legacy_unknown", server_default="legacy_unknown"
    )
    location_recorded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    location_accuracy_m: Mapped[float | None] = mapped_column(Numeric(10, 2))


class ReportDraft(LocationFields, Timestamps, Base):
    __tablename__ = "report_drafts"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("app_private.users.id", ondelete="CASCADE")
    )
    request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    image_path: Mapped[str] = mapped_column(Text, unique=True)
    thumbnail_path: Mapped[str] = mapped_column(Text)
    image_hash: Mapped[str] = mapped_column(String(64))
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 8))
    longitude: Mapped[float | None] = mapped_column(Numeric(11, 8))
    prediction: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))
    classification_state: Mapped[str] = mapped_column(String(24), default="analysis_failed")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    result_report_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    finalization_key: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    finalization_hash: Mapped[str | None] = mapped_column(String(64))
    __table_args__ = (
        UniqueConstraint("user_id", "request_id", name="uq_drafts_owner_request"),
        UniqueConstraint("user_id", "finalization_key", name="uq_drafts_owner_finalize"),
        CheckConstraint(
            "(latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)",
            name="draft_coordinates",
        ),
        CheckConstraint(
            "(classification_state = 'analysis_failed' AND prediction IS NULL) OR (classification_state IN ('classified', 'needs_review') AND prediction IS NOT NULL)",
            name="draft_prediction",
        ),
        CheckConstraint(
            "photo_source IS NOT NULL AND photo_source IN ('camera', 'gallery') AND (photo_source <> 'camera' OR captured_at IS NOT NULL)",
            name="draft_photo_source",
        ),
        Index("ix_drafts_expiry", "expires_at"),
    )


class Report(LocationFields, Timestamps, Base):
    __tablename__ = "waste_reports"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("app_private.users.id", ondelete="CASCADE")
    )
    user: Mapped[User] = relationship(lazy="joined")
    category: Mapped[str] = mapped_column(category_type)
    description: Mapped[str] = mapped_column(Text)
    image_path: Mapped[str] = mapped_column(Text, unique=True)
    latitude: Mapped[float] = mapped_column(Numeric(10, 8))
    longitude: Mapped[float] = mapped_column(Numeric(11, 8))
    status: Mapped[str] = mapped_column(status_type, default="Pending", server_default="Pending")
    ai_predicted_category: Mapped[str | None] = mapped_column(category_type)
    ai_confidence: Mapped[float | None] = mapped_column(Numeric(5, 2))
    ai_model_version: Mapped[str | None] = mapped_column(Text)
    source_draft_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "app_private.report_drafts.id", ondelete="SET NULL", name="fk_reports_source_draft"
        )
    )
    thumbnail_path: Mapped[str | None] = mapped_column(Text)
    classification_state: Mapped[str] = mapped_column(
        String(24), default="legacy", server_default="legacy"
    )
    revision: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    __table_args__ = (
        UniqueConstraint("source_draft_id", name="uq_reports_source_draft"),
        CheckConstraint("revision >= 1", name="report_revision"),
        CheckConstraint(
            "classification_state = 'legacy' OR (classification_state IN ('classified', 'needs_review', 'reviewed') AND ai_predicted_category IS NOT NULL AND source_draft_id IS NOT NULL AND photo_source IS NOT NULL AND photo_source IN ('camera', 'gallery') AND location_source IN ('device_capture', 'photo_exif', 'device_upload_confirmed'))",
            name="report_automatic",
        ),
        CheckConstraint(
            "char_length(btrim(description)) BETWEEN 10 AND 5000", name="description_length"
        ),
        CheckConstraint("latitude BETWEEN -90 AND 90", name="latitude_range"),
        CheckConstraint("longitude BETWEEN -180 AND 180", name="longitude_range"),
        CheckConstraint(
            "ai_confidence IS NULL OR ai_confidence BETWEEN 0 AND 100", name="confidence_range"
        ),
        CheckConstraint(
            "(ai_predicted_category IS NULL AND ai_confidence IS NULL AND ai_model_version IS NULL) OR (ai_predicted_category IS NOT NULL AND ai_confidence IS NOT NULL AND ai_model_version IS NOT NULL)",
            name="ai_complete",
        ),
        Index("ix_reports_owner_created", "user_id", "created_at", "id"),
        Index("ix_reports_status_created", "status", "created_at"),
        Index("ix_reports_category_created", "category", "created_at"),
    )


class ReportEvent(Base):
    __tablename__ = "report_events"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("app_private.waste_reports.id", ondelete="CASCADE")
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("app_private.users.id", ondelete="SET NULL")
    )
    kind: Mapped[str] = mapped_column(String(32))
    details: Mapped[dict] = mapped_column(JSONB)
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (Index("ix_events_report_created", "report_id", "created_at"),)


class CleanupJob(Timestamps, Base):
    __tablename__ = "storage_cleanup_jobs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bucket: Mapped[str] = mapped_column(Text, default="waste-images")
    object_path: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error_code: Mapped[str | None] = mapped_column(String(100))
    __table_args__ = (
        UniqueConstraint("bucket", "object_path"),
        CheckConstraint("attempts >= 0", name="attempts_nonnegative"),
        CheckConstraint("status IN ('pending','processing','completed')", name="valid_status"),
        Index("ix_cleanup_due", "status", "next_attempt_at"),
    )
