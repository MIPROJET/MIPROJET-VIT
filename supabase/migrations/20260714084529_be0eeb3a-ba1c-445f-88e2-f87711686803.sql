
-- 1) Move unaccent extension out of public to fix function_search_path_mutable
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='unaccent') THEN
    EXECUTE 'ALTER EXTENSION unaccent SET SCHEMA extensions';
  END IF;
END $$;

-- 2) Restrict admin_notes columns from end users
REVOKE SELECT (admin_notes), INSERT (admin_notes), UPDATE (admin_notes) ON public.access_requests FROM authenticated, anon;
REVOKE SELECT (admin_notes), INSERT (admin_notes), UPDATE (admin_notes) ON public.service_requests FROM authenticated, anon;
REVOKE SELECT (admin_notes), INSERT (admin_notes), UPDATE (admin_notes) ON public.connection_requests FROM authenticated, anon;

-- Admin RPCs to read/write admin_notes with role check
CREATE OR REPLACE FUNCTION public.admin_list_access_requests()
RETURNS SETOF public.access_requests
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.access_requests ORDER BY created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_update_access_request(_id uuid, _status text, _notes text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.access_requests
     SET status = _status,
         admin_notes = _notes,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   WHERE id = _id;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_list_access_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_access_request(uuid,text,text) TO authenticated;

-- 3) Clamp min_role on mp_documents insert so members can't broaden access
DROP POLICY IF EXISTS docs_member_write ON public.mp_documents;
CREATE POLICY docs_member_write ON public.mp_documents
FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  AND (
    org_id IS NULL
    OR (
      org_role_at_least(org_id, 'member'::org_role)
      AND role_rank(min_role) >= role_rank(current_org_role(org_id))
    )
  )
);
