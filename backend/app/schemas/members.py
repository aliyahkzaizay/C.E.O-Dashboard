"""Define the data accepted and returned by the member API."""

import re
from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


ClassYear = Literal[
    "first_year",
    "sophomore",
    "junior",
    "senior",
    "graduate",
    "other",
]


class MemberCreate(BaseModel):
    """Validate the information an officer submits to add a member."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    name: str = Field(min_length=1)
    email: str | None = None
    external_member_id: str | None = None
    date_joined: date | None = None
    class_year: ClassYear | None = None

    @field_validator(
        "email",
        "external_member_id",
        "date_joined",
        "class_year",
        mode="before",
    )
    @classmethod
    def empty_to_none(cls, value):
        """Treat empty optional fields as missing information."""
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        """Normalize email and reject basic formatting errors."""
        if value is None:
            return None

        value = value.lower()
        if len(value) > 254 or not re.fullmatch(
            r"[^\s@]+@[^\s@]+\.[^\s@]+", value
        ):
            raise ValueError("Enter a valid email address.")

        return value


class MemberUpdate(MemberCreate):
    """Validate a partial edit: omitted fields stay unchanged; null clears optional fields."""

    name: str | None = Field(default=None, min_length=1)

    @field_validator("name")
    @classmethod
    def require_supplied_name(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Name cannot be cleared.")
        return value

    @model_validator(mode="after")
    def require_changes(self) -> "MemberUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        return self


class MemberResponse(BaseModel):
    """Describe a saved member returned by the API."""

    member_id: UUID
    organization_id: UUID
    name: str
    email: str | None
    external_member_id: str | None
    date_joined: date | None
    class_year: ClassYear | None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None


class MemberListResponse(BaseModel):
    """Return one page of members and the total matching count."""

    items: list[MemberResponse]
    total: int
    limit: int
    offset: int

