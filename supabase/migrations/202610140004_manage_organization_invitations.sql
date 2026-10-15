-- Owner-only invitation listing and cancellation.
-- Requires the invitation table. This migration does not cancel any invitation.
BEGIN;

CREATE FUNCTION public.list_organization_invitations(p_organization_id uuid)
RETURNS TABLE (
  invitation_id uuid,
  invited_email text,
  created_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must sign in first.';
  END IF;

  PERFORM 1 FROM public.organization_users AS officer
  WHERE officer.organization_id = p_organization_id
    AND officer.user_id = v_user_id
    AND officer.access_role = 'owner'
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only the club owner can view invitations.';
  END IF;

  -- Never return the secret or its hash. Show the most recent 100 invitations.
  RETURN QUERY
  SELECT invitation.invitation_id, invitation.invited_email,
         invitation.created_at, invitation.expires_at,
         invitation.accepted_at, invitation.revoked_at
  FROM public.organization_invitations AS invitation
  WHERE invitation.organization_id = p_organization_id
  ORDER BY invitation.created_at DESC, invitation.invitation_id DESC
  LIMIT 100;
END;
$$;

CREATE FUNCTION public.revoke_organization_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_invitation public.organization_invitations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must sign in first.';
  END IF;

  -- Use the same lock order as acceptance so cancellation cannot race with it.
  SELECT invitation.* INTO v_invitation
  FROM public.organization_invitations AS invitation
  WHERE invitation.invitation_id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation unavailable or you do not have permission.';
  END IF;

  PERFORM 1 FROM public.organization_users AS officer
  WHERE officer.organization_id = v_invitation.organization_id
    AND officer.user_id = v_user_id
    AND officer.access_role = 'owner'
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation unavailable or you do not have permission.';
  END IF;

  IF v_invitation.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'This invitation was already accepted. Cancelling it cannot remove officer access.';
  END IF;

  -- Repeated cancellation is harmless and preserves the original timestamp.
  UPDATE public.organization_invitations
  SET revoked_at = coalesce(revoked_at, clock_timestamp())
  WHERE invitation_id = p_invitation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.list_organization_invitations(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_organization_invitation(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_organization_invitations(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_organization_invitation(uuid)
  TO authenticated;

COMMIT;
