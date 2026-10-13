"""Column mapping and row checks for member imports.

Nothing is saved here. validate_rows() answers: for each row, is it ready to import, should it
be skipped (a duplicate), or did it fail (something to fix in the file)? Every issue names the
row and the member field so the officer knows exactly what to correct.

Row outcomes:
  ready    - valid and new; safe to create.
  skipped  - a duplicate of an earlier row in the file or of someone already on the roster.
             Existing members are never overwritten.
  failed   - missing or invalid data, or an identifier that may have lost its leading zeros.
"""

import re
from collections import Counter
from collections.abc import Collection
from dataclasses import dataclass, field
from datetime import date

from app.imports.cleaning import (
    MATCHING_METHODS,
    MAX_IDENTIFIER_LENGTH,
    MAX_NAME_LENGTH,
    clean_email,
    clean_identifier,
    clean_name,
    is_valid_email,
    matching_key,
    parse_iso_date,
)
from app.imports.parsers import ParsedFile

MEMBER_FIELDS = ("name", "external_member_id", "email", "date_joined")

_HEADER_ALIASES = {
    "name": {"name", "full name", "member name", "member", "student name"},
    "external_member_id": {
        "external member id", "external id", "rin", "student id", "member id", "id", "id number",
    },
    "email": {"email", "e mail", "email address", "student email"},
    "date_joined": {"date joined", "joined", "join date", "joined on", "date of joining"},
}

_DIGITS = re.compile(r"^[0-9]+$")


@dataclass
class ImportIssue:
    row: int | None  # None for problems with the column mapping
    field: str | None
    code: str
    message: str
    severity: str = "error"  # "error" blocks a row; "warning" is informational

    def to_dict(self) -> dict:
        return {
            "row": self.row,
            "field": self.field,
            "code": self.code,
            "message": self.message,
            "severity": self.severity,
        }


@dataclass
class CleanMember:
    name: str
    external_member_id: str | None
    email: str | None
    date_joined: date | None


@dataclass
class RowResult:
    row_number: int
    status: str  # "ready", "skipped", or "failed"
    member: CleanMember | None
    issues: list[ImportIssue] = field(default_factory=list)


@dataclass
class ValidationResult:
    rows: list[RowResult] = field(default_factory=list)
    mapping_issues: list[ImportIssue] = field(default_factory=list)

    @property
    def summary(self) -> dict[str, int]:
        counts = Counter(row.status for row in self.rows)
        return {
            "total": len(self.rows),
            "ready": counts["ready"],
            "skipped": counts["skipped"],
            "failed": counts["failed"],
        }

    @property
    def issues(self) -> list[ImportIssue]:
        return [issue for row in self.rows for issue in row.issues]

    def to_dict(self) -> dict:
        return {
            "summary": self.summary,
            "mapping_issues": [i.to_dict() for i in self.mapping_issues],
            "issues": [i.to_dict() for i in self.issues],
        }


# ---------------------------------------------------------------- column mapping


def _normalize_header(header: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", header.casefold()).split())


def suggest_mapping(headers: list[str]) -> dict[str, str]:
    """Guess which file column holds each member field. The officer confirms or changes it."""
    mapping: dict[str, str] = {}
    used: set[str] = set()
    for member_field in MEMBER_FIELDS:
        for header in headers:
            if header in used:
                continue
            if _normalize_header(header) in _HEADER_ALIASES[member_field]:
                mapping[member_field] = header
                used.add(header)
                break
    return mapping


def required_fields(matching_method: str) -> tuple[str, str]:
    """Every member needs a name and the club's matching field."""
    _check_method(matching_method)
    return ("name", "email" if matching_method == "email" else "external_member_id")


def check_mapping(mapping: dict[str, str], headers: list[str], matching_method: str) -> list[ImportIssue]:
    issues: list[ImportIssue] = []
    for member_field in required_fields(matching_method):
        if member_field not in mapping:
            issues.append(
                ImportIssue(None, member_field, "MAPPING_REQUIRED", f"Choose the column that holds {member_field}.")
            )
    seen: dict[str, str] = {}
    for member_field, header in mapping.items():
        if member_field not in MEMBER_FIELDS:
            issues.append(ImportIssue(None, member_field, "MAPPING_UNKNOWN_FIELD", f"{member_field} is not a member field."))
        elif header not in headers:
            issues.append(
                ImportIssue(None, member_field, "MAPPING_UNKNOWN_COLUMN", f'The file has no column named "{header}".')
            )
        elif header in seen:
            issues.append(
                ImportIssue(
                    None, member_field, "MAPPING_DUPLICATE_COLUMN",
                    f'The column "{header}" is already used for {seen[header]}.',
                )
            )
        else:
            seen[header] = member_field
    return issues


# ---------------------------------------------------------------- row checks


def infer_identifier_length(identifiers: Collection[str]) -> int | None:
    """If most all-digit identifiers share one length, return it. A tie returns None (no guessing)."""
    lengths = Counter(len(i) for i in identifiers if _DIGITS.match(i))
    common = lengths.most_common(2)
    if not common:
        return None
    if len(common) > 1 and common[0][1] == common[1][1]:
        return None
    length, count = common[0]
    if count < 2 or count / sum(lengths.values()) < 0.5:
        return None
    return length


def validate_rows(
    parsed: ParsedFile,
    mapping: dict[str, str],
    matching_method: str,
    *,
    existing_keys: Collection[str] = (),
    expected_id_length: int | None = None,
) -> ValidationResult:
    """Check every row.

    existing_keys: matching values already on the club roster, cleaned the same way
    (emails lowercased, identifiers trimmed). Callers pass an empty collection until the
    roster is connected.
    expected_id_length: the club's identifier length when known (for example 9 for a RIN).
    When None, the length most identifiers in this file share is used.
    """
    _check_method(matching_method)
    mapping_issues = check_mapping(mapping, parsed.headers, matching_method)
    if mapping_issues:
        return ValidationResult(mapping_issues=mapping_issues)

    id_header = mapping.get("external_member_id")
    if expected_id_length is None and id_header:
        cleaned_ids = [
            ident for row in parsed.rows if (ident := clean_identifier(row.values.get(id_header, "")))
        ]
        expected_id_length = infer_identifier_length(cleaned_ids)

    existing = set(existing_keys)
    first_row_for_key: dict[str, int] = {}
    results: list[RowResult] = []

    for row in parsed.rows:
        raw = {member_field: row.values.get(header, "") for member_field, header in mapping.items()}
        name = clean_name(raw.get("name"))
        identifier = clean_identifier(raw.get("external_member_id"))
        email = clean_email(raw.get("email"))
        joined_text = raw.get("date_joined", "")
        issues: list[ImportIssue] = []

        def add(member_field: str, code: str, message: str, severity: str = "error") -> None:
            issues.append(ImportIssue(row.number, member_field, code, message, severity))

        for member_field, header in mapping.items():
            if (row.number, header) in parsed.formula_cells:
                add(member_field, "FORMULA_TREATED_AS_TEXT",
                    "This cell starts with a formula character. It is read as plain text, not calculated.",
                    "warning")

        required = required_fields(matching_method)
        values = {"name": name, "external_member_id": identifier, "email": email}
        for member_field in required:
            if not values[member_field]:
                add(member_field, "REQUIRED_FIELD_MISSING", f"{member_field} is required.")

        if name and len(name) > MAX_NAME_LENGTH:
            add("name", "FIELD_TOO_LONG", f"Name is longer than {MAX_NAME_LENGTH} characters.")
        if identifier and len(identifier) > MAX_IDENTIFIER_LENGTH:
            add("external_member_id", "FIELD_TOO_LONG", f"The identifier is longer than {MAX_IDENTIFIER_LENGTH} characters.")
        if email and not is_valid_email(email):
            add("email", "INVALID_EMAIL", "This is not a valid email address.")

        date_joined: date | None = None
        try:
            date_joined = parse_iso_date(joined_text)
        except ValueError as error:
            add("date_joined", "INVALID_DATE", str(error))

        if identifier and _DIGITS.match(identifier) and id_header:
            if expected_id_length and len(identifier) < expected_id_length:
                add("external_member_id", "AMBIGUOUS_IDENTIFIER",
                    f"This identifier has {len(identifier)} digits but most have {expected_id_length}. "
                    "Leading zeros may have been lost. Fix it in the file and upload again.")
            elif (row.number, id_header) in parsed.numeric_cells:
                add("external_member_id", "NUMERIC_IDENTIFIER_CELL",
                    "This cell is stored as a number. Check that no leading zeros were lost.", "warning")

        if any(issue.severity == "error" for issue in issues):
            results.append(RowResult(row.number, "failed", None, issues))
            continue

        member = CleanMember(name=name or "", external_member_id=identifier, email=email, date_joined=date_joined)
        key = matching_key(email, identifier, matching_method)
        first_row = first_row_for_key.get(key)
        if first_row is not None:
            add(required[1], "DUPLICATE_IN_FILE",
                f"Same {required[1]} as row {first_row}. This row is skipped.", "warning")
            results.append(RowResult(row.number, "skipped", member, issues))
            continue

        first_row_for_key[key] = row.number
        if key in existing:
            add(required[1], "DUPLICATE_MEMBER_IDENTIFIER",
                "A member with this identifier already exists. This row is skipped and the member is not changed.",
                "warning")
            results.append(RowResult(row.number, "skipped", member, issues))
        else:
            results.append(RowResult(row.number, "ready", member, issues))

    return ValidationResult(rows=results)


def _check_method(matching_method: str) -> None:
    if matching_method not in MATCHING_METHODS:
        raise ValueError(f"matching_method must be one of {MATCHING_METHODS}")
