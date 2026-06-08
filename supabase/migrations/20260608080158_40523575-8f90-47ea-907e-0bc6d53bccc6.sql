
-- 1. Fix tender-imports storage policy to use has_role()
DROP POLICY IF EXISTS "tender_imports_admin_only" ON storage.objects;
CREATE POLICY "tender_imports_admin_only" ON storage.objects FOR ALL
  USING (bucket_id = 'tender-imports' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'tender-imports' AND public.has_role(auth.uid(), 'admin'));

-- 2. Restrict opportunity contact columns from anon (still accessible via get_opportunity_contacts RPC)
REVOKE SELECT (contact_email, contact_phone) ON public.opportunities FROM anon;

-- 3. Update notify_opportunity_published to send x-internal-secret header so the
--    edge function can authenticate the DB trigger call.
CREATE OR REPLACE FUNCTION public.notify_opportunity_published()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _url text := 'https://nrrgqnruoylwztddkntm.supabase.co/functions/v1/notify-new-opportunity';
  _secret text;
  _became_published boolean;
BEGIN
  _became_published := (NEW.status = 'published')
    AND (TG_OP = 'INSERT' OR COALESCE(OLD.status, '') <> 'published');
  IF _became_published THEN
    BEGIN
      _secret := current_setting('app.service_role_key', true);
    EXCEPTION WHEN OTHERS THEN
      _secret := NULL;
    END;
    PERFORM extensions.http_post(
      url := _url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', COALESCE(_secret, '')
      ),
      body := jsonb_build_object('opportunityId', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$function$;
