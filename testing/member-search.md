# Live member search

**Date:** October 26, 2026  
**Branch:** `feat/member-system`  
**Status:** Simulated tests passed; live Supabase search pending.

The roster filters by name, email, or external ID after a 250ms typing pause.
Search is case-insensitive, scoped to the selected club, and excludes archived
members. Matching happens before pagination, so it searches the entire roster.
Total Members remains the full current roster count; pagination shows matches.

## Automated verification

**64 targeted backend tests passed** across members, health, and invitations.
Search additions verify quoted literal filters for names, email punctuation,
leading-zero IDs, non-ASCII text, quotes, commas, parentheses, backslashes, and
regex/wildcard characters. Tests also verify club scope, archived exclusion,
blank search, pagination parameters, length/control-character rejection, and
access denial before retrieving members. HTTP responses are mocked: this checks
request construction and route behavior, not the live PostgreSQL matching engine.

```bash
PYTHONDONTWRITEBYTECODE=1 backend/.venv/bin/python -m pytest --noconftest backend/tests/test_members.py backend/tests/test_api.py backend/tests/test_invitations.py -q -p no:cacheprovider
```

As before, `--noconftest` skips the unrelated spreadsheet fixtures requiring the
missing openpyxl dependency; this is not a full backend-suite run.

A temporary browser test with fake records passed:

- Match names regardless of capitalization, partial email, and partial external ID.
- Find a member outside the initial 40 rows.
- Reset pagination on search and preserve the full roster metric.
- Show No matching members; Clear search restores the roster.
- Send one search request for a typing burst rather than one per character.
- Ignore a delayed previous response after a newer search completes.
- Render at 390px without page-level horizontal overflow.

Frontend build passed. Lint has only the two existing effect warnings.
No real Supabase records were read or modified by these simulated checks.

## Implementation references

Search uses PostgREST's `imatch` with PostgreSQL's literal/case-insensitive `(?iq)`
options and quoted filter values. User text is not treated as a regular expression.

- https://docs.postgrest.org/en/v13/references/api/tables_views.html
- https://docs.postgrest.org/en/v16/references/api/url_grammar.html
- https://www.postgresql.org/docs/18/functions-matching.html

## Manual verification pending

- [ ] Search an existing test member by partial name, mixed case, email, and external ID.
- [ ] Check names containing apostrophes or punctuation against real stored records.
- [ ] Confirm clearing search restores all members and the total metric stays unchanged.
- [ ] Verify results from a different club cannot be retrieved by an unauthorized account.
