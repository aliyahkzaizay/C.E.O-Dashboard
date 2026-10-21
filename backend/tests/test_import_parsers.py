from datetime import date

import pytest

from app.imports import parsers
from app.imports.parsers import ImportFileError, parse_member_file

VALID_ROWS = [
    ["Name", "RIN", "Email", "Date Joined"],
    ["Alex Rivera", "001234567", "alex.rivera@example.edu", "2026-09-01"],
    ["Jordan Lee", "001234568", "jordan.lee+bsa@example.edu", "2026-09-03"],
    ["Sam Patel", "001234569", "sam.patel@example.edu", "2026-09-10"],
    ["Taylor Brooks", "001234570", "taylor.brooks@example.edu", None],
]


def error_code(call) -> str:
    with pytest.raises(ImportFileError) as caught:
        call()
    return caught.value.code


# ------------------------------------------------------------------ CSV


def test_csv_reads_headers_and_rows_with_leading_zeros_kept(fixture_bytes):
    parsed = parse_member_file("members.csv", fixture_bytes("members_valid.csv"))
    assert parsed.file_type == "csv"
    assert parsed.headers == ["Name", "RIN", "Email", "Date Joined"]
    assert [r.number for r in parsed.rows] == [2, 3, 4, 5]
    assert parsed.rows[0].values["RIN"] == "001234567"
    assert parsed.rows[3].values["Date Joined"] == ""


def test_csv_with_bom_and_semicolons():
    content = "﻿Name;RIN\nAlex Rivera;001234567\n".encode("utf-8")
    parsed = parse_member_file("members.csv", content)
    assert parsed.headers == ["Name", "RIN"]
    assert parsed.rows[0].values == {"Name": "Alex Rivera", "RIN": "001234567"}


def test_csv_saved_by_excel_on_windows_still_reads():
    content = "Name,RIN\nJos\xe9 Rivera,001234567\n".encode("cp1252")
    assert parse_member_file("members.csv", content).rows[0].values["Name"] == "José Rivera"


def test_csv_blank_lines_are_skipped_but_row_numbers_stay_true():
    content = b"Name,RIN\n\nAlex Rivera,001\n\n\nSam Patel,002\n"
    parsed = parse_member_file("members.csv", content)
    assert [r.number for r in parsed.rows] == [3, 6]


def test_csv_formula_text_is_kept_literally_and_flagged():
    parsed = parse_member_file("members.csv", b"Name,RIN\n=1+1,001\n")
    assert parsed.rows[0].values["Name"] == "=1+1"
    assert (2, "Name") in parsed.formula_cells


# ------------------------------------------------------------------ XLSX


def test_xlsx_reads_text_identifiers_with_leading_zeros(make_xlsx):
    parsed = parse_member_file("members.xlsx", make_xlsx(VALID_ROWS))
    assert parsed.file_type == "xlsx"
    assert parsed.rows[0].values["RIN"] == "001234567"
    assert parsed.numeric_cells == set()


def test_xlsx_number_cells_are_recorded_because_zeros_may_be_lost(make_xlsx):
    parsed = parse_member_file("members.xlsx", make_xlsx([["Name", "RIN"], ["Sam Patel", 1234569]]))
    assert parsed.rows[0].values["RIN"] == "1234569"
    assert (2, "RIN") in parsed.numeric_cells


def test_xlsx_date_cells_become_iso_text(make_xlsx):
    parsed = parse_member_file("members.xlsx", make_xlsx([["Name", "Joined"], ["Sam Patel", date(2026, 9, 10)]]))
    assert parsed.rows[0].values["Joined"] == "2026-09-10"


def test_xlsx_formulas_are_never_calculated(make_xlsx):
    parsed = parse_member_file("members.xlsx", make_xlsx([["Name", "RIN"], ["=1+1", "001"]]))
    assert parsed.rows[0].values["Name"] == "=1+1"
    assert (2, "Name") in parsed.formula_cells


def test_xlsx_header_not_on_first_row_keeps_real_row_numbers(make_xlsx):
    parsed = parse_member_file("members.xlsx", make_xlsx(VALID_ROWS, first_row=3))
    assert parsed.headers[0] == "Name"
    assert [r.number for r in parsed.rows] == [4, 5, 6, 7]


def test_csv_and_xlsx_with_the_same_data_read_the_same(fixture_bytes, make_xlsx):
    from_csv = parse_member_file("members.csv", fixture_bytes("members_valid.csv"))
    from_xlsx = parse_member_file("members.xlsx", make_xlsx(VALID_ROWS))
    assert from_csv.headers == from_xlsx.headers
    assert [(r.number, r.values) for r in from_csv.rows] == [(r.number, r.values) for r in from_xlsx.rows]


# ------------------------------------------------------------------ limits and bad files


def test_unsupported_extension():
    assert error_code(lambda: parse_member_file("members.xls", b"x")) == "UNSUPPORTED_FILE_TYPE"
    assert error_code(lambda: parse_member_file("members", b"x")) == "UNSUPPORTED_FILE_TYPE"


def test_empty_file_and_header_only_file():
    assert error_code(lambda: parse_member_file("m.csv", b"")) == "EMPTY_FILE"
    assert error_code(lambda: parse_member_file("m.csv", b"Name,RIN\n")) == "EMPTY_FILE"
    assert error_code(lambda: parse_member_file("m.csv", b"\n\n")) == "MISSING_HEADER"


def test_file_size_limit(monkeypatch):
    monkeypatch.setattr(parsers, "MAX_FILE_BYTES", 20)
    assert error_code(lambda: parse_member_file("m.csv", b"Name,RIN\n" + b"a,1\n" * 10)) == "FILE_TOO_LARGE"


def test_row_limit_for_both_formats(monkeypatch, make_xlsx):
    monkeypatch.setattr(parsers, "MAX_DATA_ROWS", 3)
    csv_rows = b"Name,RIN\n" + b"".join(b"n%d,%d\n" % (i, i) for i in range(4))
    assert error_code(lambda: parse_member_file("m.csv", csv_rows)) == "TOO_MANY_ROWS"
    xlsx_rows = make_xlsx([["Name", "RIN"]] + [[f"n{i}", str(i)] for i in range(4)])
    assert error_code(lambda: parse_member_file("m.xlsx", xlsx_rows)) == "TOO_MANY_ROWS"
    exactly_at_limit = b"Name,RIN\n" + b"".join(b"n%d,%d\n" % (i, i) for i in range(3))
    assert len(parse_member_file("m.csv", exactly_at_limit).rows) == 3


def test_column_limit(monkeypatch):
    monkeypatch.setattr(parsers, "MAX_COLUMNS", 2)
    assert error_code(lambda: parse_member_file("m.csv", b"a,b,c\n1,2,3\n")) == "TOO_MANY_COLUMNS"


def test_duplicate_column_names_are_rejected_with_the_column_named():
    with pytest.raises(ImportFileError) as caught:
        parse_member_file("m.csv", b"Name,name\nA,B\n")
    assert caught.value.code == "DUPLICATE_COLUMN"
    assert caught.value.to_dict() == {
        "error": {"code": "DUPLICATE_COLUMN", "message": 'The column name "name" appears more than once.', "field": "name"}
    }


def test_renamed_files_are_caught(make_xlsx):
    assert error_code(lambda: parse_member_file("m.csv", make_xlsx(VALID_ROWS))) == "UNREADABLE_FILE"
    assert error_code(lambda: parse_member_file("m.xlsx", b"Name,RIN\nA,1\n")) == "UNREADABLE_FILE"
    assert error_code(lambda: parse_member_file("m.xlsx", b"PK\x03\x04 not really a zip")) == "UNREADABLE_FILE"


def test_binary_garbage_in_a_csv_is_rejected():
    assert error_code(lambda: parse_member_file("m.csv", b"Name\x00RIN\n")) == "UNREADABLE_FILE"
