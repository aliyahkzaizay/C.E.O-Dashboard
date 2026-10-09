# Aliyah (Teammate 1) — Members, organizations, and officer access
c
[Team rules](universal-agreements.md) · [API/data reference](api-data-reference.md) · [Sprint plan](README.md)

**Assignee:** Aliyah. **Epic:** Authentication/Organizations; Members. Follow the accepted October 9 agreements.

## Start here

Start with officer login and club access. Then build add/view/edit/search/archive members.

## First working milestone

An officer can sighow to run n in, create a club, add a member, and see that member. Another club cannot access the record.

Build in this order:

1. Inspect existing Supabase tables and Auth settings without changing them. Share organization/member fields and example responses early so others can start.
2. Add officer sign-up, login, and logout using Supabase Auth. Let Supabase manage passwords.
3. Create organizations and organization_users through reviewed migrations; safely make the club creator its Owner.
4. Add backend checks for signed-in identity, club membership, role, and finance-edit permission. Test with two separate clubs.
5. Add manual member creation, roster listing, and single-member view. Then add editing, search, and archiving.

You own access permissions, not the finance screens. Coordinate that handoff with Teammate 3. No application or database changes are made by this plan.

## Your responsibilities and rules

- Own organizations, organization_users, and members: database fields, API models, and basic officer screens.
- Keep login accounts separate from roster members. A club role such as Treasurer does not grant app access.
- Only authorized officers can use club records. A club must keep an owner.
- All officers can view finances. Only the Owner or an officer with can_edit_finances can change them. Only the Owner grants/revokes this permission; it defaults to false for other officers.
- The Owner grants this permission to the president, treasurer, and anyone else selected. A job title alone never grants access.
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
| Assignee | Aliyah — select her Jira account |
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
- [ ] Owner/admin behavior and last-owner protection follow the shared rules; errors use the shared format.
- [ ] All authorized officers can read finances; changes require Owner access or can_edit_finances. Only the Owner can grant/revoke it; an officer cannot grant it to themselves or gain it by changing their title.

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
| Assignee | Aliyah — select her Jira account |
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
| Assignee | Aliyah — select her Jira account |
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
