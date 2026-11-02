from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class Category(StrEnum):
    battery = "battery"
    biological = "biological"
    brown_glass = "brown-glass"
    cardboard = "cardboard"
    clothes = "clothes"
    green_glass = "green-glass"
    metal = "metal"
    paper = "paper"
    plastic = "plastic"
    shoes = "shoes"
    trash = "trash"
    white_glass = "white-glass"


Status = Literal["Pending", "In Progress", "Completed", "Rejected"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Credentials(StrictModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value


class Register(Credentials):
    full_name: str = Field(min_length=3, max_length=255)

    @field_validator("full_name", mode="before")
    @classmethod
    def trim_name(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("password")
    @classmethod
    def strong_password(cls, value):
        if (
            len(value.encode()) > 72
            or len(value) < 8
            or not all(
                (
                    any(c.islower() for c in value),
                    any(c.isupper() for c in value),
                    any(c.isdigit() for c in value),
                    any(not c.isalnum() for c in value),
                )
            )
        ):
            raise ValueError(
                "Use 8+ characters with uppercase, lowercase, number, symbol; maximum 72 UTF-8 bytes"
            )
        return value


class StatusUpdate(StrictModel):
    status: Status
    revision: int = Field(ge=1)
    reason: str = Field(default="", max_length=1000)


class LocationUpdate(StrictModel):
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    location_source: Literal["device_capture", "photo_exif", "device_upload_confirmed"]
    location_recorded_at: datetime | None = None
    location_accuracy_m: float | None = Field(default=None, ge=0, le=50, allow_inf_nan=False)
    confirmed: bool = False

    @model_validator(mode="after")
    def provenance(self):
        stamp = self.location_recorded_at
        if stamp is not None and (
            stamp.tzinfo is None or stamp > datetime.now(UTC) + timedelta(seconds=5)
        ):
            raise ValueError("Location time must be timezone-aware and not in the future")
        if self.location_source != "photo_exif":
            if stamp is None or self.location_accuracy_m is None:
                raise ValueError("Device GPS requires a timestamp and accuracy <=50m")
        if self.location_source == "device_upload_confirmed" and not self.confirmed:
            raise ValueError("Confirm the gallery photo was taken at this location")
        return self


class ReportCreate(StrictModel):
    draft_id: UUID
    description: str = Field(min_length=10, max_length=5000)

    @field_validator("description")
    @classmethod
    def trim_description(cls, value):
        value = value.strip()
        if len(value) < 10:
            raise ValueError("Description must contain at least 10 characters")
        return value


class ReportUpdate(StrictModel):
    revision: int = Field(ge=1)
    description: str = Field(min_length=10, max_length=5000)
    draft_id: UUID | None = None

    @field_validator("description")
    @classmethod
    def trim_description(cls, value):
        return ReportCreate.trim_description(value)


class ReviewUpdate(StrictModel):
    revision: int = Field(ge=1)
    category: Category
    reason: str = Field(min_length=5, max_length=1000)

    @field_validator("reason")
    @classmethod
    def trim_reason(cls, value):
        value = value.strip()
        if len(value) < 5:
            raise ValueError("Review requires a meaningful reason")
        return value


class UserUpdate(StrictModel):
    full_name: str | None = Field(default=None, min_length=3, max_length=255)
    role: Literal["admin", "user"] | None = None

    @model_validator(mode="after")
    def require_change(self):
        if not self.model_fields_set:
            raise ValueError("At least one update field is required")
        if self.full_name is not None:
            self.full_name = self.full_name.strip()
            if len(self.full_name) < 3:
                raise ValueError("Name must contain at least three characters")
        return self

    @field_validator("full_name", "role", mode="before")
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError("Explicit null is not accepted")
        return value
