-- Restrict public exposure of contact fields (column-level privileges)

REVOKE SELECT ON public.entities FROM anon;
GRANT SELECT (id, slug, name, legal_form, entity_type, tagline, description, logo_url,
  cover_url, cover_url_mobile, website_url, country, city, sector, founded_year, team_size,
  socials, gallery_urls, is_public, mp_score, recommendation_level, created_at, updated_at)
ON public.entities TO anon;

REVOKE SELECT ON public.mp_project_team FROM anon;
REVOKE SELECT ON public.mp_project_team FROM authenticated;
GRANT SELECT (id, project_id, user_id, full_name, role_title, expertise, bio, photo_url,
  is_external, organization, sort_order, created_at, updated_at)
ON public.mp_project_team TO anon;
GRANT SELECT (id, project_id, user_id, full_name, role_title, expertise, bio, photo_url,
  is_external, organization, sort_order, created_at, updated_at)
ON public.mp_project_team TO authenticated;
GRANT ALL ON public.mp_project_team TO service_role;
GRANT ALL ON public.entities TO service_role;

CREATE OR REPLACE FUNCTION public.get_project_team_contacts(_project_id uuid)
RETURNS TABLE(id uuid, full_name text, contact_email text, contact_phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.full_name, t.contact_email, t.contact_phone
  FROM public.mp_project_team t
  WHERE t.project_id = _project_id
    AND (
      public.is_any_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.mp_projects p
        WHERE p.id = t.project_id AND p.user_id = auth.uid()
      )
    )
$$;

REVOKE ALL ON FUNCTION public.get_project_team_contacts(uuid) FROM public;
REVOKE ALL ON FUNCTION public.get_project_team_contacts(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_project_team_contacts(uuid) TO authenticated, service_role;