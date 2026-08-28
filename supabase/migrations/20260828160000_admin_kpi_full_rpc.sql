-- ==============================================================================
-- 20260828160000_admin_kpi_full_rpc.sql
-- Single authoritative source for the Admin Console dashboard.
-- Replaces the ad-hoc client-side count-query soup (which silently returned
-- 0 on any RLS failure) with ONE SECURITY DEFINER RPC that returns every KPI
-- card, the 14-day daily series, and the recent audit trail in a single
-- round-trip using database-local dates.
-- ==============================================================================

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
      'new7d', (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '7 days'),
      'new30d', (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '30 days'),
      'aiConversations', (SELECT count(*) FROM public.ai_conversations),
      'cropScans', (SELECT count(*) FROM public.crop_scans),
      'tractorBookings', (SELECT count(*) FROM public.tractor_bookings),
      'bookingsToday', (SELECT count(*) FROM public.tractor_bookings WHERE created_at::date = current_date),
      'cattleListings', (SELECT count(*) FROM public.cattle_listings),
      'activeCattleListings', (SELECT count(*) FROM public.cattle_listings WHERE is_active),
      'equipmentListings', (SELECT count(*) FROM public.tractor_listings),
      'marketplaceProducts', (SELECT count(*) FROM public.store_inventory),
      'pushSubscribers', (SELECT count(*) FROM public.push_subscriptions),
      'priceAlerts', (SELECT count(*) FROM public.price_alerts),
      'contactMessages', (SELECT count(*) FROM public.contact_messages),
      'transportBookings', (SELECT count(*) FROM public.transport_bookings),
      'laborRequests', (SELECT count(*) FROM public.labor_requests),
      'laborers', (SELECT count(*) FROM public.laborers),
      'vehicles', (SELECT count(*) FROM public.transport_vehicles),
      'livestock', (SELECT count(*) FROM public.livestock),
      'storageFacilities', (SELECT count(*) FROM public.storage_facilities),
      'walletCount', (SELECT count(*) FROM public.wallets),
      'auditLogs', (SELECT count(*) FROM public.audit_logs),
      'successfulPayments', (SELECT count(*) FROM public.payment_requests WHERE status = 'approved'),
      'activeSubscriptions', (SELECT count(*) FROM public.user_subscriptions WHERE status = 'active' AND (expires_at IS NULL OR expires_at > now())),
      'expiredSubscriptions', (SELECT count(*) FROM public.user_subscriptions WHERE status = 'expired' OR (status = 'active' AND expires_at IS NOT NULL AND expires_at <= now())),
      'cancelledSubscriptions', (SELECT count(*) FROM public.user_subscriptions WHERE status = 'cancelled'),
      'openSupportTickets', (SELECT count(*) FROM public.support_tickets WHERE status = 'open'),
      'crashReports', (SELECT count(*) FROM public.crash_reports),
      'revenueApproved', (SELECT coalesce(sum(amount), 0) FROM public.payment_requests WHERE status = 'approved')
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
      FROM (SELECT * FROM public.audit_logs ORDER BY created_at DESC LIMIT 10) a
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