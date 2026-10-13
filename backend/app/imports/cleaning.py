"""Input-cleaning rules for member data.

These follow the accepted rules in docs/sprints/sprint-4/universal-agreements.md:
trim spaces around identifiers but keep their zeros and case; trim and lowercase emails
but keep dots and plus tags.

This module is a stand-in until teammate 1 publishes the shared member helpers. Keep the
behavior identical to theirs, then replace these functions with imports from the shared code.
"""

import re
from datetime import date

MATCHING_METHODS = ("email", "external_id")

MAX_NAME_LENGTH = 200
MAX_IDENTIFIER_LENGTH = 64
MAX_EMAIL_LENGTH = 254

_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def clean_identifier(value: str | None) -> str | None:
    """Trim surrounding spaces only. Leading zeros and letter case are kept."""
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def clean_email(value: str | None) -> str | None:
    """Trim and lowercase. Dots and plus tags are kept."""
    if value is None:
        return None
    cleaned = value.strip().lower()
    return cleaned or None


def clean_name(value: str | None) -> str | None:
    """Trim and collapse repeated inner spaces."""
    if value is None:
        return None
    cleaned = " ".join(value.split())
    return cleaned or None


def is_valid_email(email: str) -> bool:
    """A basic shape check (something@domain.tld). It does not prove the address exists."""
    return len(email) <= MAX_EMAIL_LENGTH and _EMAIL_PATTERN.match(email) is not None


def parse_iso_date(value: str | None) -> date | None:
    """Read a calendar date written YYYY-MM-DD. Empty means no date.

    Other layouts such as 03/04/2026 are rejected because they can mean two different
    dates. Raises ValueError when the text is not a real YYYY-MM-DD date.
    """
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    if not _ISO_DATE_PATTERN.match(text):
        raise ValueError("Use the format YYYY-MM-DD.")
    return date.fromisoformat(text)


def matching_key(email: str | None, external_member_id: str | None, method: str) -> str | None:
    """The value that must be unique inside a club, given the club's matching method."""
    if method == "email":
        return email
    if method == "external_id":
        return external_member_id
    raise ValueError(f"Unknown matching method: {method}")
