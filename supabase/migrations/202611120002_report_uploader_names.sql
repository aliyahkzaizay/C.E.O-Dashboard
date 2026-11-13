-- Store a display-only name snapshot. IDs and existing RLS still control access.
BEGIN;
ALTER TABLE public.purchase_reports ADD COLUMN uploaded_by_name text;

-- Reduce a full name to first name plus final surname initial. No email fallback.
CREATE FUNCTION public.short_report_uploader_name(full_name text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN parts[1] = '' THEN NULL
    WHEN cardinality(parts) = 1 THEN left(parts[1], 200)
    ELSE left(parts[1], 200) || ' ' || upper(left(parts[cardinality(parts)], 1)) END
  FROM (SELECT regexp_split_to_array(btrim(coalesce(full_name, '')), '\s+') AS parts) names;
$$;
REVOKE ALL ON FUNCTION public.short_report_uploader_name(text) FROM PUBLIC, anon, authenticated;

-- Read only the signed-in uploader's display name; never trust a submitted name.
CREATE FUNCTION public.stamp_report_uploader_name() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  SELECT public.short_report_uploader_name(u.raw_user_meta_data->>'full_name')
    INTO NEW.uploaded_by_name FROM auth.users u WHERE u.id = auth.uid();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.stamp_report_uploader_name() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER stamp_report_uploader_name BEFORE INSERT ON public.purchase_reports
FOR EACH ROW EXECUTE FUNCTION public.stamp_report_uploader_name();

-- Existing reports get the uploader's current shortened name where available.
UPDATE public.purchase_reports r
SET uploaded_by_name = public.short_report_uploader_name(u.raw_user_meta_data->>'full_name')
FROM auth.users u WHERE u.id = r.uploaded_by;
COMMIT;
