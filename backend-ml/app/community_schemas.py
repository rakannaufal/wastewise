from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas import StrictModel


class CaptionBody(StrictModel):
    @field_validator("caption", "reason", check_fields=False, mode="before")
    @classmethod
    def trimmed(cls, value):
        return "" if value is None else value.strip() if isinstance(value, str) else value


class PublishPost(CaptionBody):
    report_id: UUID
    caption: str = Field(default="", max_length=5000)
    consent: Literal[True]
    publication_policy: Literal["public-gps-v2"]


class EditPost(CaptionBody):
    caption: str = Field(max_length=5000)
    revision: int = Field(ge=1)


class CommentCreate(StrictModel):
    body: str = Field(min_length=1, max_length=1000)
    request_id: UUID

    @field_validator("body")
    @classmethod
    def normalize(cls, value):
        import unicodedata

        value = unicodedata.normalize("NFC", value).strip()
        if not value:
            raise ValueError("Komentar tidak boleh kosong")
        return value


class Moderation(CaptionBody):
    state: Literal["hidden", "published"]
    reason: str = Field(min_length=5, max_length=1000)
    revision: int = Field(ge=1)


class FlagCreate(CaptionBody):
    post_id: UUID
    reason: str = Field(min_length=5, max_length=1000)


class PostRead(StrictModel):
    id: UUID
    author_name: str
    is_owner: bool
    caption: str
    state: str
    image_url: str | None
    image_url_expires_at: datetime | None
    category: str
    classification_state: str
    status: str
    latitude: float
    longitude: float
    location_source: str
    location_accuracy_m: float | None
    location_label: str | None
    location_state: str
    region_code: str | None
    like_count: int
    comment_count: int
    liked_by_me: bool
    revision: int
    created_at: datetime


class FeedRead(StrictModel):
    posts: list[PostRead]
    next_cursor: str | None
