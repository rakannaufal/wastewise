from enum import StrEnum
from typing import Literal

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
