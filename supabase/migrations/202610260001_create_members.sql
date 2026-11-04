-- Member roster foundation. Apply once to the existing Supabase development schema.
-- Requires public.organizations and public.organization_users, plus the existing
-- policy allowing authenticated officers to SELECT their own access records.
-- This does not create login accounts or implement check-in/attendance.
BEGIN;

CREATE TABLE public.members (
  member_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (organization_id),
  name text NOT NULL CHECK (btrim(name) <> ''),
  email text,
  external_member_id text,
  date_joined date,
  class_year text CHECK (class_year IN (
    'first_year', 'sophomore', 'junior', 'senior', 'graduate', 'other'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  -- NULL identifiers are allowed; supplied values cannot be shared in one club.
  -- Archived members still reserve their identifiers: restore instead of duplicating.
  CONSTRAINT members_organization_email_key UNIQUE (organization_id, email),
  CONSTRAINT members_organization_external_id_key
    UNIQUE (organization_id, external_member_id),
  -- Supports future attendance foreign keys that also enforce the same club.
  CONSTRAINT members_organization_member_key UNIQUE (organization_id, member_id)
);

-- Prepare manual and imported records identically, without changing ID case/zeros.
CREATE FUNCTION public.prepare_member_record()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.name := btrim(NEW.name);
  NEW.email := nullif(lower(btrim(NEW.email)), '');
  NEW.external_member_id := nullif(btrim(NEW.external_member_id), '');
  NEW.class_year := nullif(btrim(NEW.class_year), '');

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.updated_at := NEW.created_at;
  ELSE
    -- An edit cannot move a member between clubs or replace their identity.
    IF NEW.member_id IS DISTINCT FROM OLD.member_id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'Member and organization IDs cannot be changed.';
    END IF;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_member_record() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER prepare_member_record
BEFORE INSERT OR UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.prepare_member_record();

CREATE INDEX members_current_roster_idx
  ON public.members (organization_id, name, member_id)
  WHERE archived_at IS NULL;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Table privileges say which actions are possible; policies below limit the rows.
-- No DELETE privilege: use archived_at to archive/restore and preserve history.
REVOKE ALL ON TABLE public.members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.members TO authenticated;
GRANT INSERT (organization_id, name, email, external_member_id, date_joined, class_year)
  ON public.members TO authenticated;
GRANT UPDATE (name, email, external_member_id, date_joined, class_year, archived_at)
  ON public.members TO authenticated;

CREATE POLICY members_select_officers ON public.members
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = members.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner', 'admin')
  )
);

CREATE POLICY members_insert_officers ON public.members
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = members.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner', 'admin')
  )
);

CREATE POLICY members_update_officers ON public.members
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = members.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = members.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner', 'admin')
  )
);

-- Remaining API work: validate supplied email syntax, show missing-identifier
-- notices, and hide archived members by default. RLS permits archive/history views.
-- Missing date_joined remains NULL; it is never replaced with the import date.
COMMIT;
