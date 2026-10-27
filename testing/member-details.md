# Member details — October 26, 2026

Click a roster name to open a right-side member panel (full-screen on phones). It loads current member information and links to the existing edit form. Engagement and attendance remain explicitly unavailable until analytics are connected. No database migration is required.

## Verified

- 77 focused backend tests passed across members, health, and invitations, using mocked Supabase HTTP responses. Detail coverage includes Owner/Admin access, denied access, missing sessions, missing members, malformed responses, upstream errors, and club/member query scoping.
- Frontend production build passed. Lint reported only the existing App.tsx and useClubs.ts warnings.
- Mocked Chrome browser checks passed: detail fields, retry after an error, edit prefill, Escape and backdrop dismissal, focus restoration and keyboard wrapping, and full-width mobile layout. The mobile screenshot was visually inspected.
- `git diff --check` passed.

## Verification limits

These tests did not contact live Supabase or verify deployed RLS policies. The full backend suite was not run because the unrelated spreadsheet test setup requires missing openpyxl. Browser checks used a temporary Playwright script, not a committed browser regression suite.

## Try with your account

1. Open Members and select a name; check its information against your roster.
2. Select Edit member, save a change, and reopen the profile to confirm fresh data.
3. Close with the X or Escape; try a phone-sized window.
4. Verify access with separate accounts belonging to different clubs before release.
