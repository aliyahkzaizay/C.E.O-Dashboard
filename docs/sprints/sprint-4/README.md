# Sprint 4 — Who does what?

**October 12–18, 2026** · Working agreements accepted October 9.

**Goal:** officer logs in → adds member → creates event → attendee checks in → attendance appears or goes to officer review.

## Read these in order

1. [Team rules](universal-agreements.md) — short version for everyone.
2. Your teammate guide below — what to start, who to work with, and Jira tasks.
3. [API/data reference](api-data-reference.md) — exact fields and examples when coding.

| Person | Owns | Guide |
| --- | --- | --- |
| Teammate 1 | Members, organizations, officer access | [Start here](teammate-1.md) |
| Teammate 2 | CSV/XLSX import, then analytics | [Start here](teammate-2.md) |
| Teammate 3 | Events, then basic finance | [Start here](teammate-3.md) |
| Teammate 4 | Attendance processing, unmatched review, backend check-in protection | [Start here](teammate-4.md) |
| Teammate 5 | Check-in UI, link/QR sharing, officer controls, coordinating full-flow tests | [Start here](teammate-5.md) |

## You can work in parallel

- **1** shares member fields and access-check rules with everyone.
- **2** starts reading fake spreadsheets; connects roster writes when 1 is ready.
- **3** shares event fields and check-in settings with 4 and 5.
- **4** shares sample check-in requests/responses with 5.
- **5** builds screens using those fake responses, then connects the real API.

A **mock response** is example data used before an endpoint works. An **API contract** is the shared agreement about what that endpoint receives and returns.

Each teammate handles their feature's basic UI and tests. Teammate 5 coordinates a test session, not everyone's frontend or bug fixes.

## This sprint versus later

First finish any missing login, organization, member, and event foundations from Sprint 3. Then connect native check-in, QR/link sharing, open/close controls, and review.

Start import parsing now; full imports mainly belong to Sprint 5. Basic finance stays in the MVP and targets Sprint 5. Analytics mainly belongs to Sprint 6. Choose Sprint 4 tickets based on actual team availability—this document is not a promise to finish the whole MVP this week.

## Copy assignments into Jira

Each teammate guide now contains ready-to-copy tickets:

1. Open the guide and find **Ticket 1**, **Ticket 2**, or **Ticket 3**.
2. Create a Jira **Task**, or update an existing matching task.
3. Copy the **Summary** box into Jira's Summary field.
4. Copy the **Description** box into Jira's Description field.
5. Set the assignee, epic/parent, sprint, and status from the table. Select actual people and existing epics; discuss estimates together.

**Each ticket is a separate Jira task**, not one large task for the entire teammate. Later work stays in the backlog until selected for a sprint. The `[ ]` lines are completion checklists; they remain readable as text if Jira does not turn them into checkboxes.

Labels such as **S4-T1-A** are document references, not Jira keys. Replace references in “Depends on” with real Jira issue links after creation. Nothing has been posted to Jira by this documentation update.

**Statuses:** To Do → In Progress → In Review → Done.

### Shared ticket — S4-TEAM-A

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Select one teammate to coordinate |
| Epic / parent | Setup |
| Sprint | Sprint 4 — confirm capacity during planning |
| Status | To Do |

**Copy into Summary:**

```text
Prepare shared API examples and database starting point
```

**Copy into Description:**

```text
What to build
Prepare the shared examples and database plan that all five teammates will use. The team rules are already accepted; this is implementation preparation, not another approval step.

Done when
- [ ] Existing remote tables have been checked before writing migrations (saved SQL changes).
- [ ] Fake request/response examples follow the agreed fields, roles, errors, and event states.
- [ ] Each table has a teammate responsible for its migration.
- [ ] Remaining implementation questions have owners.

Shared rules
Read docs/sprints/sprint-4/universal-agreements.md and api-data-reference.md before starting.

Before marking Done
Share the examples and migration plan, get a teammate review, and merge the documentation or code changes.

Planning reference: S4-TEAM-A
```

## When is a task done?

- Its “Done when” list passes and the feature is tested.
- Another teammate reviews the pull request; the changes are merged.
- Setup instructions are updated if needed; tests contain no real member data or secrets.
- Features using club records check that another club cannot access them.

A screen using mock data is not yet a working integration. Test the full flow together as soon as basic endpoints work. Deployment is not required this sprint.

If a rule changes, update the shared docs, affected tasks/examples, and tell the teammates who depend on it.

[Architecture](../../architecture.md) · [Schedule](../../sprint-1-deliverables.md) · [Git workflow](../../../CONTRIBUTING.md)
