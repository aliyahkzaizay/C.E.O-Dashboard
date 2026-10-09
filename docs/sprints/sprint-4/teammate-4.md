# Teammate 4 — Attendance and check-in backend

[Team rules](universal-agreements.md) · [API/data reference](api-data-reference.md) · [Sprint plan](README.md)

**Assignee:** add name in Jira. **Epic:** Attendance. Follow the accepted October 9 agreements.

## Start here

Start by sharing check-in request/response examples with teammate 5. Then implement matching and recording attendance.

## Your responsibilities and rules

- Own check_in_submissions and attendance, plus the review API and basic officer review screen.
- The token determines the club/event. Never trust an attendee to choose those IDs.
- Use teammate 1’s identifier rules; match only within the event’s club. Unknown/archived members go to review.
- Check inputs and whether check-in is open on every submission. Repeated or simultaneous requests must not create duplicate attendance.
- Let officers link/create/ignore unmatched submissions. Reuse member-creation code and make retries safe.
- Add spam controls without blocking a whole campus Wi-Fi network. Public responses must not reveal member profiles.
- Keep correction history and exclude voided attendance from totals.

## Work with

Use member/access helpers from 1 and event/token/settings from 3. Give 5 public form examples and error outcomes. Give 2 attendance/history data. Work with 3 on finalization and reopening.

## Timing

This is Sprint 4 core work. You do not need imports or analytics finished first.

## Copy these tickets into Jira

Create **one Task per ticket below**. Paste the first box into **Summary** and the second into **Description**. Set the other fields using the small table. Replace “Teammate” with the person's Jira account; choose an estimate together.

The S4 labels identify these docs, not actual Jira issues. After creating tickets, replace dependency references with real Jira issue keys/links. Check for existing matching issues first.

### Ticket 1 — S4-T4-A

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 4 — select actual person |
| Epic / parent | Attendance — select the matching existing epic |
| Sprint | Sprint 4 — confirm capacity during planning |
| Status | To Do |

**Copy into Summary:**

```text
Define attendance API agreements and schema
```

**Copy into Description:**

```text
What to build
Review tables, relationships, public form/submission payloads, officer review/history routes, and shared fixtures.

Done when
- [ ] Database relationships prevent cross-club attendance and enforce member/event uniqueness.
- [ ] Unmatched submissions are stored separately from confirmed attendance.
- [ ] Teammate 5 has examples for success, duplicate, pending-review, invalid, closed, and rate-limited states.

Depends on / coordinate with
T1/T3 schema API agreements; mocks allowed.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T4-A
```

### Ticket 2 — S4-T4-B

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 4 — select actual person |
| Epic / parent | Attendance — select the matching existing epic |
| Sprint | Sprint 4 — confirm capacity during planning |
| Status | To Do |

**Copy into Summary:**

```text
Implement validated native check-in and backend protections
```

**Copy into Description:**

```text
What to build
Implement public form form display data and POST /api/check-ins/{token} processing.

Done when
- [ ] Known member creates one attendance record; repeat/simultaneous requests do not duplicate it.
- [ ] Invalid/closed/cancelled requests are rejected; valid unmatched submissions enter review.
- [ ] Rate limits/bot controls are tested without treating a campus IP as one attendee; public responses reveal no private roster fields.

Depends on / coordinate with
S4-T4-A; T1 member matching; T3 event/token settings.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T4-B
```

### Ticket 3 — S4-T4-C

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 4 — select actual person |
| Epic / parent | Attendance — select the matching existing epic |
| Sprint | Sprint 4 — confirm capacity during planning |
| Status | To Do |

**Copy into Summary:**

```text
Implement officer review and attendance retrieval
```

**Copy into Description:**

```text
What to build
Provide event attendance, member attendance history, and link/create/ignore resolution with minimal officer review UI.

Done when
- [ ] Authorized officer can resolve unknowns without duplicate members or attendance on retry.
- [ ] Ignoring or resolving a submission updates its review state; another organization cannot inspect or resolve it.
- [ ] Corrections preserve history; returned totals exclude voids; marking attendance ready for reporting rules align with teammate 3.

Depends on / coordinate with
S4-T4-B; T1 member-write/access helpers.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T4-C
```
