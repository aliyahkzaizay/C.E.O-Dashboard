# Teammate 1 — Members, organizations, and officer access

[Team rules](universal-agreements.md) · [API/data reference](api-data-reference.md) · [Sprint plan](README.md)

**Assignee:** add name in Jira. **Epic:** Authentication/Organizations; Members. Follow the accepted October 9 agreements.

## Start here

Start with officer login and club access. Then build add/view/edit/search/archive members.

## Your responsibilities and rules

- Own organizations, organization_users, and members: database fields, API models, and basic officer screens.
- Keep login accounts separate from roster members. A club role such as Treasurer does not grant app access.
- Only authorized officers can use club records. A club must keep an owner.
- Enforce duplicate IDs in the database, including simultaneous requests. Preserve leading zeros.
- Archive and restore members; keep attendance history.
- Share input-cleaning, member-creation, access checks, and error handling so others reuse them.

## Work with

Teammates 2 and 4 need your member fields and member-creation rules. Everyone needs your access checks. Coordinate club timezone, currency, and engagement settings with 2/3. Teammate 4 owns creating attendance records.

## Timing

Full invitation screens and complex ownership transfers can come later; never let someone join a club just by knowing its ID.

## Copy these tickets into Jira

Create **one Task per ticket below**. Paste the first box into **Summary** and the second into **Description**. Set the other fields using the small table. Replace “Teammate” with the person's Jira account; choose an estimate together.

The S4 labels identify these docs, not actual Jira issues. After creating tickets, replace dependency references with real Jira issue keys/links. Check for existing matching issues first.

### Ticket 1 — S4-T1-A

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 1 — select actual person |
| Epic / parent | Authentication/Organizations — select the matching existing epic |
| Sprint | Sprint 4 — confirm capacity during planning |
| Status | To Do |

**Copy into Summary:**

```text
Review and implement organization access setup
```

**Copy into Description:**

```text
What to build
Inspect the remote schema, write reviewable migrations for organizations and organization_users, and connect officer identity to organization access.

Done when
- [ ] Organization creation establishes one owner safely; access is never granted by knowing an ID.
- [ ] Valid login and organization permissions are checked; fake users in two organizations cannot read/write each other’s records.
- [ ] Owner/admin behavior and last-owner protection follow the reviewed policy; errors use the shared format.

Depends on / coordinate with
Accepted universal agreements; Supabase development access.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T1-A
```

### Ticket 2 — S4-T1-B

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 1 — select actual person |
| Epic / parent | Members — select the matching existing epic |
| Sprint | Sprint 4 — confirm capacity during planning |
| Status | To Do |

**Copy into Summary:**

```text
Implement member schema and manual roster features
```

**Copy into Description:**

```text
What to build
Create member schemas/migrations and the club-specific add/list/read/search/edit API plus minimal officer UI.

Done when
- [ ] Create/read/edit/search/archive work only within the authorized organization.
- [ ] Required fields validated; identifiers preserve leading zeros; duplicate and simultaneous inserts are rejected consistently.
- [ ] List responses are size-limited; archived records are hidden by default and remain restorable with history intact.

Depends on / coordinate with
S4-T1-A and reviewed identifier API agreement.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T1-B
```

### Ticket 3 — S4-T1-C

| Jira field | Value |
| --- | --- |
| Issue type | Task |
| Assignee | Teammate 1 — select actual person |
| Epic / parent | Setup — select the matching existing epic |
| Sprint | Sprint 4 — confirm capacity during planning |
| Status | To Do |

**Copy into Summary:**

```text
Publish shared member and authorization API agreements
```

**Copy into Description:**

```text
What to build
Provide reusable input-cleaning/member-create helpers and fake examples to other owners.

Done when
- [ ] Import and unmatched-review owners agree on helper inputs, outputs, duplicate behavior, and error codes.
- [ ] API examples distinguish create fields from generated/server-owned fields.
- [ ] Other owners can build against mocks without copying member business rules.

Depends on / coordinate with
Accepted universal agreements; may precede full implementation.

Shared rules
Follow docs/sprints/sprint-4/universal-agreements.md.
Use docs/sprints/sprint-4/api-data-reference.md for fields and API formats.
Keep each club's data private and use fake data for testing.

Before marking Done
Record checks run and their results in the PR. Get a teammate review and merge the changes. Clearly state if any part still uses mock data.

Planning reference: S4-T1-C
```
