import re
from datetime import date

MATCHING_METHODS = ("email", "external_id")

MAX_NAME_LENGTH = 200
MAX_IDENTIFIER_LENGTH = 64
MAX_EMAIL_LENGTH = 254

_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def clean_identifier(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def clean_email(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip().lower()
    return cleaned or None


def clean_name(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.split())
    return cleaned or None


def is_valid_email(email: str) -> bool:
    return len(email) <= MAX_EMAIL_LENGTH and _EMAIL_PATTERN.match(email) is not None


def parse_iso_date(value: str | None) -> date | None:
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    if not _ISO_DATE_PATTERN.match(text):
        raise ValueError("Use the format YYYY-MM-DD.")
    return date.fromisoformat(text)


def matching_key(email: str | None, external_member_id: str | None, method: str) -> str | None:
    if method == "email":
        return email
    if method == "external_id":
        return external_member_id
    raise ValueError(f"Unknown matching method: {method}")


_CLASS_YEARS = {
    "first_year": {"first year", "firstyear", "freshman", "freshmen", "fresh", "fr", "1st", "1st year", "1", "year 1"},
    "sophomore": {"sophomore", "soph", "so", "2nd", "2nd year", "2", "year 2"},
    "junior": {"junior", "jr", "3rd", "3rd year", "3", "year 3"},
    "senior": {"senior", "sr", "4th", "4th year", "4", "year 4"},
    "graduate": {"graduate", "grad", "graduate student", "grad student", "masters", "master s", "phd", "doctoral"},
    "other": {"other"},
}
CLASS_YEAR_LOOKUP = {alias: value for value, aliases in _CLASS_YEARS.items() for alias in aliases}


def clean_class_year(value: str | None) -> str | None:
    if value is None:
        return None
    text = " ".join(re.sub(r"[^a-z0-9]+", " ", value.casefold()).split())
    if not text:
        return None
    try:
        return CLASS_YEAR_LOOKUP[text]
    except KeyError:
        raise ValueError(
            "Use first year, sophomore, junior, senior, graduate, or other."
        ) from None