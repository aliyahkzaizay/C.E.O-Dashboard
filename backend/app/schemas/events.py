from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class EventStatus(str, Enum):
    scheduled = "scheduled"
    cancelled = "cancelled"


def _clean_name(v: str | None) -> str | None:
    if v is None:
        return v
    v = v.strip()
    if not v:
        raise ValueError("event_name cannot be blank")
    return v


class EventCreate(BaseModel):
    event_name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    starts_at: datetime
    event_type: str | None = Field(default=None, max_length=50)

    _strip = field_validator("event_name")(_clean_name)


class EventUpdate(BaseModel):
    event_name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    starts_at: datetime | None = None
    event_type: str | None = Field(default=None, max_length=50)

    _strip = field_validator("event_name")(_clean_name)


class EventResponse(BaseModel):
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
    event_id: str
    status: EventStatus
    check_in_open: bool
    attendance_finalized_at: datetime | None = None
    archived_at: datetime | None = None


class EventListResponse(BaseModel):
    items: list[EventResponse]
    total: int
    limit: int
    offset: int