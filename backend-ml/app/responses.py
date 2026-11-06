from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas import Category, Status


class Envelope[T](BaseModel):
    success: bool = True
    message: str
    data: T


class UserRead(BaseModel):
    id: UUID
    email: str
    full_name: str
    public_name_visible: bool
    role: str
    created_at: datetime
    updated_at: datetime


class TokenRead(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: UserRead


class AuthConfigRead(BaseModel):
    provider: Literal["local", "supabase"]
    supabase_url: str | None
    supabase_publishable_key: str | None
    web_url: str


class Pagination(BaseModel):
    current_page: int
    per_page: int
    total_items: int
    total_pages: int


class ReportRead(BaseModel):
    id: UUID
    user_id: UUID
    user_name: str
    category: Category
    description: str
    latitude: float
    longitude: float
    status: Status
    ai_predicted_category: Category | None
    ai_confidence: float | None
    ai_model_version: str | None
    created_at: datetime
    updated_at: datetime
    image_url: str
    image_url_expires_at: datetime
    thumbnail_url: str
    revision: int
    classification_state: str
    photo_source: str | None
    captured_at: datetime | None
    location_source: str
    location_recorded_at: datetime | None
    location_accuracy_m: float | None


class DraftRead(BaseModel):
    id: UUID
    image_url: str
    image_url_expires_at: datetime
    prediction: dict | None
    classification_state: str
    expires_at: datetime
    photo_source: str
    captured_at: datetime | None
    latitude: float | None
    longitude: float | None
    location_source: str
    location_recorded_at: datetime | None
    location_accuracy_m: float | None


class EventRead(BaseModel):
    id: UUID
    kind: str
    actor_name: str | None
    details: dict
    reason: str | None
    created_at: datetime


class CohortRead(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    needs_review: int


class TrendPoint(BaseModel):
    date: str
    count: int


class AdminDashboardRead(BaseModel):
    generated_at: datetime
    date_from: datetime
    date_to: datetime
    timezone: str
    category: Category | None
    status: Status | None
    cohort: CohortRead
    previous_total: int
    change_percent: float | None
    backlog: dict[str, int]
    queue: list[ReportRead]
    review_queue: list[ReportRead]
    trend: list[TrendPoint]
    median_response_hours: float | None
    median_completion_hours: float | None


class ReportsPage(BaseModel):
    reports: list[ReportRead]
    pagination: Pagination


class AdminUserRead(UserRead):
    report_count: int


class UsersPage(BaseModel):
    users: list[AdminUserRead]
    pagination: Pagination


class PredictionRead(BaseModel):
    category: Category
    confidence: float
    probabilities: dict[str, float]
    model_version: str


class CategoryRead(BaseModel):
    id: Category
    name: str
    english_name: str
    description: str
    action: str
    family: str


class RecentReport(BaseModel):
    id: UUID
    category: Category
    status: Status
    created_at: datetime


class SummaryRead(BaseModel):
    total_reports: int
    by_category: dict[str, int]
    by_status: dict[str, int]
    recent_reports: list[RecentReport]


class StatusRead(BaseModel):
    id: UUID
    status: Status
    updated_at: datetime
    revision: int


class FieldError(BaseModel):
    field: str
    message: str


class ValidationErrors(BaseModel):
    errors: list[FieldError]


class ErrorEnvelope(BaseModel):
    success: Literal[False] = False
    message: str
    data: ValidationErrors | None = None


class LiveRead(BaseModel):
    status: Literal["alive"]


class ReadyRead(BaseModel):
    status: Literal["ready", "unavailable"]
    database: Literal["ready", "unavailable"]
    storage: Literal["ready", "unavailable"]
    model: Literal["ready", "unavailable"]
    workers: dict[str, Literal["ready", "unavailable", "not_required"]]
