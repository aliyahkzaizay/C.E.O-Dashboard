# API and database reference

Use this when writing schemas or connecting frontend and backend code. For the short version, read [Team rules](universal-agreements.md).

These are the working agreements accepted October 9, 2026. They describe what we will build, not completed features. Change a rule here and in the team rules together, then tell anyone whose code depends on it.

**Quick definitions:** a schema lists data fields and types; an API contract says what a request sends and returns; normalization means cleaning inputs consistently; a migration is a saved SQL change to the database; a UUID is a generated ID; null means no value.

## Database fields

Database schemas describe stored tables and constraints. API schemas describe accepted/returned data. A create request does not simply expose every database column.

| Record | Shared foundation |
| --- | --- |
| organizations | organization_id, organization_name, matching_method, member_identifier_label, reporting_timezone, engagement threshold/period, currency |
| organization_users | organization_id, user_id (Supabase Auth), access_role |
| members | member_id, organization_id, name, email, external_member_id, date_joined, membership_status; club role if needed |
| events | event_id, organization_id, event_name, starts_at, event_type, description, status, archived_at, check_in_token, check_in_open, attendance_finalized_at |
| check_in_submissions | submission_id, organization_id, event_id, submitted identifier, necessary review details, received_at, review status, matched_member_id when resolved |
| attendance | attendance_id, organization_id, member_id, event_id, check_in_time, recorded_at; void actor/time/reason for corrections |
| financial_transactions | transaction_id, organization_id, kind, exact amount, date, category, description, optional event_id, creator, void metadata |

- Use generated UUIDs for record IDs; serialize them as strings. External identifiers are text, never numeric RIN fields.
- Every member and event belongs to one organization. Attendance must connect a member and event in that same organization, enforced by database relationships as well as API checks.
- Auth accounts and roster members are distinct. Roster role (for example, Treasurer) does not itself grant application permissions.
- The organization chooses email or external-ID matching. Its selected field must be present and unique within that organization. The other field may be optional; finalize exact nullability with teammate 1.
- Normalization: trim external-ID surrounding whitespace and preserve leading zeros/case unless the organization’s rule says otherwise. Trim and lowercase email for matching; do not remove plus tags or dots. All import, manual-entry, and check-in paths must use the same reviewed rule.
- API timestamps include an offset and are normalized consistently for storage. date_joined is a calendar date. Use the organization's reporting timezone for reporting boundaries; finalize day/period boundary rules together.
- One logical attendance record per member/event. Resolve correction/reinstatement by updating its state, rather than creating an untracked duplicate.

## API requests and responses

Officer routes use `/api/organizations/{organization_id}/...`. Examples below are planned endpoints, not routes currently implemented.

| Operation | Method and route | Success |
| --- | --- | --- |
| Create member | POST /api/organizations/{organization_id}/members | 201, member object |
| List/search members | GET /api/organizations/{organization_id}/members?search=alex&limit=50&offset=0 | 200, list envelope |
| Read member | GET /api/organizations/{organization_id}/members/{member_id} | 200, member object |
| Edit/archive member | PATCH /api/organizations/{organization_id}/members/{member_id} | 200, updated member |
| Event operations | Same create/list/read/PATCH pattern under /events | Same conventions |
| Public form metadata | GET /api/check-ins/{token} | 200, minimal display metadata |
| Public submission | POST /api/check-ins/{token} | 200, result object |

`PATCH` changes supplied editable fields only; reject unexpected fields. Never accept a caller-provided owner, organization assignment, or generated ID as authority. In FastAPI, path parameters use `{member_id}`, not `:id`.

Member create body:

```json
{"name":"Alex Rivera","external_member_id":"001234567","email":"alex@example.edu","date_joined":"2026-10-12"}
```

Create responses add generated IDs and stored fields. List shape: `{"items": [], "total": 0, "limit": 50, "offset": 0}`. Apply bounded pagination consistently; review limits before implementation.

Public metadata includes only the event/organization display name, matching field label/method, and whether check-in is open. It must not expose rosters, officer identities, or attendance lists. Submission body: `{"identifier":"001234567"}`. The server derives organization/event from the token. Result: `{"status":"accepted","message":"Check-in received."}`. Other outcomes: `already_checked_in` and `pending_review`; these must not reveal member profiles. Review potential identifier enumeration before public release and use generic messaging where needed.

Use one error shape across APIs, including framework validation errors:

```json
{"error":{"code":"DUPLICATE_MEMBER_IDENTIFIER","message":"A member with this identifier already exists.","field":"external_member_id"}}
```

`field` may be null for non-field errors. Statuses: 401 invalid/missing officer login; 403 known authorized-organization role cannot perform action; 404 unknown or inaccessible record; 409 duplicate/conflict or CHECK_IN_CLOSED; 422 invalid fields; 429 rate limited; 500 generic unexpected error without internals. Teammate 1 owns shared exception/authorization helpers; teammate 4 defines public check-in error codes; teammate 5 displays them.

## Permissions and public boundary

Roles:

| Actor | Access |
| --- | --- |
| Owner | Organization settings, officer access, and organization records |
| Admin | Members, events, attendance, and basic finance within their organization |
| Public attendee | Minimal event metadata and submission through a valid open check-in link only |

Validate the Auth identity, organization membership, permitted role, and target record's organization on every officer operation. Client-provided IDs are not authorization. Never grant access merely because an account knows an organization ID. Organization creation must establish its initial owner safely; prevent removal of the last owner. Invitation/join flow and ownership transfer still need design.

Use database policies and constraints as well as API checks. Privileged Supabase credentials can bypass Row Level Security, so a server using them must enforce every boundary explicitly. No credentials in frontend code except intended public Supabase configuration. No real records in tests.

## History and lifecycle

- Archive members instead of hard-deleting history. Restore a returning member; do not reuse their identifier for a duplicate profile. Exclude archived members from the current roster by default. Rule: public check-in from an archived member requires officer review rather than automatic reactivation.
- Event status is scheduled/completed/cancelled; archival is separate. Cancelling closes check-in and excludes the event from engagement eligibility. Archiving hides a historical event from ordinary lists but does not remove its reporting history.
- Closed check-in rejects new submissions server-side even if the attendee loaded the page earlier. Close/reopen preserves the URL and QR.
- Closing and finalizing are separate. Rule: finalizing requires check-in closed and review resolved. Reopening requires explicitly clearing finalization. Teammates 3/4 implement and test these transitions together.
- Void incorrect attendance/financial entries with actor, timestamp, and reason; exclude voided records from totals. No hard-delete endpoints in the MVP contract.

## Metrics and finance rules

Active percentage = attended eligible events / eligible events × 100, compared inclusively with a club-configured threshold over a configured period. Eligible events are completed, non-cancelled, finalized, within the period, and after the member joined. No eligible events means “Not enough data.” The threshold is configurable; 50% is only an example.

Monthly average = sum of distinct confirmed attendees at each eligible event / eligible event count that month. Include zero-attendance finalized events. With no events show “No events.” Popularity ranks distinct confirmed attendee counts. Exclude voided attendance. Membership status is separate from calculated engagement. Finalize roster-status inclusion and timezone boundaries before analytics implementation.

Finance: one currency, exact decimal or minor-unit amounts, opening balance/effective date, manual income/expenses, categories, optional same-organization event link, and void history. Opening balance affects recorded balance, not period income totals. Teammates 1/3 agree on opening-balance storage and its exact schema; owner/admin finance access follows the permissions table above. No bank integration or payment processing.

## Implementation coordination and remaining details

| Decision | Lead | Consult |
| --- | --- | --- |
| Implement accepted member rules; resolve unspecified field nullability | 1 | 2, 4 |
| Implement accepted roles; design invitation and ownership-transfer flow | 1 | 3, whole team |
| Implement accepted event lifecycle and token contract | 3 | 4, 5 |
| Public response privacy, rate limits, review data retention | 4 | 1, 5 |
| Import mapping, partial success, row limits, retry policy | 2 | 1 |
| Metric timezone/boundaries and finance opening balance | 2 / 3 | 1, 4 |

Each owner supplies migrations for their domain after a coordinated baseline review. Do not edit already-applied shared migrations or apply remote changes casually. Use the sprint definition of done for verification and PR review.
