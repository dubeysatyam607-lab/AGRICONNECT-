-- ==============================================================================
-- 20260827000000_security_ff_rbac_fixes.sql
-- AgriConnect security hardening
--  1. Fix is_admin()/is_super_admin(): remove 'admin@%' backdoor, restore
--     service_role, pin search_path on SECURITY DEFINER.
--  2. Harden Founding Farmer RPCs: bind auth checks + restrict EXECUTE grants.
--  3. Close broad USING(true) data-leak policies (any auth user read all
--     wallets / payments / subscriptions). Replace with self-or-admin.
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. is_admin() — remove email wildcard backdoor, restore service_role,
--    pin search_path.
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can read admin_roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can read admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Authenticated read subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Authenticated read payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated read wallets" ON public.wallets;
DROP POLICY IF EXISTS "Authenticated read wallet txns" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Authenticated read support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Authenticated read crash reports" ON public.crash_reports;
DROP POLICY IF EXISTS "Authenticated read reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated read app analytics" ON public.app_analytics;
DROP POLICY IF EXISTS "Authenticated read ai_prompts" ON public.ai_prompts;
DROP POLICY IF EXISTS "Authenticated read push campaigns" ON public.push_campaigns;
DROP POLICY IF EXISTS "Authenticated read ads" ON public.advertisements;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- service_role must be accepted (edge functions / admin RPCs with no uid)
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. admin_users table
  IF EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.status = 'Active'
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. profiles table role
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND LOWER(p.role) IN ('admin', 'super_admin')
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. auth.users metadata + verified owner emails (NO wildcard LIKE)
  IF EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND (
      LOWER(u.raw_user_meta_data->>'role') IN ('admin', 'super_admin')
      OR LOWER(u.raw_app_meta_data->>'role') IN ('admin', 'super_admin')
      OR LOWER(u.email) IN ('dubeysatyam607@gmail.com', 'satyamff124@gmail.com')
    )
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN public.admin_roles ar ON au.role_id = ar.id
    WHERE au.user_id = auth.uid()
    AND au.status = 'Active'
    AND LOWER(ar.name) IN ('super admin', 'super_admin')
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND (
      LOWER(u.raw_user_meta_data->>'role') = 'super_admin'
      OR LOWER(u.raw_app_meta_data->>'role') = 'super_admin'
      OR LOWER(u.email) IN ('dubeysatyam607@gmail.com', 'satyamff124@gmail.com')
    )
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Founding Farmer RPCs — auth binding + restricted EXECUTE
-- ──────────────────────────────────────────────────────────────────────────

-- claim_founding_farmer_slot: caller may only claim for themselves
-- (or service_role for admin/automation flows).
CREATE OR REPLACE FUNCTION public.claim_founding_farmer_slot(
  p_user_id UUID,
  p_plan TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_number INT;
  v_price NUMERIC;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() <> p_user_id THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Not authorized');
  END IF;

  -- Lock the config row
  SELECT * INTO v_config
  FROM public.founding_farmer_config
  WHERE id = 'default'
  FOR UPDATE;

  -- Validate config exists
  IF NOT FOUND THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Configuration not found');
  END IF;

  -- Check offer is active
  IF NOT v_config.is_active THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Founding Farmer program is not active');
  END IF;

  -- Check date window
  IF now() < v_config.offer_start OR now() > v_config.offer_end THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Founding Farmer offer is not available at this time');
  END IF;

  -- Check slots available
  IF v_config.slots_taken >= v_config.max_slots THEN
    RETURN json_build_object('ok', FALSE, 'error', 'All Founding Farmer slots have been claimed');
  END IF;

  -- Check user doesn't already have a FF subscription
  IF EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = p_user_id AND founding_farmer = TRUE AND status IN ('active', 'trial')
  ) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'You are already a Founding Farmer');
  END IF;

  -- Determine price based on plan
  IF p_plan = 'plus' THEN
    v_price := v_config.plus_price;
  ELSIF p_plan = 'pro' THEN
    v_price := v_config.pro_price;
  ELSE
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid plan. Must be plus or pro');
  END IF;

  -- Assign founding farmer number (atomic increment)
  v_config.slots_taken := v_config.slots_taken + 1;
  v_number := v_config.slots_taken;

  -- Update config
  UPDATE public.founding_farmer_config
  SET slots_taken = v_config.slots_taken,
      updated_at = now()
  WHERE id = 'default';

  RETURN json_build_object(
    'ok', TRUE,
    'founding_farmer_number', v_number,
    'price', v_price,
    'slots_remaining', GREATEST(0, v_config.max_slots - v_config.slots_taken),
    'plan', p_plan
  );
END;
$$;

-- activate_founding_farmer: payment-verified path — service_role only
CREATE OR REPLACE FUNCTION public.activate_founding_farmer(
  p_user_id UUID,
  p_plan TEXT,
  p_price NUMERIC,
  p_founding_farmer_number INT,
  p_payment_id TEXT,
  p_normal_price NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT;
  v_sub_id TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Not authorized');
  END IF;

  -- Map plan name to plan ID
  IF p_plan = 'plus' THEN
    v_plan_id := 'plan-plus';
  ELSIF p_plan = 'pro' THEN
    v_plan_id := 'plan-pro';
  ELSE
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid plan');
  END IF;

  -- Calculate expiry (1 month from now)
  v_expires_at := now() + INTERVAL '30 days';

  -- Generate subscription ID
  v_sub_id := 'ff-' || p_user_id::TEXT || '-' || EXTRACT(EPOCH FROM now())::TEXT;

  -- Upsert subscription (cancel any existing non-FF subscription first)
  UPDATE public.user_subscriptions
  SET status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  WHERE user_id = p_user_id
    AND status IN ('active', 'trial')
    AND founding_farmer = FALSE;

  -- Insert or update FF subscription
  INSERT INTO public.user_subscriptions (
    id, user_id, plan_id, status, started_at, expires_at,
    founding_farmer, founding_farmer_price, founding_farmer_joined_at,
    founding_farmer_number, payment_id, normal_price,
    created_at, updated_at
  ) VALUES (
    v_sub_id, p_user_id, v_plan_id, 'active', now(), v_expires_at,
    TRUE, p_price, now(),
    p_founding_farmer_number, p_payment_id, p_normal_price,
    now(), now()
  )
  ON CONFLICT (user_id, plan_id) WHERE founding_farmer = TRUE
  DO UPDATE SET
    status = 'active',
    expires_at = v_expires_at,
    founding_farmer_price = p_price,
    payment_id = p_payment_id,
    updated_at = now();

  -- Update profile badge
  UPDATE public.profiles
  SET founding_farmer = TRUE,
      founding_farmer_number = p_founding_farmer_number,
      updated_at = now()
  WHERE id = p_user_id;

  -- Log audit
  INSERT INTO public.audit_logs (action, entity_type, entity_id, details, created_at)
  VALUES ('CREATE', 'founding_farmer', v_sub_id,
    json_build_object(
      'user_id', p_user_id,
      'plan', p_plan,
      'price', p_price,
      'founding_farmer_number', p_founding_farmer_number,
      'payment_id', p_payment_id
    )::TEXT,
    now()
  );

  RETURN json_build_object(
    'ok', TRUE,
    'subscription_id', v_sub_id,
    'plan_id', v_plan_id,
    'expires_at', v_expires_at,
    'founding_farmer_number', p_founding_farmer_number
  );
END;
$$;

-- Lock down EXECUTE privileges on the FF RPCs
REVOKE ALL ON FUNCTION public.claim_founding_farmer_slot(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_founding_farmer_slot(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_founding_farmer_slot(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_founding_farmer_slot(UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.activate_founding_farmer(UUID, TEXT, NUMERIC, INT, TEXT, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_founding_farmer(UUID, TEXT, NUMERIC, INT, TEXT, NUMERIC) FROM anon;
REVOKE ALL ON FUNCTION public.activate_founding_farmer(UUID, TEXT, NUMERIC, INT, TEXT, NUMERIC) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.activate_founding_farmer(UUID, TEXT, NUMERIC, INT, TEXT, NUMERIC) TO service_role;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Close broad reads — self-or-admin for user data, admin-only for
--    admin content. (Kept idempotent: DROP POLICY IF EXISTS first.)
-- ──────────────────────────────────────────────────────────────────────────

-- Financial + PII tables: own row OR admin
CREATE POLICY "Own or admin read subscriptions" ON public.user_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Own or admin read payments" ON public.payments
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Own or admin read wallets" ON public.wallets
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Own or admin read wallet txns" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Own or admin read support tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Admin content tables: admin-only
CREATE POLICY "Admins read crash reports" ON public.crash_reports
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins read analytics" ON public.app_analytics
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins read ai prompts" ON public.ai_prompts
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins read push campaigns" ON public.push_campaigns
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins read ads" ON public.advertisements
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins read reports" ON public.reports
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins read admin roles" ON public.admin_roles
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins read admin users" ON public.admin_users
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Super admins manage admin users" ON public.admin_users
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      JOIN public.admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid() AND LOWER(ar.name) = 'super admin' AND au.status = 'Active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      JOIN public.admin_roles ar ON au.role_id = ar.id
      WHERE au.user_id = auth.uid() AND LOWER(ar.name) = 'super admin' AND au.status = 'Active'
    )
  );