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
    status: Literal["ready", "degraded", "unavailable"]
    database: Literal["ready", "unavailable"]
    storage: Literal["ready", "unavailable"]
    model: Literal["ready", "unavailable"]
