from datetime import datetime
from pydantic import BaseModel


class EventCreate(BaseModel):
    event_name: str
    description: str | None = None
    starts_at: datetime
    event_type: str | None = None


class EventResponse(BaseModel):
    event_id: str
    organization_id: str

    event_name: str
    description: str | None = None

    starts_at: datetime
    event_type: str | None = None

    status: str

    check_in_open: bool

    attendance_finalized_at: datetime | None = None

    archived_at: datetime | None = None