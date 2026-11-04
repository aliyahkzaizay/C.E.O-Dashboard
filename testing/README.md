# Testing records

This folder records what we tested, the result, and what still needs checking.
It contains test reports and manual checklists, not application code.

- [Members and dashboard — October 26, 2026](members-and-dashboard.md)
- Existing executable backend tests remain in [backend/tests](../backend/tests/).

## Recording a test

Include the steps, expected result, actual result, date, and who performed it.
Use fake member details; never include passwords, access tokens, API keys, or real
member information in reports or screenshots.

Status meanings:

- **Passed — manual:** someone tried the workflow and confirmed the result.
- **Passed — simulated:** code was exercised with fake service responses. This
  does not prove that the hosted database or its permissions behave correctly.
- **Pending:** no confirmed result yet.
- **Blocked:** the test could not run; record the reason.

Keep older results as historical evidence. Recheck affected features after changes.

## Member editing

See [Member editing tests](member-editing.md) for update endpoint/shared form
results, a repeatable backend command, and the pending live checklist.

## Member search

See [Live member search](member-search.md) for simulated checks and the pending
live Supabase checklist.

- [Member details](member-details.md): API access checks and drawer behavior.
