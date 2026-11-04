from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True)
class MemberRecord:
    id: str
    organization_id: str
    date_joined: date | None = None
    archived: bool = False


@dataclass(frozen=True)
class EventRecord:
    id: str
    organization_id: str
    starts_at: datetime
    completed: bool = True
    cancelled: bool = False
    finalized: bool = True


@dataclass(frozen=True)
class AttendanceRecord:
    event_id: str
    member_id: str
    voided: bool = False