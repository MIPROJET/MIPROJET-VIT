-- 1) Storage: validate platform-covers against platform_documents
DROP POLICY IF EXISTS "Public can read platform covers" ON storage.objects;
DROP POLICY IF EXISTS "Public can read platform document covers" ON storage.objects;

CREATE POLICY "Public can read active platform document covers"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'platform-covers'
  AND EXISTS (
    SELECT 1 FROM public.platform_documents d
    WHERE d.cover_path = storage.objects.name
      AND COALESCE(d.is_active, false) = true
      AND COALESCE(d.access_level, 'public') = 'public'
  )
);

-- 2) Milestones: hide precise location & participant counts from anonymous visitors
REVOKE SELECT ON public.mp_project_milestones FROM anon;
GRANT SELECT (id, project_id, kind, title, description, event_date, media_url, is_public, sort_order, created_at, updated_at)
ON public.mp_project_milestones TO anon;

-- 3) Investor prospects: anonymous visitors may only submit, never read
REVOKE SELECT ON public.investor_prospects FROM anon;
GRANT INSERT ON public.investor_prospects TO anon;
