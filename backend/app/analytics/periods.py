from dataclasses import dataclass
from datetime import date, datetime
from zoneinfo import ZoneInfo

DEFAULT_TIMEZONE = "America/New_York"


@dataclass(frozen=True)
class ReportingPeriod:
    start: date
    end: date

    def __post_init__(self):
        if self.start >= self.end:
            raise ValueError("Reporting period start must be before its end.")

    def contains(self, day: date) -> bool:
        return self.start <= day < self.end


def local_date(moment: datetime, timezone: str = DEFAULT_TIMEZONE) -> date:
    if moment.tzinfo is None:
        raise ValueError("Event times must include a timezone.")
    return moment.astimezone(ZoneInfo(timezone)).date()


def month_key(moment: datetime, timezone: str = DEFAULT_TIMEZONE) -> str:
    day = local_date(moment, timezone)
    return f"{day.year:04d}-{day.month:02d}"


def in_period(
    moment: datetime, period: ReportingPeriod, timezone: str = DEFAULT_TIMEZONE
) -> bool:
    return period.contains(local_date(moment, timezone))


def months_in_period(period: ReportingPeriod) -> list[str]:
    months = []
    year, month = period.start.year, period.start.month
    while date(year, month, 1) < period.end:
        months.append(f"{year:04d}-{month:02d}")
        month += 1
        if month > 12:
            month = 1
            year += 1
    return months