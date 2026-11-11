from dataclasses import dataclass

from app.analytics.eligibility import period_events
from app.analytics.event_metrics import (
    EventPopularity,
    MonthlyAverage,
    event_popularity,
    monthly_averages,
)
from app.analytics.member_metrics import (
    ACTIVE,
    INACTIVE,
    NOT_ENOUGH_DATA,
    MemberEngagement,
    organization_engagement,
)
from app.analytics.models import AttendanceRecord, EventRecord, MemberRecord
from app.analytics.periods import DEFAULT_TIMEZONE, ReportingPeriod


@dataclass(frozen=True)
class DashboardSummary:
    total_members: int
    active_members: int
    inactive_members: int
    not_enough_data_members: int
    total_events: int
    top_events: list[EventPopularity]
    monthly: list[MonthlyAverage]
    members: list[MemberEngagement]


def build_summary(
    organization_id: str,
    members: list[MemberRecord],
    events: list[EventRecord],
    attendance: list[AttendanceRecord],
    period: ReportingPeriod,
    threshold: float,
    timezone: str = DEFAULT_TIMEZONE,
    top_n: int = 5,
) -> DashboardSummary:
    engagement = organization_engagement(
        organization_id, members, events, attendance, period, threshold, timezone
    )
    popularity = event_popularity(
        organization_id, members, events, attendance, period, timezone
    )
    return DashboardSummary(
        total_members=len(engagement),
        active_members=sum(1 for m in engagement if m.status == ACTIVE),
        inactive_members=sum(1 for m in engagement if m.status == INACTIVE),
        not_enough_data_members=sum(1 for m in engagement if m.status == NOT_ENOUGH_DATA),
        total_events=len(period_events(organization_id, events, period, timezone)),
        top_events=popularity[:top_n],
        monthly=monthly_averages(
            organization_id, members, events, attendance, period, timezone
        ),
        members=engagement,
    )