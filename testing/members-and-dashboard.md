# Members and dashboard testing

**Date:** October 26, 2026  
**Branch:** `feat/member-system`  
**Scope:** Member creation, roster listing, Home dashboard, and navigation.

These results describe checks performed during development, before committing
this work. They are not a claim that the full member system is complete.

## Live manual checks

Performed by Aliyah using the application and Supabase development database.

| Test | Steps and expected result | Recorded result |
| --- | --- | --- |
| Apply members migration | Run `202610260001_create_members.sql` in Supabase. The table and rules are created successfully. | Passed — manual. Aliyah reported successful execution. This alone does not verify access policies. |
| Add a member | Select a club, open Members, enter test details, and save. The member should be added successfully. | Passed — manual. Aliyah confirmed the add-member flow worked. |
| Duplicate external ID | Add another member in the same club using the same external ID. Show a duplicate warning and do not create a second record. | Passed — manual. Aliyah confirmed the duplicate test worked. |

The successful add-member report did not separately confirm every suggested
check, such as refresh persistence or leading zeros in the live database. Those
remain pending below.

## Automated checks with simulated responses

Performed by the assistant using temporary local test scripts. No real member
records were created and no invitation emails were sent by these checks.
The temporary scripts are not committed regression tests in this repository.

### Member API

Ten route checks passed using FastAPI's test client and a simulated Supabase
HTTP transport:

- Missing sign-in token returns 401.
- Listing returns the total count, a default page size of 40, and `no-store`.
- Creation returns 201 and preserves a text identifier's leading zeros.
- Blank names are rejected with 422.
- A caller-supplied organization ID in the request body is rejected with 422.
- A page size above 100 is rejected with 422.
- A negative offset is rejected with 422.
- A simulated duplicate returns 409.
- Missing club access stops creation before any member-table request.
- A simulated expired session returns 401.

These tests exercise application behavior, not the live Supabase RLS policies
or simultaneous database writes.

### Members page and Home dashboard

Browser checks passed with simulated login, clubs, and member responses:

- Display the roster and move between pages of 40 members.
- Submit the add-member form and refresh the displayed roster/count.
- Preserve leading zeros in the submitted external ID.
- Switch clubs without retaining the previous club's rows; show an empty state
  for a club with no members.
- Open the roster by clicking Home's Total Members card.
- Open the expanded add-member form from Home's Add member shortcut.
- Take owners to the invitation controls and focus the email input.
- Hide the Invite officer shortcut for an Admin.
- Display the selected club's member total after switching clubs.
- Render at a 390px mobile width without page-level horizontal overflow.
- Use two metric columns on mobile after the dashboard refinements.

Desktop and mobile screenshots were visually reviewed during these checks.
Later icon and dropdown-text refinements passed a build check; the browser suite
was not rerun after that final cosmetic change.

## Build and code checks

| Check | Result |
| --- | --- |
| Python syntax checks for member schema/service | Passed at the stages when the files were added. |
| Frontend production build (`npm run build`) | Passed, including after the final icon/dropdown refinements. |
| Frontend type check (`npm run typecheck`) | Passed after adding the disabled Import members button. Later builds also ran TypeScript compilation. |
| Frontend lint (`npm run lint`) | Completed with two existing `react(set-state-in-effect)` warnings in `src/App.tsx` and `src/hooks/useClubs.ts`. Not warning-free. |
| Whitespace check (`git diff --check`) | Passed for tracked changes. |
| Existing backend health/invitation regression tests | Blocked: `backend/tests/conftest.py` imports `openpyxl`, which was missing from the active backend virtual environment. Test collection stopped. |

## Next manual checks

Use fake data in development. Record results here after performing each check.

- [ ] **Refresh persistence:** refresh after saving; the member is still visible.
- [ ] **Name-only member:** save with only a name; show the club's missing-identifier notice.
- [ ] **Leading zeros:** save an ID such as `001234`; confirm it stays unchanged in the roster and database.
- [ ] **Duplicate email:** reject the same email within a club, including differences in capitalization or surrounding spaces.
- [ ] **Separate clubs:** the same identifier can belong to members in different clubs.
- [ ] **Access isolation:** using two accounts in separate clubs, try the other club's API URL; reading and writing must be denied. Switching between clubs in a mocked UI does not prove this.
- [ ] **Database access rules:** verify signed-out users cannot read/write members through the Supabase Data API; officers cannot access another club's records.
- [ ] **Missing optional values:** blank email, external ID, date joined, and class year save as NULL.
- [ ] **Service failure:** stop the backend, confirm a useful error, restart it, and retry loading the roster.
- [ ] **Simultaneous duplicate creation:** concurrent requests with the same identifier produce only one member record.
- [ ] **Archived identifiers:** archived records still prevent a second member from claiming their identifiers; test when archive/restore is connected.

Member editing, search, archive/restore, imports, and attendance/finance analytics
are not covered as working features by this report. Their unfinished UI sections
are placeholders.
