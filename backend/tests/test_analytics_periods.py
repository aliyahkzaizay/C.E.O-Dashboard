from datetime import date, datetime, timezone

import pytest

from app.analytics.periods import (
    ReportingPeriod,
    in_period,
    local_date,
    month_key,
    months_in_period,
)


def test_period_rejects_empty_or_reversed_range():
    with pytest.raises(ValueError):
        ReportingPeriod(date(2026, 10, 1), date(2026, 10, 1))
    with pytest.raises(ValueError):
        ReportingPeriod(date(2026, 10, 2), date(2026, 10, 1))


def test_period_start_is_inclusive_and_end_is_exclusive():
    period = ReportingPeriod(date(2026, 9, 1), date(2026, 10, 1))
    assert period.contains(date(2026, 9, 1))
    assert period.contains(date(2026, 9, 30))
    assert not period.contains(date(2026, 10, 1))
    assert not period.contains(date(2026, 8, 31))


def test_late_evening_event_stays_in_local_month():
    moment = datetime(2026, 10, 1, 2, 30, tzinfo=timezone.utc)
    assert local_date(moment) == date(2026, 9, 30)
    assert month_key(moment) == "2026-09"


def test_same_instant_changes_month_in_another_timezone():
    moment = datetime(2026, 10, 1, 2, 30, tzinfo=timezone.utc)
    assert month_key(moment, "UTC") == "2026-10"


def test_in_period_uses_local_date_at_the_boundary():
    period = ReportingPeriod(date(2026, 10, 1), date(2026, 11, 1))
    before = datetime(2026, 10, 1, 3, 59, tzinfo=timezone.utc)
    after = datetime(2026, 10, 1, 4, 0, tzinfo=timezone.utc)
    assert not in_period(before, period)
    assert in_period(after, period)


def test_naive_datetime_is_rejected():
    with pytest.raises(ValueError):
        local_date(datetime(2026, 10, 1, 12, 0))


def test_months_in_period_lists_every_month_across_a_year_end():
    period = ReportingPeriod(date(2026, 11, 15), date(2027, 2, 1))
    assert months_in_period(period) == ["2026-11", "2026-12", "2027-01"]


def test_months_in_period_excludes_month_starting_at_exclusive_end():
    period = ReportingPeriod(date(2026, 9, 1), date(2026, 11, 1))
    assert months_in_period(period) == ["2026-09", "2026-10"]