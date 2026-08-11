-- Admin KPI Dashboard — production fixes.
-- 1. Single is_admin() helper (case-insensitive) used by all admin RLS policies.
-- 2. handle_new_user now copies `role` from user_metadata (lowercased).
-- 3. Admin read-all RLS policies so the dashboard can query real production tables.
-- 4. admin_get_dashboard_kpis() RPC — one round-trip, all KPIs + daily series + audit.
-- 5. Indexes for the KPI query paths.

-- ── 1. is_admin() helper ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND lower(coalesce(p.role, '')) = 'admin'
  );
$$;

-- ── 2. Copy role from user_metadata on signup ───────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    lower(coalesce(new.raw_user_meta_data ->> 'role', 'farmer'))
  );
  RETURN new;
END;
$$;

-- ── 3. Admin read-all RLS policies ──────────────────────────────────────────

-- profiles: admins may read every profile (needed for Total Farmers / Users).
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- tractor_bookings / tractor_reviews: admins may read every row.
DROP POLICY IF EXISTS "Admin view all tractor bookings" ON public.tractor_bookings;
CREATE POLICY "Admin view all tractor bookings"
  ON public.tractor_bookings FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin view all tractor reviews" ON public.tractor_reviews;
CREATE POLICY "Admin view all tractor reviews"
  ON public.tractor_reviews FOR SELECT
  USING (public.is_admin());

-- audit_logs: admins may read the full audit trail.
DROP POLICY IF EXISTS "Admins view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- push_subscriptions / price_alerts / cattle_listings: admins may read all.
DROP POLICY IF EXISTS "Admin view all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admin view all push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin view all price alerts" ON public.price_alerts;
CREATE POLICY "Admin view all price alerts"
  ON public.price_alerts FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin view all cattle listings" ON public.cattle_listings;
CREATE POLICY "Admin view all cattle listings"
  ON public.cattle_listings FOR SELECT
  USING (public.is_admin());

-- Fix role mismatch in the existing request-inbox policies (were checking
-- p.role = 'Admin' with a capital A while the app stores lowercase roles).
DROP POLICY IF EXISTS "contact_messages_admin_select" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_select" ON public.contact_messages FOR SELECT
  USING (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "transport_bookings_admin_select" ON public.transport_bookings;
CREATE POLICY "transport_bookings_admin_select" ON public.transport_bookings FOR SELECT
  USING (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "labor_requests_admin_select" ON public.labor_requests;
CREATE POLICY "labor_requests_admin_select" ON public.labor_requests FOR SELECT
  USING (auth.role() = 'service_role' OR public.is_admin());

-- Fix role mismatch in the catalogue admin-all policies.
DROP POLICY IF EXISTS "laborers_admin_all" ON public.laborers;
CREATE POLICY "laborers_admin_all" ON public.laborers FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "transport_vehicles_admin_all" ON public.transport_vehicles;
CREATE POLICY "transport_vehicles_admin_all" ON public.transport_vehicles FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "livestock_admin_all" ON public.livestock;
CREATE POLICY "livestock_admin_all" ON public.livestock FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

DROP POLICY IF EXISTS "storage_facilities_admin_all" ON public.storage_facilities;
CREATE POLICY "storage_facilities_admin_all" ON public.storage_facilities FOR ALL
  USING (auth.role() = 'service_role' OR public.is_admin())
  WITH CHECK (auth.role() = 'service_role' OR public.is_admin());

-- ── 4. KPI RPC (one round-trip, security definer, admin-only) ───────────────
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  WITH day_series AS (
    SELECT d::date AS day
    FROM generate_series(current_date - 13, current_date, '1 day'::interval) d
  ),
  new_users AS (
    SELECT created_at::date AS day, count(*) AS n
    FROM public.profiles
    WHERE created_at >= current_date - 13
    GROUP BY 1
  ),
  bookings AS (
    SELECT created_at::date AS day, count(*) AS n
    FROM public.tractor_bookings
    WHERE created_at >= current_date - 13
    GROUP BY 1
  ),
  listings AS (
    SELECT created_at::date AS day, count(*) AS n
    FROM public.cattle_listings
    WHERE created_at >= current_date - 13
    GROUP BY 1
  ),
  requests AS (
    SELECT created_at::date AS day, count(*) AS n
    FROM (
      SELECT created_at FROM public.contact_messages
      UNION ALL SELECT created_at FROM public.transport_bookings
      UNION ALL SELECT created_at FROM public.labor_requests
    ) r
    WHERE created_at >= current_date - 13
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'generated_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'kpis', jsonb_build_object(
      'totalFarmers', (SELECT count(*) FROM public.profiles WHERE lower(coalesce(role, '')) = 'farmer'),
      'totalUsers', (SELECT count(*) FROM public.profiles),
      'newToday', (SELECT count(*) FROM public.profiles WHERE created_at::date = current_date),
      'new30d', (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '30 days'),
      'tractorBookings', (SELECT count(*) FROM public.tractor_bookings),
      'bookingsToday', (SELECT count(*) FROM public.tractor_bookings WHERE created_at::date = current_date),
      'cattleListings', (SELECT count(*) FROM public.cattle_listings),
      'activeCattleListings', (SELECT count(*) FROM public.cattle_listings WHERE is_active),
      'pushSubscribers', (SELECT count(*) FROM public.push_subscriptions),
      'priceAlerts', (SELECT count(*) FROM public.price_alerts),
      'contactMessages', (SELECT count(*) FROM public.contact_messages),
      'transportBookings', (SELECT count(*) FROM public.transport_bookings),
      'laborRequests', (SELECT count(*) FROM public.labor_requests),
      'laborers', (SELECT count(*) FROM public.laborers),
      'vehicles', (SELECT count(*) FROM public.transport_vehicles),
      'livestock', (SELECT count(*) FROM public.livestock),
      'storageFacilities', (SELECT count(*) FROM public.storage_facilities),
      'auditLogs', (SELECT count(*) FROM public.audit_logs)
    ),
    'daily', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'date', to_char(ds.day, 'YYYY-MM-DD'),
        'newUsers', coalesce(nu.n, 0),
        'totalUsers', (SELECT count(*) FROM public.profiles WHERE created_at::date <= ds.day),
        'tractorBookings', coalesce(b.n, 0),
        'cattleListings', coalesce(l.n, 0),
        'requests', coalesce(r.n, 0)
      ) ORDER BY ds.day)
      FROM day_series ds
      LEFT JOIN new_users nu ON nu.day = ds.day
      LEFT JOIN bookings b ON b.day = ds.day
      LEFT JOIN listings l ON l.day = ds.day
      LEFT JOIN requests r ON r.day = ds.day
    ), '[]'::jsonb),
    'recentAudit', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id,
        'actor', coalesce(p.full_name, left(a.user_id::text, 8)),
        'action', a.action,
        'entity', a.table_name,
        'summary', a.action || ' on ' || a.table_name,
        'timestamp', a.created_at
      ) ORDER BY a.created_at DESC)
      FROM (SELECT * FROM public.audit_logs ORDER BY created_at DESC LIMIT 8) a
      LEFT JOIN public.profiles p ON p.id = a.user_id
    ), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_dashboard_kpis() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_dashboard_kpis() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_kpis() TO service_role;

-- ── 5. Indexes for the KPI query paths ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at);
CREATE INDEX IF NOT EXISTS idx_tractor_bookings_created_at ON public.tractor_bookings (created_at);
CREATE INDEX IF NOT EXISTS idx_cattle_listings_created_at ON public.cattle_listings (created_at);
