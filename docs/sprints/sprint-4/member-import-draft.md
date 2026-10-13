# Member import: draft agreements (S4-T2-A)

**Status:** proposed by teammate 2 for review. Nothing here changes the accepted October 9 rules. Items marked **Decide** need a teammate's answer.

Back to [Sprint 4](README.md) · [Team rules](universal-agreements.md) · [API/data reference](api-data-reference.md)

## What exists in code

`backend/app/imports/` reads a CSV or XLSX roster and checks every row. It saves nothing and has no routes yet. Writing valid rows to the roster is S4-T2-B and must reuse teammate 1's member-creation code.

| File | Does |
| --- | --- |
| `cleaning.py` | Trim/lowercase rules from the team rules. A stand-in for teammate 1's shared helpers. |
| `parsers.py` | Reads CSV/XLSX with limits. Formulas stay as text. Every failure is an `ImportFileError` in the shared error format. |
| `validation.py` | Column mapping, then row checks with row and field on every issue. |

## Limits (proposed)

| Limit | Value | Error code |
| --- | --- | --- |
| File size | 2 MB | `FILE_TOO_LARGE` |
| Member rows | 2,000 | `TOO_MANY_ROWS` |
| Columns | 50 | `TOO_MANY_COLUMNS` |
| File types | `.csv`, `.xlsx` (first sheet only) | `UNSUPPORTED_FILE_TYPE` |

Other file errors: `EMPTY_FILE`, `MISSING_HEADER`, `DUPLICATE_COLUMN`, `UNREADABLE_FILE`. All use HTTP 422 so the status list in the API reference stays unchanged. **Decide:** whether oversized files should return 413 instead.

## Partial success and retries (proposed)

- **Valid rows are saved even when other rows fail.** Failures are reported, not hidden. An officer fixes only the failed rows and uploads them again.
- **Duplicates are skipped, never overwritten.** A duplicate inside the file keeps the first row and skips later ones. A duplicate of someone already on the roster is skipped and that member is not changed.
- **Re-uploading the same file is safe.** The second run creates nothing, because every row now matches an existing member.
- **Counts must match the database.** Preview counts are `ready / skipped / failed`. The final result counts are `created / skipped / failed` taken from what was actually saved, including after an interrupted or retried upload.

## What counts as a problem

A row is **failed** when it has an error, **skipped** when it duplicates another member, and **ready** otherwise. Warnings never block a row.

| Code | Severity | When |
| --- | --- | --- |
| `REQUIRED_FIELD_MISSING` | error | Name or the club's matching field is empty. |
| `INVALID_EMAIL` | error | Not in the form `something@domain.tld`. |
| `INVALID_DATE` | error | `date_joined` is not `YYYY-MM-DD`. Other layouts such as `03/04/2026` are rejected because they can mean two dates. Real date cells in XLSX are accepted. |
| `FIELD_TOO_LONG` | error | Name over 200 or identifier over 64 characters. |
| `AMBIGUOUS_IDENTIFIER` | error | An all-digit identifier is shorter than the club's usual length, so leading zeros may have been lost. The system flags it and never guesses. |
| `DUPLICATE_IN_FILE` | warning, row skipped | Same matching value as an earlier row. |
| `DUPLICATE_MEMBER_IDENTIFIER` | warning, row skipped | Already on the roster. Same code as the API reference. |
| `NUMERIC_IDENTIFIER_CELL` | warning | An XLSX identifier cell is stored as a number. Length looks right, but zeros could still be missing. |
| `FORMULA_TREATED_AS_TEXT` | warning | A cell starts with `=`, `+`, `-` or `@`. It is read as text and never calculated. |

Expected identifier length comes from the club setting when one exists. Until then it is the length most identifiers in the file share. With no clear majority (a tie, or fewer than two matching values) nothing is flagged.

## API (draft)

Two steps, with no file stored on the server. Both use multipart form data and officer routes under `/api/organizations/{organization_id}/`, with the same Owner/Admin checks as other member routes.

**1. Preview.** `POST .../member-imports/preview` with `file` and an optional `mapping` (JSON of member field to column name).

```
200 {
  "file_type": "csv",
  "headers": ["Full Name", "Student ID", "E-mail", "Joined"],
  "suggested_mapping": {"name": "Full Name", "external_member_id": "Student ID", "email": "E-mail", "date_joined": "Joined"},
  "mapping_issues": [],
  "summary": {"total": 8, "ready": 3, "skipped": 1, "failed": 4},
  "issues": [
    {"row": 4, "field": "external_member_id", "code": "AMBIGUOUS_IDENTIFIER", "message": "...", "severity": "error"}
  ]
}
```

**2. Import.** `POST .../member-imports` with `file` and `mapping`. The server checks everything again, because the preview is not trusted, then saves the valid rows.

```
200 {
  "summary": {"created": 3, "skipped": 1, "failed": 4},
  "issues": [ ...same shape as preview... ]
}
```

Errors use the shared shape `{"error": {"code", "message", "field"}}`: 401 not logged in, 403 role cannot import, 404 unknown or inaccessible club, 422 file or mapping problem, 429 rate limited. The club comes from the path and the officer's access, never from the file.

## Questions for teammate 1

1. Which of `email` and `external_member_id` may be empty beyond the club's matching field, and is `date_joined` required? The import treats only name and the matching field as required.
2. Can the shared cleaning functions be imported directly? `cleaning.py` should then become a thin re-export.
3. What should happen when an upload row matches an **archived** member: skip it, or offer restore? Today it is skipped as a duplicate.
4. Will clubs store an expected identifier length (for example 9 for a RIN)?
