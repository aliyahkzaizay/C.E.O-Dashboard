from datetime import date, datetime, timezone

from app.analytics.event_metrics import event_popularity, monthly_averages
from app.analytics.models import AttendanceRecord, EventRecord, MemberRecord
from app.analytics.periods import ReportingPeriod

ORG = "org-a"
PERIOD = ReportingPeriod(date(2026, 9, 1), date(2026, 12, 1))


def at(month, day, hour=18):
    return datetime(2026, month, day, hour + 4, 0, tzinfo=timezone.utc)


def event(event_id, month, day, **kwargs):
    return EventRecord(event_id, kwargs.pop("org", ORG), at(month, day), **kwargs)


def members(count, org=ORG):
    return [MemberRecord(f"m{i}", org) for i in range(1, count + 1)]


def present(event_id, member_id, voided=False):
    return AttendanceRecord(event_id, member_id, voided)


def test_events_are_ranked_by_distinct_attendees():
    events = [event("e1", 9, 5), event("e2", 9, 12), event("e3", 10, 3)]
    attendance = [
        present("e1", "m1"),
        present("e2", "m1"),
        present("e2", "m2"),
        present("e2", "m3"),
        present("e3", "m1"),
        present("e3", "m2"),
    ]
    ranking = event_popularity(ORG, members(3), events, attendance, PERIOD)
    assert [(r.event_id, r.attendees) for r in ranking] == [("e2", 3), ("e3", 2), ("e1", 1)]


def test_duplicates_and_voids_do_not_inflate_attendees():
    events = [event("e1", 9, 5)]
    attendance = [
        present("e1", "m1"),
        present("e1", "m1"),
        present("e1", "m2", voided=True),
    ]
    ranking = event_popularity(ORG, members(2), events, attendance, PERIOD)
    assert ranking[0].attendees == 1


def test_ties_are_broken_by_date_then_id():
    events = [event("e2", 10, 5), event("e1", 10, 5), event("e0", 9, 5)]
    attendance = [present("e1", "m1"), present("e2", "m1"), present("e0", "m1")]
    ranking = event_popularity(ORG, members(1), events, attendance, PERIOD)
    assert [r.event_id for r in ranking] == ["e0", "e1", "e2"]


def test_cancelled_and_unfinalized_events_are_not_ranked():
    events = [
        event("e1", 9, 5),
        event("e2", 9, 6, cancelled=True),
        event("e3", 9, 7, finalized=False),
    ]
    attendance = [present(e.id, "m1") for e in events]
    ranking = event_popularity(ORG, members(1), events, attendance, PERIOD)
    assert [r.event_id for r in ranking] == ["e1"]


def test_zero_attendance_finalized_event_is_listed():
    ranking = event_popularity(ORG, members(1), [event("e1", 9, 5)], [], PERIOD)
    assert [(r.event_id, r.attendees) for r in ranking] == [("e1", 0)]


def test_attendance_from_another_clubs_member_is_not_counted():
    events = [event("e1", 9, 5)]
    roster = members(1) + [MemberRecord("x1", "org-b")]
    attendance = [present("e1", "m1"), present("e1", "x1")]
    assert event_popularity(ORG, roster, events, attendance, PERIOD)[0].attendees == 1


def test_other_club_events_are_not_ranked():
    events = [event("e1", 9, 5, org="org-b")]
    assert event_popularity(ORG, members(1), events, [present("e1", "m1")], PERIOD) == []


def test_monthly_average_divides_by_finalized_events():
    events = [event("e1", 9, 5), event("e2", 9, 12)]
    attendance = [present("e1", "m1"), present("e1", "m2"), present("e1", "m3"), present("e2", "m1")]
    result = monthly_averages(ORG, members(3), events, attendance, PERIOD)
    september = result[0]
    assert september.month == "2026-09"
    assert september.event_count == 2
    assert september.total_attendees == 4
    assert september.average_attendees == 2.0
    assert not september.no_events


def test_zero_attendance_event_lowers_the_monthly_average():
    events = [event("e1", 9, 5), event("e2", 9, 12)]
    attendance = [present("e1", "m1"), present("e1", "m2")]
    september = monthly_averages(ORG, members(2), events, attendance, PERIOD)[0]
    assert september.event_count == 2
    assert september.average_attendees == 1.0


def test_month_without_events_reports_no_events():
    result = monthly_averages(ORG, members(1), [event("e1", 9, 5)], [], PERIOD)
    assert [m.month for m in result] == ["2026-09", "2026-10", "2026-11"]
    october = result[1]
    assert october.no_events
    assert october.average_attendees is None
    assert october.event_count == 0


def test_month_with_only_cancelled_events_reports_no_events():
    events = [event("e1", 10, 5, cancelled=True)]
    result = monthly_averages(ORG, members(1), events, [], PERIOD)
    assert result[1].no_events


def test_event_near_midnight_is_bucketed_by_local_month():
    late = EventRecord("e1", ORG, datetime(2026, 10, 1, 2, 0, tzinfo=timezone.utc))
    result = monthly_averages(ORG, members(1), [late], [], PERIOD)
    assert result[0].event_count == 1
    assert result[1].no_events


def test_monthly_average_rounds_to_two_places():
    events = [event("e1", 9, 5), event("e2", 9, 6), event("e3", 9, 7)]
    attendance = [present("e1", "m1"), present("e2", "m1"), present("e3", "m2")]
    assert monthly_averages(ORG, members(2), events, attendance, PERIOD)[0].average_attendees == 1.0
    attendance = [present("e1", "m1"), present("e1", "m2")]
    assert monthly_averages(ORG, members(2), events, attendance, PERIOD)[0].average_attendees == 0.67


def test_archived_members_still_count_toward_past_event_attendance():
    roster = [MemberRecord("m1", ORG, archived=True)]
    events = [event("e1", 9, 5)]
    assert event_popularity(ORG, roster, events, [present("e1", "m1")], PERIOD)[0].attendees == 1