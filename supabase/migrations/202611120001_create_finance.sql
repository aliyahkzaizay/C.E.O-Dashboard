-- Finance foundation: apply once, after organizations, organization_users and events.
-- Requires officers to be able to SELECT their own organization_users row.
-- USD-only MVP. Amounts are integer cents. This does not wire up the application.
-- Storage API workflow: insert report metadata, upload to object_path, retry failed
-- uploads at the same path. Delete files through Storage API BEFORE deleok ting metadata.
-- Database transactions cannot atomically commit an object-storage upload/delete.
BEGIN;

CREATE TABLE public.finance_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(organization_id),
  currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  opening_balance_cents bigint NOT NULL CHECK (opening_balance_cents BETWEEN -999999999 AND 999999999),
  tracking_start_date date NOT NULL,
  budget_cents bigint CHECK (budget_cents BETWEEN 1 AND 999999999),
  budget_start_date date,
  budget_end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((budget_cents IS NULL AND budget_start_date IS NULL AND budget_end_date IS NULL)
    OR (budget_cents IS NOT NULL AND budget_start_date IS NOT NULL AND budget_end_date IS NOT NULL
        AND budget_end_date >= budget_start_date))
);

CREATE TABLE public.finance_transactions (
  transaction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.finance_settings(organization_id),
  kind text NOT NULL CHECK (kind IN ('income', 'expense')),
  amount_cents bigint NOT NULL CHECK (amount_cents BETWEEN 1 AND 999999999),
  transaction_date date NOT NULL,
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 200),
  category text NOT NULL CHECK (char_length(btrim(category)) BETWEEN 1 AND 50),
  event_id uuid,
  related_kind text CHECK (related_kind IN ('meeting', 'other')),
  related_label text CHECK (char_length(btrim(related_label)) BETWEEN 1 AND 200),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  voided_by uuid REFERENCES auth.users(id),
  void_reason text CHECK (char_length(btrim(void_reason)) BETWEEN 1 AND 1000),
  FOREIGN KEY (organization_id, event_id) REFERENCES public.events(organization_id, event_id),
  CHECK ((related_kind IS NULL AND related_label IS NULL)
    OR (event_id IS NULL AND related_kind IS NOT NULL AND related_label IS NOT NULL)),
  CHECK ((voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL)
    OR (voided_at IS NOT NULL AND voided_by IS NOT NULL AND void_reason IS NOT NULL))
);

CREATE TABLE public.purchase_reports (
  report_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(organization_id),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  event_id uuid,
  notes text CHECK (char_length(notes) <= 1000),
  filename text NOT NULL CHECK (char_length(btrim(filename)) BETWEEN 1 AND 255),
  content_type text NOT NULL CHECK (content_type IN ('application/pdf','image/jpeg','image/png')),
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes BETWEEN 1 AND 10485760),
  -- Generated path prevents cross-club paths and filename collisions.
  object_path text GENERATED ALWAYS AS (organization_id::text || '/' || report_id::text || '/file') STORED UNIQUE,
  uploaded_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, event_id) REFERENCES public.events(organization_id, event_id)
);

-- Only void fields can be updated on transactions; corrections are void + replacement.
CREATE FUNCTION public.prepare_finance_record() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    IF TG_TABLE_NAME = 'finance_settings' THEN
      NEW.updated_at := NEW.created_at;
    ELSIF TG_TABLE_NAME = 'finance_transactions' THEN
      NEW.created_by := auth.uid();
    ELSE
      NEW.uploaded_by := auth.uid();
    END IF;
  ELSIF TG_TABLE_NAME = 'finance_settings' THEN
    NEW.created_at := OLD.created_at;
    NEW.updated_at := clock_timestamp();
  ELSE
    IF OLD.voided_at IS NOT NULL THEN
      RAISE EXCEPTION 'A voided transaction cannot be changed.';
    END IF;
    IF NEW.void_reason IS NULL OR btrim(NEW.void_reason) = '' THEN
      RAISE EXCEPTION 'Provide a reason to void the transaction.';
    END IF;
    NEW.void_reason := btrim(NEW.void_reason);
    NEW.voided_at := clock_timestamp();
    NEW.voided_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_finance_record() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER prepare_finance_settings BEFORE INSERT OR UPDATE ON public.finance_settings
FOR EACH ROW EXECUTE FUNCTION public.prepare_finance_record();
CREATE TRIGGER prepare_finance_transaction BEFORE INSERT OR UPDATE ON public.finance_transactions
FOR EACH ROW EXECUTE FUNCTION public.prepare_finance_record();
CREATE TRIGGER prepare_purchase_report BEFORE INSERT ON public.purchase_reports
FOR EACH ROW EXECUTE FUNCTION public.prepare_finance_record();

CREATE INDEX finance_transactions_club_date ON public.finance_transactions(organization_id, transaction_date DESC, transaction_id);
CREATE INDEX finance_transactions_event ON public.finance_transactions(organization_id,event_id);
CREATE INDEX purchase_reports_club_date ON public.purchase_reports(organization_id,created_at DESC,report_id);
CREATE INDEX purchase_reports_event ON public.purchase_reports(organization_id,event_id);

ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_settings, public.finance_transactions, public.purchase_reports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.finance_settings, public.finance_transactions, public.purchase_reports TO authenticated;
GRANT INSERT (organization_id,opening_balance_cents,tracking_start_date,budget_cents,budget_start_date,budget_end_date)
 ON public.finance_settings TO authenticated;
GRANT UPDATE (opening_balance_cents,tracking_start_date,budget_cents,budget_start_date,budget_end_date)
 ON public.finance_settings TO authenticated;
GRANT INSERT (organization_id,kind,amount_cents,transaction_date,description,category,event_id,related_kind,related_label)
 ON public.finance_transactions TO authenticated;
GRANT UPDATE (void_reason) ON public.finance_transactions TO authenticated;
GRANT INSERT (organization_id,title,event_id,notes,filename,content_type,file_size_bytes)
 ON public.purchase_reports TO authenticated;
GRANT DELETE ON public.purchase_reports TO authenticated;

CREATE POLICY finance_settings_read ON public.finance_settings FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = finance_settings.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner','admin')));
CREATE POLICY finance_settings_insert ON public.finance_settings FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = finance_settings.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner','admin') AND (officer.access_role = 'owner' OR officer.can_edit_finances IS TRUE)));
CREATE POLICY finance_settings_update ON public.finance_settings FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = finance_settings.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner','admin') AND (officer.access_role = 'owner' OR officer.can_edit_finances IS TRUE)))
WITH CHECK (EXISTS (SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = finance_settings.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner','admin') AND (officer.access_role = 'owner' OR officer.can_edit_finances IS TRUE)));

CREATE POLICY finance_transactions_read ON public.finance_transactions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = finance_transactions.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner','admin')));
CREATE POLICY finance_transactions_insert ON public.finance_transactions FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = finance_transactions.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner','admin') AND (officer.access_role = 'owner' OR officer.can_edit_finances IS TRUE)));
CREATE POLICY finance_transactions_update ON public.finance_transactions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = finance_transactions.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner','admin') AND (officer.access_role = 'owner' OR officer.can_edit_finances IS TRUE)))
WITH CHECK (EXISTS (SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = finance_transactions.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner','admin') AND (officer.access_role = 'owner' OR officer.can_edit_finances IS TRUE)));

CREATE POLICY purchase_reports_read ON public.purchase_reports FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = purchase_reports.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner','admin')));
CREATE POLICY purchase_reports_insert ON public.purchase_reports FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = purchase_reports.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner','admin')));
CREATE POLICY purchase_reports_delete_owner ON public.purchase_reports FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_users AS officer
    WHERE officer.organization_id = purchase_reports.organization_id
      AND officer.user_id = (SELECT auth.uid())
      AND officer.access_role IN ('owner','admin') AND officer.access_role = 'owner'));

-- Fail on an existing bucket instead of silently reconfiguring unrelated files.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('purchase-reports','purchase-reports',false,10485760,
        ARRAY['application/pdf','image/jpeg','image/png']);

-- Metadata RLS scopes reads to the club; uploads require the original uploader.
CREATE POLICY purchase_report_files_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'purchase-reports' AND EXISTS (
  SELECT 1 FROM public.purchase_reports AS report WHERE report.object_path = storage.objects.name
));
CREATE POLICY purchase_report_files_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'purchase-reports' AND EXISTS (
  SELECT 1 FROM public.purchase_reports AS report
  WHERE report.object_path = storage.objects.name AND report.uploaded_by = (SELECT auth.uid())
));
CREATE POLICY purchase_report_files_delete_owner ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'purchase-reports' AND EXISTS (
  SELECT 1 FROM public.purchase_reports AS report
  JOIN public.organization_users AS officer ON officer.organization_id = report.organization_id
  WHERE report.object_path = storage.objects.name
    AND officer.user_id = (SELECT auth.uid()) AND officer.access_role = 'owner'
));
-- No UPDATE policy: uploads cannot overwrite an existing report file.
-- No anonymous access. Treasurer permissions await a trusted officer-position model.
-- Existing broad storage policies must be audited: permissive policies combine with OR.
-- Always use the caller's JWT for RLS; a service-role key bypasses these policies.
COMMIT;
