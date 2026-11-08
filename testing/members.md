# Member testing guide

One checklist for the member roster, adding, editing, searching, profiles, and
related dashboard navigation. Imports have a [separate guide](member-imports.md).

This consolidates the earlier member guides. It is a repeatable checklist, not a
record of completed test runs. The team has tried member workflows during
development but has not maintained a complete results log. Older documents remain
available in Git history.

## Before testing

- Run the frontend and backend with the development database configured.
- Use fake members and accounts with access to different test clubs.
- Use an Owner and an Admin account to check their permitted actions.

## Add and list members

- Add a member and confirm the roster and total update. Refresh to confirm the
  record was saved.
- Add a name-only member; optional fields should stay empty and the missing
  check-in identifier should be indicated.
- Enter an external ID such as `001234`; confirm its leading zeros are preserved.
- Try a blank name, invalid email, and duplicate email/external ID. Show a useful
  error without creating another record. Check email capitalization and spaces.
- Check pagination with more than 40 members and the empty state for a new club.
- Switch clubs; rows and totals should belong only to the selected club.

## Edit members

- Open the row actions and select Edit. The form should contain the saved values.
- Change a name or identifier, save, and refresh. Only changed fields should update.
- Clear optional fields; confirm they become empty in the roster and database.
- Try a duplicate identifier or invalid value; keep entered values so they can
  be corrected. Cancel should leave the saved record unchanged.
- Confirm the success message disappears after a few seconds.

## Search and member details

- Search by partial name, mixed capitalization, email, and external ID. Include
  a member outside the first page and a name containing punctuation.
- Confirm search resets pagination, preserves the full roster total, and shows
  a clear no-results state. Clearing search should restore the roster.
- Type quickly; results should reflect the latest search, not an older response.
- Select a member name. Confirm the profile shows that member's information,
  and editing then reopening it shows the updated values.
- Close the profile using its close button, Escape, or the backdrop. Keyboard
  focus should return to the control that opened it.
- Until attendance and analytics are connected, show unavailable states rather
  than invented attendance counts or engagement status.

## Dashboard and usability

- Select Total Members on Home to open the roster, and Add member to open its form.
- Confirm the Owner's Invite officer shortcut opens invitation controls and is
  hidden for Admin accounts.
- Refresh Members or Settings; retain the page and selected club. Check browser
  Back and Forward navigation too.
- Check desktop and phone widths: readable labels, reachable row actions, usable
  forms, and table scrolling without overflowing the whole page.
- Use the keyboard to open actions and navigate forms and the profile panel.

## Permissions and failure handling

- Using separate accounts, try reading and editing another club's members through
  the API. Access must be denied; switching clubs in the UI alone does not prove this.
- Verify signed-out users cannot read or write member data through the API or
  Supabase Data API.
- Confirm the same identifier can exist in different clubs, but simultaneous
  duplicate submissions within one club produce only one record.
- Stop the backend and check loading errors. Restart it and retry loading data.
- When archive/restore is connected, verify archived identifiers still prevent
  duplicates and restoring a member preserves their history.

## Automated checks

[Member API tests](../backend/tests/test_members.py) use simulated Supabase
responses. They check validation, request handling, and access checks; they do
not prove that live database policies work.

From the repository root, with backend development dependencies installed:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_members.py -q
```

For frontend lint and production-build checks:

```bash
cd frontend
npm run lint
npm run build
```

Record new results only after running the checks. Include the tested commit,
expected and actual result, and whether the check used live or simulated data.
