
-- 1. Recreate tenders_public view with security_invoker
DROP VIEW IF EXISTS public.tenders_public;
CREATE VIEW public.tenders_public
WITH (security_invoker = true) AS
SELECT id,
    notice_title AS title,
    notice_title AS title_fr,
    notice_title AS title_en,
    slug,
    notice_deadline AS deadline,
    notice_deadline,
    country_code AS country,
    country_code,
    country_name,
    sector,
    summary,
    summary AS summary_fr,
    summary AS summary_en,
    status,
    views_count AS views,
    views_count,
    view_count,
    created_at,
    updated_at
FROM public.tenders
WHERE status = 'active';

GRANT SELECT ON public.tenders_public TO anon, authenticated;

-- 2. Fix tender_interests admin policy (was reading user_metadata)
DROP POLICY IF EXISTS interests_admin_all ON public.tender_interests;
CREATE POLICY interests_admin_all ON public.tender_interests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Tighten public INSERT on tender_interests (avoid WITH CHECK true)
DROP POLICY IF EXISTS interests_insert_public ON public.tender_interests;
CREATE POLICY interests_insert_public ON public.tender_interests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    tender_id IS NOT NULL
    AND char_length(nom) BETWEEN 1 AND 200
    AND char_length(email) BETWEEN 3 AND 255
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- 4. Add policies for tables with RLS enabled but no policies (admin-only)
CREATE POLICY tender_import_batches_admin_all ON public.tender_import_batches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY tender_subscribers_admin_all ON public.tender_subscribers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Set search_path on functions missing it
ALTER FUNCTION public.archive_expired_tenders() SET search_path = public;
ALTER FUNCTION public.increment_tender_views(uuid) SET search_path = public;

-- 6. Revoke EXECUTE on SECURITY DEFINER functions that shouldn't be callable by clients
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_referrer_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lock_investor_user_type() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lock_user_type_permanent() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_opportunity_published() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_lifetime_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_email_provider_usage(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pick_email_provider() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_email_unsubscribed(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_any_admin(uuid) FROM PUBLIC, anon, authenticated;

-- Keep client-callable definer functions explicit
GRANT EXECUTE ON FUNCTION public.increment_tender_views(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_opportunity_contacts(uuid) TO authenticated;

-- 7. Restrict listing on the public 'news-media' bucket (public can still read individual files via URL)
DROP POLICY IF EXISTS "Authenticated can list news-media" ON storage.objects;
CREATE POLICY "Admins can list news-media" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'news-media'
    AND public.has_role(auth.uid(), 'admin')
  );
