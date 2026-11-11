"""Validate event requests and describe event API responses."""
from datetime import datetime
from enum import Enum

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator, model_validator


class EventStatus(str, Enum):
    """Persisted lifecycle states; check-in and finalization are separate fields."""
    scheduled = "scheduled"
    cancelled = "cancelled"


class EventCreate(BaseModel):
    """Accept event details only; identity and check-in settings are server controlled."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    event_name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    starts_at: AwareDatetime
    event_type: str | None = Field(default=None, max_length=50)

    @field_validator("description", "event_type", mode="before")
    @classmethod
    def empty_to_none(cls, value):
        """Store blank optional text as missing information."""
        return value.strip() or None if isinstance(value, str) else value


class EventUpdate(EventCreate):
    """Validate partial edits while preventing required fields from being cleared."""
    event_name: str | None = Field(default=None, min_length=1, max_length=200)
    starts_at: AwareDatetime | None = None

    @field_validator("event_name", "starts_at")
    @classmethod
    def require_value(cls, value):
        """Reject explicit nulls; omitted required fields remain unchanged."""
        if value is None:
            raise ValueError("Event name and start time cannot be cleared.")
        return value

    @model_validator(mode="after")
    def require_changes(self):
        """Reject requests that contain no edits."""
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        return self


class EventResponse(BaseModel):
    """Describe one saved event, including officer-only check-in settings."""
    event_id: str
    organization_id: str
    event_name: str
    description: str | None = None
    starts_at: datetime
    event_type: str | None = None
    status: EventStatus
    check_in_token: str
    check_in_open: bool
    attendance_finalized_at: datetime | None = None
    archived_at: datetime | None = None


class EventSettingsResponse(BaseModel):
    """Return lifecycle and check-in state after an officer action."""
    event_id: str
    status: EventStatus
    check_in_open: bool
    attendance_finalized_at: datetime | None = None
    archived_at: datetime | None = None


class EventListResponse(BaseModel):
    """Return a page of club events and its total matching count."""
    items: list[EventResponse]
    total: int
    limit: int
    offset: int
