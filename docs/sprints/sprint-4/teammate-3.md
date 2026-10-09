# Teammate 3 — Events and basic finance

[Team rules](universal-agreements.md) · [API/data reference](api-data-reference.md) · [Sprint plan](README.md)

**Assignee:** add name in Jira. **Epic:** Events; Finance. Follow the accepted October 9 agreements.

## Start here

Start with event creation and event fields. Then provide the check-in link and open/close settings API.

## Your responsibilities and rules

- Own event tables, API models, and basic officer event screens.
- Generate a stable, hard-to-guess check-in token on the backend. Teammate 5 makes its link and QR usable in the UI.
- Keep event cancellation, archival, check-in open/closed, and attendance finalization separate.
- Only authorized officers change event settings. Teammate 4 checks these settings when accepting submissions.
- Keep event history and its attendance/finance links instead of deleting them.
- For finance, use exact money values, one currency, same-club event links, and voids with a reason.

## Work with

Get club/access rules from 1. Give event/settings examples to 4 and 5 early. Work with 4 on finalization and 2 on reporting. Do not independently change their tables.

## Timing

Events and check-in settings come first in Sprint 4. Plan finance storage if time allows; the basic finance feature targets Sprint 5.

## Copy these tickets into Jira

Create **one Task per ticket below**. Paste the first box into **Summary** and the second into **Description**. Set the other fields using the small table. Replace “Teammate” with the person's Jira account; choose an estimate together.

The S4 labels identify these docs, not actual Jira issues. After creating tickets, replace dependency references with real Jira issue keys/links. Check for existing matching issues first.

### Ticket 1 — S4-T3-A

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 3 — select actual person |
| Epic / parent | Events — select the matching existing epic |
| Sprint | Sprint 4 — confirm capacity during planning |
| Status | To Do |

**Copy into Summary:**

```text
Implement organization-scoped event setup
```

**Copy into Description:**

```text
What to build
Create schema/API models, migrations, event create/list/read/edit/archive/cancel behavior, and minimal officer UI.

Done when
- [ ] Event fields validate and save; unauthorized/cross-club operations fail.
- [ ] Cancellation closes check-in; archive preserves attendance and financial relationships.
- [ ] Examples and fixtures are available to teammates 4/5 before integration.

Depends on / coordinate with
S4-T1-A API agreement; accepted shared schema API agreement; migration review.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T3-A
```

### Ticket 2 — S4-T3-B

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 3 — select actual person |
| Epic / parent | Events — select the matching existing epic |
| Sprint | Sprint 4 — confirm capacity during planning |
| Status | To Do |

**Copy into Summary:**

```text
Implement stable check-in token and officer settings API
```

**Copy into Description:**

```text
What to build
Generate event tokens and save open/close/lifecycle settings; integrate marking attendance ready for reporting rules with attendance owner.

Done when
- [ ] Same event retains its link after closing/reopening.
- [ ] Only authorized officers can change state; cancellation and marking attendance ready for reporting transitions obey the API agreement.
- [ ] Metadata/settings API supports teammate 5 controls; teammate 4 reads the authoritative state.

Depends on / coordinate with
S4-T3-A; T4 API agreement; reviewed lifecycle.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T3-B
```

### Ticket 3 — S4-T3-C

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 3 — select actual person |
| Epic / parent | Finance — select the matching existing epic |
| Sprint | Backlog — target Sprint 5 |
| Status | To Do |

**Copy into Summary:**

```text
Implement basic finance ledger and summaries
```

**Copy into Description:**

```text
What to build
Agree opening-balance storage, then implement manual entries, categories, optional event links, void history, and basic UI/totals.

Done when
- [ ] Exact amounts and currency rules enforced; opening balance is not counted as period income.
- [ ] Voids retain reason/actor/time and are excluded from totals; optional event belongs to the same organization.
- [ ] Opening/effective dates, reporting totals, and unauthorized access have meaningful tests.

Depends on / coordinate with
T1 organization/access API agreement; shared finance design review.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T3-C
```
