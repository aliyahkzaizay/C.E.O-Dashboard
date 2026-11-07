-- Event storage foundation. Apply once in the Supabase SQL Editor.
-- Requires public.organizations, public.organization_users, and the policy
-- allowing authenticated officers to read their own organization access records.
-- The backend must supply a securely generated check_in_token (secrets.token_urlsafe(32)).
-- This migration does not connect the API or implement public check-in/attendance.
BEGIN;

CREATE TABLE public.events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (organization_id),
  event_name text NOT NULL
    CHECK (char_length(btrim(event_name)) BETWEEN 1 AND 200),
  starts_at timestamptz NOT NULL,
  event_type text CHECK (char_length(event_type) <= 50),
  description text CHECK (char_length(description) <= 2000),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled')),
  check_in_token text NOT NULL UNIQUE CHECK (btrim(check_in_token) <> ''),
  check_in_open boolean NOT NULL DEFAULT false,
  attendance_finalized_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Future attendance foreign keys can enforce that the event belongs to the same club.
  CONSTRAINT events_organization_event_key UNIQUE (organization_id, event_id),
  CONSTRAINT events_check_in_available CHECK (
    NOT check_in_open OR (
      status = 'scheduled'
      AND archived_at IS NULL
      AND attendance_finalized_at IS NULL
    )
  )
);

-- Normalize text, maintain timestamps, and keep event identity/link stable.
CREATE FUNCTION public.prepare_event_record()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.event_name := btrim(NEW.event_name);
  NEW.event_type := nullif(btrim(NEW.event_type), '');
  NEW.description := nullif(btrim(NEW.description), '');

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.updated_at := NEW.created_at;
  ELSE
    IF NEW.event_id IS DISTINCT FROM OLD.event_id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.check_in_token IS DISTINCT FROM OLD.check_in_token THEN
      RAISE EXCEPTION 'Event ID, organization ID, and check-in token cannot be changed.';
    END IF;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_event_record() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER prepare_event_record
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.prepare_event_record();

CREATE INDEX events_organization_date_idx
  ON public.events (organization_id, starts_at DESC, event_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Officers can read/create/edit their club's events. No permanent deletion.
-- Public check-in must use a dedicated endpoint, not anonymous table access.
REVOKE ALL ON TABLE public.events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.events TO authenticated;
GRANT INSERT (organization_id, event_name, starts_at, event_type, description, check_in_token)
  ON public.events TO authenticated;
GRANT UPDATE (event_name, starts_at, event_type, description, status,
              check_in_open, attendance_finalized_at, archived_at)
  ON public.events TO authenticated;

CREATE POLICY events_select_officers ON public.events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = events.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner', 'admin')
  )
);

CREATE POLICY events_insert_officers ON public.events
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = events.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner', 'admin')
  )
);

CREATE POLICY events_update_officers ON public.events
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = events.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = events.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner', 'admin')
  )
);

COMMIT;
