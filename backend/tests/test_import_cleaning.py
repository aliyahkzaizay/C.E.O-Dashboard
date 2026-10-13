from datetime import date

import pytest

from app.imports.cleaning import (
    clean_email,
    clean_identifier,
    clean_name,
    is_valid_email,
    matching_key,
    parse_iso_date,
)


def test_identifier_is_trimmed_but_keeps_zeros_and_case():
    assert clean_identifier("  001234567 ") == "001234567"
    assert clean_identifier("ab-0012") == "ab-0012"
    assert clean_identifier("AB-0012") == "AB-0012"


def test_blank_values_become_none():
    assert clean_identifier("   ") is None
    assert clean_email("") is None
    assert clean_name("  ") is None
    assert clean_identifier(None) is None


def test_email_is_trimmed_and_lowercased_but_keeps_dots_and_plus_tags():
    assert clean_email("  Alex.Rivera+BSA@Example.EDU ") == "alex.rivera+bsa@example.edu"


def test_name_collapses_inner_spaces():
    assert clean_name("  Jordan   Lee ") == "Jordan Lee"


@pytest.mark.parametrize("email", ["a@b.co", "alex.rivera+bsa@example.edu"])
def test_valid_emails(email):
    assert is_valid_email(email)


@pytest.mark.parametrize("email", ["not-an-email", "a@b", "a b@c.com", "@example.edu", "a@" + "b" * 260 + ".com"])
def test_invalid_emails(email):
    assert not is_valid_email(email)


def test_iso_date_is_accepted_and_empty_means_none():
    assert parse_iso_date("2026-10-12") == date(2026, 10, 12)
    assert parse_iso_date(" ") is None
    assert parse_iso_date(None) is None


@pytest.mark.parametrize("text", ["10/12/2026", "2026-13-01", "2026-02-30", "20261012", "2026-W41-1", "12 Oct 2026"])
def test_other_date_layouts_are_rejected_instead_of_guessed(text):
    with pytest.raises(ValueError):
        parse_iso_date(text)


def test_matching_key_follows_the_club_method():
    assert matching_key("a@b.co", "001", "email") == "a@b.co"
    assert matching_key("a@b.co", "001", "external_id") == "001"
    with pytest.raises(ValueError):
        matching_key("a@b.co", "001", "phone")
