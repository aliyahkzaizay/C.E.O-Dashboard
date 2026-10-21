-- Requires the existing public.organizations and Supabase auth.users tables.
-- Table foundation only: invitation functions and their grants come next.
-- This file has not been applied automatically to the shared database.
BEGIN;

CREATE TABLE public.organization_invitations (
  invitation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL
    REFERENCES public.organizations (organization_id),

  -- Store a normalized email; acceptance must match a verified account email.
  invited_email text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users (id),

  -- Store only the SHA-256 hash of the secret from the invitation link.
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),

  -- Both remain empty until acceptance; revoked invitations cannot be accepted.
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users (id),
  revoked_at timestamptz,

  CONSTRAINT invitation_email_normalized CHECK (
    invited_email = lower(btrim(invited_email))
    AND char_length(invited_email) BETWEEN 3 AND 254
  ),
  CONSTRAINT invitation_token_hash_format CHECK (
    token_hash ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT invitation_expiration_valid CHECK (expires_at > created_at),
  CONSTRAINT invitation_acceptance_complete CHECK (
    (accepted_at IS NULL AND accepted_by IS NULL)
    OR (accepted_at IS NOT NULL AND accepted_by IS NOT NULL)
  ),
  CONSTRAINT invitation_not_accepted_and_revoked CHECK (
    accepted_at IS NULL OR revoked_at IS NULL
  )
);

CREATE INDEX organization_invitations_club_email_idx
  ON public.organization_invitations (organization_id, invited_email);

-- App users cannot directly read, create, or modify invitation records.
-- Later functions will validate the caller before accessing this table.
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.organization_invitations
  FROM PUBLIC, anon, authenticated;

COMMIT;
