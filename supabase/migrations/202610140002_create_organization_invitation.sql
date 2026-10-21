-- Requires 202610140001_create_organization_invitations.sql.
-- Creates an invitation only. Acceptance is implemented separately.
BEGIN;

CREATE FUNCTION public.create_organization_invitation(
  p_organization_id uuid,
  p_email text
)
RETURNS TABLE (
  invitation_id uuid,
  invitation_token text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(btrim(p_email));
  v_token text;
  v_invitation_id uuid;
  v_expires_at timestamptz := now() + interval '7 days';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must sign in first.';
  END IF;

  -- Check ownership on the server, never from a client-provided role.
  -- Hold the access record steady for the duration of this transaction.
  PERFORM 1
  FROM public.organization_users AS officer
  WHERE officer.organization_id = p_organization_id
    AND officer.user_id = v_user_id
    AND officer.access_role = 'owner'
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only the club owner can create invitations.';
  END IF;

  IF v_email IS NULL
     OR char_length(v_email) > 254
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address.';
  END IF;

  -- Two random UUIDs provide an unpredictable invitation secret.
  -- Only its hash is stored; return the secret once for building the link.
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  INSERT INTO public.organization_invitations AS invitation (
    organization_id,
    invited_email,
    invited_by,
    token_hash,
    expires_at
  ) VALUES (
    p_organization_id,
    v_email,
    v_user_id,
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
    v_expires_at
  )
  RETURNING invitation.invitation_id INTO v_invitation_id;

  RETURN QUERY SELECT v_invitation_id, v_token, v_expires_at;
END;
$$;

-- SECURITY DEFINER is needed because direct table writes are blocked.
-- Only authenticated callers may execute it; the body still checks ownership.
REVOKE ALL ON FUNCTION public.create_organization_invitation(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_invitation(uuid, text)
  TO authenticated;

COMMIT;
