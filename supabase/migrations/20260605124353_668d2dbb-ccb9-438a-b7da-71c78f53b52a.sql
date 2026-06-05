DROP POLICY IF EXISTS tenders_admin_all ON public.tenders;

CREATE POLICY tenders_admin_all
ON public.tenders
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenders TO authenticated;
GRANT ALL ON public.tenders TO service_role;