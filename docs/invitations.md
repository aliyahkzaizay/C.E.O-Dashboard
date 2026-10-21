# Officer invitations

## What works in the app

An owner selects a club and opens **Club settings** at the bottom of the sidebar.
Under **Officers & invitations**, they enter an officer's email and create an
invitation. Copy the resulting link before leaving the screen and send it yourself;
C.E.O. does not send invitation emails. The link is shown only when created.

The list shows the most recent 100 invitations. Owners can cancel a pending link.
Cancellation cannot remove someone who has already joined.

The recipient opens the link, signs in (or creates and confirms an account), and
clicks **Accept invitation**. Alternatively, use **Join a club** in the dropdown
and paste the link. An incoming invitation is retained in the same browser tab
through sign-in and refresh; if email confirmation opens another tab, reopen the
original invitation link there. Signing in does not accept it automatically.

New officers get admin access and finance editing is off. Existing permissions
are preserved. The database functions enforce owner access, verified-email match,
expiration, revocation, and single use; hiding controls alone does not grant or
protect access.

## Local testing

Links use the current frontend address. A localhost/127.0.0.1 link only reaches
the frontend on the computer opening it. Test with two accounts in separate
browser profiles on the same computer for now. Remote teammates need a reachable
deployment or their own local app plus the invitation link pasted into Join.

1. Sign in as the owner and select the test club.
2. Create an invitation for a second account's email and copy the link.
3. Open the link in another browser profile, sign in with that verified email,
   and accept. Confirm the club appears after refreshing.
4. Check organization_users: admin, can_edit_finances = false.
5. Try a different email: acceptance must fail without consuming the invitation.
6. Try an accepted, cancelled, or expired link: acceptance must fail.
7. Verify an admin cannot create/list/cancel invitations through the RPCs,
   even if they manually send requests. Test the SQL functions with authenticated
   user sessions, not the SQL Editor's privileged database role.
8. Verify simultaneous acceptance creates only one access record and an existing
   owner's role/finance permissions are not changed.

## Validation boundary

The user reported successful application of migrations 001 through 004.
Frontend type checking and production build passed. Mocked browser checks cover
owner creation/cancellation, list errors/retry, recipient errors and acceptance,
refresh persistence, admin settings visibility, and mobile overflow. These tests
mock Supabase and do not prove the remote SQL permissions or real account flow.
Live testing with two accounts remains necessary. Lint reports two existing
state-in-effect warnings in App.tsx and useClubs.ts, with no errors.
