import pytest

from app.imports.parsers import parse_member_file
from app.imports.validation import (
    check_mapping,
    infer_identifier_length,
    suggest_mapping,
    validate_rows,
)

MESSY_MAPPING = {
    "name": "Full Name",
    "external_member_id": "Student ID",
    "email": "E-mail",
    "date_joined": "Joined",
}


def codes(result, row_number):
    row = next(r for r in result.rows if r.row_number == row_number)
    return [i.code for i in row.issues]


def status(result, row_number):
    return next(r for r in result.rows if r.row_number == row_number).status


@pytest.fixture
def messy(fixture_bytes):
    return parse_member_file("messy.csv", fixture_bytes("members_messy.csv"))


# ------------------------------------------------------------------ mapping


def test_suggest_mapping_recognises_common_column_names(messy):
    assert suggest_mapping(messy.headers) == MESSY_MAPPING
    assert suggest_mapping(["Name", "RIN", "Email", "Date Joined"]) == {
        "name": "Name", "external_member_id": "RIN", "email": "Email", "date_joined": "Date Joined",
    }


def test_suggest_mapping_does_not_use_a_column_twice():
    assert suggest_mapping(["ID", "Name"]) == {"name": "Name", "external_member_id": "ID"}


def test_mapping_must_cover_name_and_the_matching_field():
    issues = check_mapping({"name": "Name"}, ["Name", "RIN"], "external_id")
    assert [(i.code, i.field) for i in issues] == [("MAPPING_REQUIRED", "external_member_id")]
    assert check_mapping({"name": "Name", "external_member_id": "RIN"}, ["Name", "RIN"], "external_id") == []
    # The other field is optional, so email is not demanded when matching by ID.
    assert check_mapping({"name": "Name", "external_member_id": "RIN"}, ["Name", "RIN"], "email")[0].field == "email"


def test_mapping_problems_for_missing_and_reused_columns():
    issues = check_mapping({"name": "Nope", "external_member_id": "Nope"}, ["Name"], "external_id")
    assert {i.code for i in issues} == {"MAPPING_UNKNOWN_COLUMN"}
    reused = check_mapping({"name": "A", "external_member_id": "A"}, ["A"], "external_id")
    assert [i.code for i in reused] == ["MAPPING_DUPLICATE_COLUMN"]


def test_bad_mapping_stops_row_checks(messy):
    result = validate_rows(messy, {"name": "Full Name"}, "external_id")
    assert result.rows == []
    assert result.mapping_issues[0].code == "MAPPING_REQUIRED"


def test_unknown_matching_method_is_a_programming_error(messy):
    with pytest.raises(ValueError):
        validate_rows(messy, MESSY_MAPPING, "phone")


# ------------------------------------------------------------------ rows


def test_clean_file_is_all_ready(fixture_bytes):
    parsed = parse_member_file("m.csv", fixture_bytes("members_valid.csv"))
    result = validate_rows(parsed, suggest_mapping(parsed.headers), "external_id")
    assert result.summary == {"total": 4, "ready": 4, "skipped": 0, "failed": 0}
    assert result.rows[0].member.external_member_id == "001234567"
    assert result.rows[3].member.date_joined is None


def test_messy_file_gives_row_level_feedback(messy):
    result = validate_rows(messy, MESSY_MAPPING, "external_id")
    assert result.summary == {"total": 8, "ready": 3, "skipped": 1, "failed": 4}

    assert status(result, 2) == "ready"
    assert status(result, 3) == "ready"
    assert status(result, 4) == "failed" and codes(result, 4) == ["AMBIGUOUS_IDENTIFIER"]
    assert status(result, 5) == "failed" and codes(result, 5) == ["INVALID_EMAIL"]
    assert status(result, 6) == "failed" and codes(result, 6) == ["REQUIRED_FIELD_MISSING"]
    assert status(result, 7) == "skipped" and codes(result, 7) == ["DUPLICATE_IN_FILE"]
    assert status(result, 8) == "failed" and codes(result, 8) == ["INVALID_DATE"]
    assert status(result, 9) == "ready" and codes(result, 9) == ["FORMULA_TREATED_AS_TEXT"]


def test_ready_rows_are_cleaned(messy):
    member = next(r for r in validate_rows(messy, MESSY_MAPPING, "external_id").rows if r.row_number == 3).member
    assert (member.name, member.external_member_id, member.email) == ("Jordan Lee", "001234568", "jordan.lee@example.edu")


def test_every_issue_names_its_row_and_field(messy):
    result = validate_rows(messy, MESSY_MAPPING, "external_id")
    by_row = {i.row: i for i in result.issues if i.severity == "error"}
    assert by_row[4].field == "external_member_id"
    assert by_row[5].field == "email"
    assert by_row[6].field == "name"
    assert by_row[8].field == "date_joined"


def test_duplicate_message_points_at_the_first_row(messy):
    issue = next(i for i in validate_rows(messy, MESSY_MAPPING, "external_id").issues if i.code == "DUPLICATE_IN_FILE")
    assert "row 2" in issue.message and issue.severity == "warning"


def test_existing_members_are_skipped_never_overwritten(messy):
    result = validate_rows(messy, MESSY_MAPPING, "external_id", existing_keys={"001234568"})
    assert status(result, 3) == "skipped"
    assert codes(result, 3) == ["DUPLICATE_MEMBER_IDENTIFIER"]


def test_uploading_the_same_file_again_creates_nothing(fixture_bytes):
    parsed = parse_member_file("m.csv", fixture_bytes("members_valid.csv"))
    mapping = suggest_mapping(parsed.headers)
    first = validate_rows(parsed, mapping, "external_id")
    roster = {r.member.external_member_id for r in first.rows if r.status == "ready"}
    again = validate_rows(parsed, mapping, "external_id", existing_keys=roster)
    assert again.summary == {"total": 4, "ready": 0, "skipped": 4, "failed": 0}


def test_email_matching_ignores_case_and_requires_email():
    parsed = parse_member_file("m.csv", b"Name,Email\nA,Alex@Example.edu\nB,alex@example.EDU\nC,\n")
    result = validate_rows(parsed, {"name": "Name", "email": "Email"}, "email")
    assert [r.status for r in result.rows] == ["ready", "skipped", "failed"]
    assert codes(result, 4) == ["REQUIRED_FIELD_MISSING"]


def test_identifier_matching_is_case_sensitive_and_keeps_zeros():
    parsed = parse_member_file("m.csv", b"Name,ID\nA,ab01\nB,AB01\nC,0012\nD,12\n")
    result = validate_rows(parsed, {"name": "Name", "external_member_id": "ID"}, "external_id")
    # ab01 and AB01 are different identifiers; 0012 and 12 are different identifiers too.
    assert [r.status for r in result.rows] == ["ready", "ready", "ready", "ready"]


def test_short_all_digit_identifier_is_flagged_not_guessed():
    parsed = parse_member_file("m.csv", b"Name,RIN\nA,001234567\nB,001234568\nC,1234569\n")
    result = validate_rows(parsed, {"name": "Name", "external_member_id": "RIN"}, "external_id")
    assert [r.status for r in result.rows] == ["ready", "ready", "failed"]
    assert result.rows[2].member is None


def test_club_setting_overrides_the_inferred_length():
    parsed = parse_member_file("m.csv", b"Name,RIN\nA,1234\nB,5678\n")
    mapping = {"name": "Name", "external_member_id": "RIN"}
    assert validate_rows(parsed, mapping, "external_id").summary["ready"] == 2
    assert validate_rows(parsed, mapping, "external_id", expected_id_length=9).summary["failed"] == 2


def test_infer_identifier_length_only_when_clear():
    assert infer_identifier_length(["001", "002", "03"]) == 3
    assert infer_identifier_length(["001", "02"]) is None      # tie: do not guess
    assert infer_identifier_length(["001"]) is None            # one value is not a pattern
    assert infer_identifier_length(["abc", "def"]) is None     # not digits


def test_number_cell_identifier_gets_a_warning_when_length_looks_right(make_xlsx):
    rows = [["Name", "RIN"], ["A", 123456789], ["B", 123456788], ["C", "123456787"]]
    parsed = parse_member_file("m.xlsx", make_xlsx(rows))
    result = validate_rows(parsed, {"name": "Name", "external_member_id": "RIN"}, "external_id")
    assert [r.status for r in result.rows] == ["ready", "ready", "ready"]
    assert codes(result, 2) == ["NUMERIC_IDENTIFIER_CELL"]
    assert codes(result, 4) == []


def test_number_cell_that_lost_its_zeros_fails(make_xlsx):
    rows = [["Name", "RIN"], ["A", "001234567"], ["B", "001234568"], ["C", 1234569]]
    parsed = parse_member_file("m.xlsx", make_xlsx(rows))
    result = validate_rows(parsed, {"name": "Name", "external_member_id": "RIN"}, "external_id")
    assert result.rows[2].status == "failed" and codes(result, 4) == ["AMBIGUOUS_IDENTIFIER"]


def test_both_file_formats_give_the_same_row_feedback(fixture_bytes, make_xlsx):
    csv_parsed = parse_member_file("m.csv", fixture_bytes("members_messy.csv"))
    xlsx_rows = [
        ["Full Name", "Student ID", "E-mail", "Joined"],
        ["Alex Rivera", "001234567", "alex.rivera@example.edu", "2026-09-01"],
        ["  Jordan  Lee ", "  001234568 ", "  Jordan.Lee@Example.EDU ", "2026-09-03"],
        ["Sam Patel", "1234569", "sam.patel@example.edu", "2026-09-10"],
        ["Taylor Brooks", "001234570", "not-an-email", "2026-09-12"],
        [None, "001234571", "casey.kim@example.edu", "2026-09-14"],
        ["Morgan Diaz", "001234567", "morgan.diaz@example.edu", "2026-09-15"],
        ["Riley Chen", "001234572", "riley.chen@example.edu", "09/16/2026"],
        ["=1+1", "001234573", "quinn.ortiz@example.edu", "2026-09-17"],
    ]
    xlsx_parsed = parse_member_file("m.xlsx", make_xlsx(xlsx_rows))
    from_csv = validate_rows(csv_parsed, MESSY_MAPPING, "external_id")
    from_xlsx = validate_rows(xlsx_parsed, MESSY_MAPPING, "external_id")
    assert [(r.row_number, r.status, [i.code for i in r.issues]) for r in from_csv.rows] == [
        (r.row_number, r.status, [i.code for i in r.issues]) for r in from_xlsx.rows
    ]


def test_result_to_dict_shape(messy):
    data = validate_rows(messy, MESSY_MAPPING, "external_id").to_dict()
    assert set(data) == {"summary", "mapping_issues", "issues"}
    assert set(data["issues"][0]) == {"row", "field", "code", "message", "severity"}
