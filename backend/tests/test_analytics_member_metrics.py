from datetime import date, datetime, timezone

import pytest

from app.analytics.member_metrics import (
    ACTIVE,
    INACTIVE,
    NOT_ENOUGH_DATA,
    member_engagement,
    member_history,
    organization_engagement,
)
from app.analytics.models import AttendanceRecord, EventRecord, MemberRecord
from app.analytics.periods import ReportingPeriod

ORG = "org-a"
PERIOD = ReportingPeriod(date(2026, 9, 1), date(2026, 12, 1))


def at(month, day, hour=18):
    return datetime(2026, month, day, hour + 4, 0, tzinfo=timezone.utc)


def event(event_id, month, day, **kwargs):
    return EventRecord(event_id, kwargs.pop("org", ORG), at(month, day), **kwargs)


def member(member_id, **kwargs):
    return MemberRecord(member_id, kwargs.pop("org", ORG), **kwargs)


def present(event_id, member_id, voided=False):
    return AttendanceRecord(event_id, member_id, voided)


def four_events():
    return [event(f"e{i}", 9 + (i - 1) // 2, 5 + i) for i in range(1, 5)]


def test_no_eligible_events_is_not_enough_data():
    result = member_engagement(member("m1"), [], [], PERIOD, 50)
    assert result.status == NOT_ENOUGH_DATA
    assert result.percentage is None
    assert result.eligible_events == 0


def test_percentage_and_active_status_at_threshold():
    events = four_events()
    attendance = [present("e1", "m1"), present("e2", "m1")]
    result = member_engagement(member("m1"), events, attendance, PERIOD, 50)
    assert result.eligible_events == 4
    assert result.attended_events == 2
    assert result.percentage == 50.0
    assert result.status == ACTIVE


def test_just_below_threshold_is_inactive():
    events = four_events()
    attendance = [present("e1", "m1")]
    result = member_engagement(member("m1"), events, attendance, PERIOD, 50)
    assert result.percentage == 25.0
    assert result.status == INACTIVE


def test_threshold_is_configurable():
    events = four_events()
    attendance = [present("e1", "m1"), present("e2", "m1"), present("e3", "m1")]
    assert member_engagement(member("m1"), events, attendance, PERIOD, 75).status == ACTIVE
    assert member_engagement(member("m1"), events, attendance, PERIOD, 76).status == INACTIVE


def test_zero_threshold_makes_everyone_with_data_active():
    result = member_engagement(member("m1"), four_events(), [], PERIOD, 0)
    assert result.status == ACTIVE
    assert result.percentage == 0.0


def test_threshold_out_of_range_is_rejected():
    with pytest.raises(ValueError):
        member_engagement(member("m1"), four_events(), [], PERIOD, 101)
    with pytest.raises(ValueError):
        member_engagement(member("m1"), four_events(), [], PERIOD, -1)


def test_member_who_joined_mid_period_only_counts_later_events():
    events = four_events()
    joined = member("m1", date_joined=date(2026, 10, 1))
    attendance = [present("e3", "m1")]
    result = member_engagement(joined, events, attendance, PERIOD, 50)
    assert result.eligible_events == 2
    assert result.attended_events == 1
    assert result.percentage == 50.0


def test_event_on_join_date_counts():
    events = [event("e1", 10, 1)]
    joined = member("m1", date_joined=date(2026, 10, 1))
    assert member_engagement(joined, events, [], PERIOD, 50).eligible_events == 1


def test_member_joined_after_every_event_has_not_enough_data():
    joined = member("m1", date_joined=date(2026, 12, 1))
    assert member_engagement(joined, four_events(), [], PERIOD, 50).status == NOT_ENOUGH_DATA


def test_missing_join_date_counts_all_events_in_period():
    assert member_engagement(member("m1"), four_events(), [], PERIOD, 50).eligible_events == 4


def test_cancelled_incomplete_and_unfinalized_events_are_ignored():
    events = [
        event("e1", 9, 10),
        event("e2", 9, 11, cancelled=True),
        event("e3", 9, 12, completed=False),
        event("e4", 9, 13, finalized=False),
    ]
    attendance = [present(e.id, "m1") for e in events]
    result = member_engagement(member("m1"), events, attendance, PERIOD, 50)
    assert result.eligible_events == 1
    assert result.attended_events == 1


def test_voided_attendance_does_not_count():
    events = four_events()
    attendance = [present("e1", "m1", voided=True), present("e2", "m1")]
    result = member_engagement(member("m1"), events, attendance, PERIOD, 10)
    assert result.attended_events == 1


def test_duplicate_attendance_counts_once():
    events = four_events()
    attendance = [present("e1", "m1"), present("e1", "m1"), present("e1", "m1")]
    assert member_engagement(member("m1"), events, attendance, PERIOD, 10).attended_events == 1


def test_attendance_at_events_outside_the_period_is_ignored():
    events = [event("e1", 8, 20), event("e2", 9, 10)]
    attendance = [present("e1", "m1")]
    result = member_engagement(member("m1"), events, attendance, PERIOD, 50)
    assert result.eligible_events == 1
    assert result.attended_events == 0


def test_other_club_events_are_ignored():
    events = [event("e1", 9, 10, org="org-b"), event("e2", 9, 11)]
    result = member_engagement(member("m1"), events, [present("e1", "m1")], PERIOD, 50)
    assert result.eligible_events == 1
    assert result.attended_events == 0


def test_organization_engagement_skips_archived_and_other_clubs():
    members = [
        member("m1"),
        member("m2", archived=True),
        member("m3", org="org-b"),
    ]
    result = organization_engagement(ORG, members, four_events(), [], PERIOD, 50)
    assert [r.member_id for r in result] == ["m1"]


def test_member_history_lists_confirmed_events_in_date_order():
    events = [event("e2", 10, 5), event("e1", 9, 5), event("e3", 11, 5)]
    attendance = [
        present("e3", "m1"),
        present("e1", "m1"),
        present("e2", "m1", voided=True),
        present("e1", "m2"),
    ]
    assert member_history(member("m1"), events, attendance) == ["e1", "e3"]


def test_member_history_ignores_cancelled_events_and_works_for_archived_members():
    events = [event("e1", 9, 5), event("e2", 9, 6, cancelled=True)]
    attendance = [present("e1", "m1"), present("e2", "m1")]
    archived = member("m1", archived=True)
    assert member_history(archived, events, attendance) == ["e1"]