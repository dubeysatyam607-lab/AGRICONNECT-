-- Follow-up: is_admin() must also accept the service role (auth.uid() is NULL
-- for service_role requests, which previously blocked admin_get_dashboard_kpis).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'
  );
$$;
