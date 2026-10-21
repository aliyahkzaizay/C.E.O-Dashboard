# Database changes

The development PostgreSQL database remains hosted on Supabase. `migrations/` will contain reviewed, timestamped SQL files for tables, constraints, indexes, and access policies.

The original organization tables were created manually in Supabase. The invitation table migration is now saved in `migrations/`; its remote application must be confirmed separately. This is not yet a complete baseline for recreating the database. Inspect the existing remote schema and agree on a baseline before adding SQL. Never modify an applied shared migration; add a new one. Use synthetic test records. Coordinate remote changes with the team.

The Python backend serves application requests; migrations define database structure. Supabase Auth remains the planned officer identity provider. Public check-in must not grant anonymous roster access.


## Invitation setup (in progress)

`migrations/202610140001_create_organization_invitations.sql` creates the table only.
Review and run it once in the Supabase SQL Editor against the existing development
schema. It does not send emails, create invitations, or grant club access.

Direct access for `anon` and `authenticated` is revoked, and RLS is enabled.
The next migration must provide owner-checked creation/revocation and acceptance
that verifies the recipient email, expiration, and single use. Acceptance must
create admin access with finance editing disabled without downgrading an existing
owner/admin. These rules are not implemented by the table alone.

Invite links will contain a random secret; the table stores only its SHA-256 hash.
The default expiration is seven days. Do not manually fill these records from the
frontend or grant it direct insert/update access.


The user reported successful application of the invitation-table migration.
`202610140002_create_organization_invitation.sql` adds owner-only creation and
returns `invitation_id`, `invitation_token`, and `expires_at`. It has not been
applied automatically or tested against the remote database. The caller supplies
only the club ID and email; identity and ownership are checked inside the function.
Do not log returned tokens. Creating an invitation does not send email or grant
access. Recipient acceptance and owner revocation are still pending.


The user reported successful application of the invitation creation function.
`202610140003_accept_organization_invitation.sql` adds acceptance: verified account
email matching, expiration/revocation checks, a row lock for single use, and a
current-owner check on the inviter. It returns the organization UUID. New access
is admin with finance editing off; pre-existing permissions are preserved.
This migration has not been applied automatically or live-tested. Owner
revocation and the invitation UI remain to be built.

Before considering invitations complete, test with separate owner and invitee
accounts: valid acceptance, wrong email, unverified email, expired/revoked/used
links, a non-owner attempting creation, an inviter who lost ownership, existing
member permissions, and simultaneous acceptance. Confirm failures do not grant
access or consume a valid invitation. Use synthetic accounts and keep tokens out
of logs and screenshots.


The user reported successful application of the acceptance migration.
`202610140004_manage_organization_invitations.sql` adds owner-only listing (latest
100, without token hashes) and cancellation. Cancellation and acceptance lock the
same invitation row, so only one can win; cancellation never removes existing
officer access. This migration has not been applied automatically or live-tested.
Next: connect Club settings, link creation, and recipient acceptance in the UI.


The user reported successful application of migration 004. Owner settings and
recipient acceptance are now connected in the frontend. See
[Officer invitations](../docs/invitations.md) for usage and the live test checklist.
Database permissions and two-account behavior have not been independently tested
against the shared Supabase project; frontend browser validation used mocks.
