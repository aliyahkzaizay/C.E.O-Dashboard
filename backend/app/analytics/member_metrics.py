from dataclasses import dataclass

from app.analytics.eligibility import club_events, confirmed_pairs, eligible_events
from app.analytics.models import AttendanceRecord, EventRecord, MemberRecord
from app.analytics.periods import DEFAULT_TIMEZONE, ReportingPeriod, local_date

ACTIVE = "active"
INACTIVE = "inactive"
NOT_ENOUGH_DATA = "not_enough_data"


@dataclass(frozen=True)
class MemberEngagement:
    member_id: str
    eligible_events: int
    attended_events: int
    percentage: float | None
    status: str


def check_threshold(threshold: float) -> None:
    if threshold < 0 or threshold > 100:
        raise ValueError("Threshold must be between 0 and 100.")


def member_engagement(
    member: MemberRecord,
    events: list[EventRecord],
    attendance: list[AttendanceRecord],
    period: ReportingPeriod,
    threshold: float,
    timezone: str = DEFAULT_TIMEZONE,
) -> MemberEngagement:
    check_threshold(threshold)
    eligible = eligible_events(member, events, period, timezone)
    if not eligible:
        return MemberEngagement(member.id, 0, 0, None, NOT_ENOUGH_DATA)
    confirmed = confirmed_pairs(attendance)
    attended = sum(1 for event in eligible if (event.id, member.id) in confirmed)
    percentage = attended * 100 / len(eligible)
    active = attended * 100 >= threshold * len(eligible)
    return MemberEngagement(
        member.id,
        len(eligible),
        attended,
        round(percentage, 2),
        ACTIVE if active else INACTIVE,
    )


def organization_engagement(
    organization_id: str,
    members: list[MemberRecord],
    events: list[EventRecord],
    attendance: list[AttendanceRecord],
    period: ReportingPeriod,
    threshold: float,
    timezone: str = DEFAULT_TIMEZONE,
) -> list[MemberEngagement]:
    return [
        member_engagement(member, events, attendance, period, threshold, timezone)
        for member in members
        if member.organization_id == organization_id and not member.archived
    ]


def member_history(
    member: MemberRecord,
    events: list[EventRecord],
    attendance: list[AttendanceRecord],
    timezone: str = DEFAULT_TIMEZONE,
) -> list[str]:
    confirmed = confirmed_pairs(attendance)
    attended = [
        event
        for event in club_events(member.organization_id, events)
        if (event.id, member.id) in confirmed
    ]
    attended.sort(key=lambda event: (event.starts_at, event.id))
    return [event.id for event in attended]