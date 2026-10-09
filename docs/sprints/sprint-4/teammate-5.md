# Teammate 5 — Check-in screens, links, QR codes, and testing

[Team rules](universal-agreements.md) · [API/data reference](api-data-reference.md) · [Sprint plan](README.md)

**Assignee:** add name in Jira. **Epic:** Attendance; Events. Follow the accepted October 9 agreements.

## Start here

Start the public form using fake API responses from teammate 4. Do not wait for everyone else to finish.

## Your responsibilities and rules

- Show the event and required identifier label, such as RIN or Email. No attendee login or club/event selector.
- Build loading, success, duplicate, review, invalid-input, closed, invalid-link, and network-error states.
- Never display a public member roster or member suggestions.
- Provide Copy link, Download QR PNG, Preview form, and officer open/close controls.
- The QR uses the same stable public URL as Copy link. Never include credentials or member IDs.
- Show open/close success only after the backend saves it; display failures.
- Coordinate a full-flow test session. Each teammate fixes and tests their own feature.

## Work with

3 owns token generation and saved event settings; 4 owns validation, matching, and submission responses; 1 owns officer access. Coordinate event-page changes with 3. Replace mocks with real API requests when available.

## Timing

All three tasks target Sprint 4. A QR pointing to localhost works only on that device: use an intentionally reachable development URL for phone tests, or state that verification was same-machine only.

## Copy these tickets into Jira

Create **one Task per ticket below**. Paste the first box into **Summary** and the second into **Description**. Set the other fields using the small table. Replace “Teammate” with the person's Jira account; choose an estimate together.

The S4 labels identify these docs, not actual Jira issues. After creating tickets, replace dependency references with real Jira issue keys/links. Check for existing matching issues first.

### Ticket 1 — S4-T5-A

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 5 — select actual person |
| Epic / parent | Attendance — select the matching existing epic |
| Sprint | Sprint 4 — confirm capacity during planning |
| Status | To Do |

**Copy into Summary:**

```text
Build public check-in form against shared fixtures
```

**Copy into Description:**

```text
What to build
Implement responsive event page with identifier label/input, submit state, and error/result views.

Done when
- [ ] No attendee login required; organization/event context comes from token form display data.
- [ ] Required-field feedback, keyboard labels, loading state, network failure, invalid token, closed check-in, and agreed result states are covered.
- [ ] Mock data is fake and clearly separated; mock completion is not described as live integration.

Depends on / coordinate with
S4-T4-A API agreement; backend may be mocked.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T5-A
```

### Ticket 2 — S4-T5-B

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 5 — select actual person |
| Epic / parent | Events — select the matching existing epic |
| Sprint | Sprint 4 — confirm capacity during planning |
| Status | To Do |

**Copy into Summary:**

```text
Build share-link, QR export, preview, and officer controls
```

**Copy into Description:**

```text
What to build
Integrate event sharing UI and open/close controls with teammate 3 API agreements.

Done when
- [ ] Copy link and downloaded PNG encode the same event URL; image is usable on existing slides.
- [ ] Close/reopen does not invalidate an already-exported QR; control errors are visible.
- [ ] QR decoding/scanning is checked and test URL reachability is documented; a local-only URL is not claimed publicly usable.

Depends on / coordinate with
S4-T3-B API agreement; T1 officer access for live writes.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T5-B
```

### Ticket 3 — S4-T5-C

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 5 — select actual person |
| Epic / parent | Attendance — select the matching existing epic |
| Sprint | Sprint 4 — confirm capacity during planning |
| Status | To Do |

**Copy into Summary:**

```text
Connect live API and coordinate full-flow verification
```

**Copy into Description:**

```text
What to build
Replace mock responses and run a shared fake demonstration across domains.

Done when
- [ ] Known member, repeated submission, unknown member/review, closed form, and reopening work end to end.
- [ ] Wrong-organization officer actions fail; no roster data leaks from public form; shared-network traffic is checked with teammate 4.
- [ ] Record pass/fail evidence and file defects under the owning teammate; incomplete work is not marked Done.

Depends on / coordinate with
T1 member/access; T3 events/settings; T4 submission/review endpoints.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T5-C
```
