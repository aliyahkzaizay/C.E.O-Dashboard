from datetime import date, datetime, timezone

from app.analytics.models import AttendanceRecord, EventRecord, MemberRecord
from app.analytics.periods import ReportingPeriod
from app.analytics.summary import build_summary

PERIOD = ReportingPeriod(date(2026, 9, 1), date(2026, 12, 1))


def at(month, day):
    return datetime(2026, month, day, 22, 0, tzinfo=timezone.utc)


def club_a():
    members = [
        MemberRecord("m1", "a"),
        MemberRecord("m2", "a"),
        MemberRecord("m3", "a", date_joined=date(2027, 1, 1)),
        MemberRecord("m4", "a", archived=True),
    ]
    events = [
        EventRecord("e1", "a", at(9, 10)),
        EventRecord("e2", "a", at(10, 10)),
        EventRecord("e3", "a", at(10, 20), cancelled=True),
    ]
    attendance = [
        AttendanceRecord("e1", "m1"),
        AttendanceRecord("e2", "m1"),
        AttendanceRecord("e1", "m2"),
        AttendanceRecord("e1", "m4"),
    ]
    return members, events, attendance


def test_summary_counts_members_by_status():
    members, events, attendance = club_a()
    summary = build_summary("a", members, events, attendance, PERIOD, 75)
    assert summary.total_members == 3
    assert summary.active_members == 1
    assert summary.inactive_members == 1
    assert summary.not_enough_data_members == 1


def test_summary_event_totals_and_ranking():
    members, events, attendance = club_a()
    summary = build_summary("a", members, events, attendance, PERIOD, 50)
    assert summary.total_events == 2
    assert [(e.event_id, e.attendees) for e in summary.top_events] == [("e1", 3), ("e2", 1)]


def test_summary_monthly_section_covers_each_month():
    members, events, attendance = club_a()
    summary = build_summary("a", members, events, attendance, PERIOD, 50)
    assert [m.month for m in summary.monthly] == ["2026-09", "2026-10", "2026-11"]
    assert summary.monthly[0].average_attendees == 3.0
    assert summary.monthly[1].average_attendees == 1.0
    assert summary.monthly[2].no_events


def test_top_events_respects_top_n():
    members, events, attendance = club_a()
    summary = build_summary("a", members, events, attendance, PERIOD, 50, top_n=1)
    assert len(summary.top_events) == 1


def test_summary_is_isolated_between_clubs():
    members_a, events_a, attendance_a = club_a()
    members_b = [MemberRecord("b1", "b")]
    events_b = [EventRecord("be1", "b", at(9, 15))]
    attendance_b = [AttendanceRecord("be1", "b1")]
    members = members_a + members_b
    events = events_a + events_b
    attendance = attendance_a + attendance_b

    a = build_summary("a", members, events, attendance, PERIOD, 50)
    b = build_summary("b", members, events, attendance, PERIOD, 50)

    assert a.total_members == 3
    assert a.total_events == 2
    assert b.total_members == 1
    assert b.total_events == 1
    assert [e.event_id for e in b.top_events] == ["be1"]
    assert b.active_members == 1


def test_empty_club_has_no_data_and_no_events():
    summary = build_summary("a", [], [], [], PERIOD, 50)
    assert summary.total_members == 0
    assert summary.total_events == 0
    assert summary.top_events == []
    assert all(month.no_events for month in summary.monthly)


def test_member_with_no_eligible_events_is_not_counted_inactive():
    members = [MemberRecord("m1", "a")]
    summary = build_summary("a", members, [], [], PERIOD, 50)
    assert summary.not_enough_data_members == 1
    assert summary.inactive_members == 0