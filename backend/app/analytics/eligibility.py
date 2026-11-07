from app.analytics.models import AttendanceRecord, EventRecord, MemberRecord
from app.analytics.periods import DEFAULT_TIMEZONE, ReportingPeriod, in_period, local_date


def is_countable_event(event: EventRecord) -> bool:
    return event.completed and event.finalized and not event.cancelled


def club_events(organization_id: str, events: list[EventRecord]) -> list[EventRecord]:
    return [
        event
        for event in events
        if event.organization_id == organization_id and is_countable_event(event)
    ]


def period_events(
    organization_id: str,
    events: list[EventRecord],
    period: ReportingPeriod,
    timezone: str = DEFAULT_TIMEZONE,
) -> list[EventRecord]:
    return [
        event
        for event in club_events(organization_id, events)
        if in_period(event.starts_at, period, timezone)
    ]


def eligible_events(
    member: MemberRecord,
    events: list[EventRecord],
    period: ReportingPeriod,
    timezone: str = DEFAULT_TIMEZONE,
) -> list[EventRecord]:
    result = []
    for event in period_events(member.organization_id, events, period, timezone):
        if member.date_joined is not None:
            if local_date(event.starts_at, timezone) < member.date_joined:
                continue
        result.append(event)
    return result


def confirmed_pairs(attendance: list[AttendanceRecord]) -> set[tuple[str, str]]:
    return {
        (record.event_id, record.member_id) for record in attendance if not record.voided
    }