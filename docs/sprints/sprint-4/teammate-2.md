# Teammate 2 — Member import and analytics

[Team rules](universal-agreements.md) · [API/data reference](api-data-reference.md) · [Sprint plan](README.md)

**Assignee:** add name in Jira. **Epic:** Members; Dashboard. Follow the accepted October 9 agreements.

## Start here

Start with fake CSV/XLSX files and column mapping. You can do this before the member API is finished.

## Your responsibilities and rules

- Reuse teammate 1’s required fields, input-cleaning rules, and member-creation code.
- Check file type/size/row limits; report the row and field for each error.
- Treat spreadsheet formulas as data, not code. Preserve text identifiers; flag missing leading zeros instead of guessing.
- Catch duplicates inside the file, in the roster, and on repeated uploads. Do not silently overwrite members.
- Decide whether valid rows can be saved when other rows fail; show accurate created/skipped/failed counts.
- Calculate analytics from real attendance records; do not maintain a second editable total.

## Work with

Work with 1 for roster writes and 3/4 for event/attendance fields. Share sample calculations before building analytics queries.

## Timing

Full imports mainly target Sprint 5; analytics Sprint 6. Start the parser and test examples in Sprint 4. These features do not block check-in.

## Copy these tickets into Jira

Create **one Task per ticket below**. Paste the first box into **Summary** and the second into **Description**. Set the other fields using the small table. Replace “Teammate” with the person's Jira account; choose an estimate together.

The S4 labels identify these docs, not actual Jira issues. After creating tickets, replace dependency references with real Jira issue keys/links. Check for existing matching issues first.

### Ticket 1 — S4-T2-A

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 2 — select actual person |
| Epic / parent | Members — select the matching existing epic |
| Sprint | Sprint 4 — confirm capacity during planning |
| Status | To Do |

**Copy into Summary:**

```text
Define import mapping and validate fake CSV/XLSX files
```

**Copy into Description:**

```text
What to build
Draft upload/map/preview/result API agreements and build size-limited parsers and input-cleaning tests.

Done when
- [ ] Both file formats map source columns to reviewed C.E.O. fields.
- [ ] Missing fields, malformed rows, ambiguous IDs, and within-file duplicates produce row-level feedback.
- [ ] File/row limits and retry/partial-success policy are documented; no real member data in fixtures.

Depends on / coordinate with
S4-T1-C API agreement; mock member writes allowed.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T2-A
```

### Ticket 2 — S4-T2-B

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 2 — select actual person |
| Epic / parent | Members — select the matching existing epic |
| Sprint | Backlog — target Sprint 5 |
| Status | To Do |

**Copy into Summary:**

```text
Connect validated imports to organization roster
```

**Copy into Description:**

```text
What to build
Write valid rows using shared member rules and expose results in the import flow.

Done when
- [ ] Permission checks apply to uploads and writes.
- [ ] Existing members and repeat uploads are handled without duplicate creation or silent overwrites.
- [ ] Created/skipped/failed counts and row errors reflect actual database outcomes, including interrupted/retried work.

Depends on / coordinate with
S4-T2-A; S4-T1-A/B/C.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T2-B
```

### Ticket 3 — S4-T2-C

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 2 — select actual person |
| Epic / parent | Dashboard — select the matching existing epic |
| Sprint | Backlog — target Sprint 6 |
| Status | To Do |

**Copy into Summary:**

```text
Implement agreed engagement analytics
```

**Copy into Description:**

```text
What to build
Total current members; active/inactive/no-data counts; attendance percentages, event totals/popularity, monthly averages, and member history totals.

Done when
- [ ] Synthetic calculations cover configurable thresholds/periods and members who joined mid-period.
- [ ] Zero eligible events show no-data; finalized zero-attendance events count in monthly averages; no-event months show no-events.
- [ ] Distinct attendees, cancellation, archival, voids, and timezone boundaries follow the shared rules; organization data is isolated.

Depends on / coordinate with
Member schema; completed/finalized events; confirmed/voided attendance API agreement.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T2-C
```
