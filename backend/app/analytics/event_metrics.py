from dataclasses import dataclass

from app.analytics.eligibility import confirmed_pairs, period_events
from app.analytics.models import AttendanceRecord, EventRecord, MemberRecord
from app.analytics.periods import (
    DEFAULT_TIMEZONE,
    ReportingPeriod,
    month_key,
    months_in_period,
)


@dataclass(frozen=True)
class EventPopularity:
    event_id: str
    attendees: int


@dataclass(frozen=True)
class MonthlyAverage:
    month: str
    event_count: int
    total_attendees: int
    average_attendees: float | None
    no_events: bool


def attendee_counts(
    organization_id: str,
    members: list[MemberRecord],
    events: list[EventRecord],
    attendance: list[AttendanceRecord],
) -> dict[str, int]:
    member_ids = {m.id for m in members if m.organization_id == organization_id}
    event_ids = {e.id for e in events if e.organization_id == organization_id}
    counts = {event_id: 0 for event_id in event_ids}
    for event_id, member_id in confirmed_pairs(attendance):
        if event_id in counts and member_id in member_ids:
            counts[event_id] += 1
    return counts


def event_popularity(
    organization_id: str,
    members: list[MemberRecord],
    events: list[EventRecord],
    attendance: list[AttendanceRecord],
    period: ReportingPeriod,
    timezone: str = DEFAULT_TIMEZONE,
) -> list[EventPopularity]:
    counts = attendee_counts(organization_id, members, events, attendance)
    scoped = period_events(organization_id, events, period, timezone)
    scoped.sort(key=lambda e: (-counts[e.id], e.starts_at, e.id))
    return [EventPopularity(e.id, counts[e.id]) for e in scoped]


def monthly_averages(
    organization_id: str,
    members: list[MemberRecord],
    events: list[EventRecord],
    attendance: list[AttendanceRecord],
    period: ReportingPeriod,
    timezone: str = DEFAULT_TIMEZONE,
) -> list[MonthlyAverage]:
    counts = attendee_counts(organization_id, members, events, attendance)
    totals = {month: [0, 0] for month in months_in_period(period)}
    for event in period_events(organization_id, events, period, timezone):
        bucket = totals[month_key(event.starts_at, timezone)]
        bucket[0] += 1
        bucket[1] += counts[event.id]
    result = []
    for month, (event_count, total) in totals.items():
        if event_count == 0:
            result.append(MonthlyAverage(month, 0, 0, None, True))
        else:
            result.append(
                MonthlyAverage(month, event_count, total, round(total / event_count, 2), False)
            )
    return result