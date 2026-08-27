-- ==============================================================================
-- 20260827120000_manual_upi_payments.sql
-- AgriConnect — manual UPI subscription payment flow (server-verified).
--  1. Seed subscription_plans (Free / Farmer Plus / Farmer Pro) from DB.
--  2. payment_config: server-side UPI settings.
--  3. payment_requests: manual payment ledger (pending/approved/rejected/cancelled).
--  4. user_notifications: in-app notifications.
--  5. Private `payment-proofs` storage bucket + restrictive object policies.
--  6. SECURITY DEFINER RPCs with is_admin() gating (no frontend trust).
--  7. Realtime publication for payment_requests + user_notifications.
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Seed subscription plans (idempotent). Plan IDs match the existing
--    Founding Farmer / application plan keys (plan-free / plan-plus / plan-pro).
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO public.subscription_plans (id, name, description, price, currency, interval, is_active, features, sort_order, created_at, updated_at)
VALUES
  ('plan-free', 'Free', 'Basic AgriConnect access for every farmer', 0, 'INR', 'yearly', TRUE, '["Marketplace", "Weather", "Crop lab"]'::jsonb, 0, now(), now()),
  ('plan-plus', 'Farmer Plus', 'Medium plan — unlimited AI, price alerts, reduced ads', 49, 'INR', 'monthly', TRUE, '["Unlimited AI assistant", "Crop Doctor unlimited", "Price alerts", "Priority support", "Reduced ads"]'::jsonb, 1, now(), now()),
  ('plan-pro', 'Farmer Pro', 'Premium plan — everything in Plus, ad-free, advanced analytics', 99, 'INR', 'monthly', TRUE, '["Everything in Plus", "AI crop advisor", "Yield forecasting", "Advanced analytics", "Ad-free experience"]'::jsonb, 2, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. payment_config — single-row server-side UPI configuration.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  upi_id TEXT NOT NULL DEFAULT '',
  payee_name TEXT NOT NULL DEFAULT 'AgriConnect',
  currency TEXT NOT NULL DEFAULT 'INR',
  pending_expiry_hours NUMERIC NOT NULL DEFAULT 72,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.payment_config (id, upi_id, payee_name, currency, pending_expiry_hours, is_active, updated_at)
VALUES ('default', '7067820256@ptyes', 'SATYAM DUBEY', 'INR', 72, TRUE, now())
ON CONFLICT (id) DO UPDATE SET
  upi_id = EXCLUDED.upi_id,
  payee_name = EXCLUDED.payee_name,
  updated_at = now();

ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_config FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read payment config" ON public.payment_config;
CREATE POLICY "Admins read payment config" ON public.payment_config
  FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins write payment config" ON public.payment_config;
CREATE POLICY "Admins write payment config" ON public.payment_config
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 3. payment_requests — manual UPI payment ledger.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans (id),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  utr TEXT NOT NULL,
  payment_date TIMESTAMPTZ,
  proof_storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_note TEXT,
  rejection_reason TEXT,
  verified_by UUID REFERENCES auth.users (id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_requests_user_id_idx ON public.payment_requests (user_id);
CREATE INDEX IF NOT EXISTS payment_requests_utr_idx ON public.payment_requests (utr);
CREATE INDEX IF NOT EXISTS payment_requests_status_idx ON public.payment_requests (status);
CREATE INDEX IF NOT EXISTS payment_requests_created_at_idx ON public.payment_requests (created_at DESC);

-- Prevent duplicate UTR while a payment is open (pending/approved).
-- Freed once a request is rejected/cancelled so the user can resubmit correct proof.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_requests_utr_active
  ON public.payment_requests (utr) WHERE status IN ('pending', 'approved');

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own payment requests" ON public.payment_requests;
CREATE POLICY "Users insert own payment requests" ON public.payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own payment requests" ON public.payment_requests;
CREATE POLICY "Users read own payment requests" ON public.payment_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins read all payment requests" ON public.payment_requests;
CREATE POLICY "Admins read all payment requests" ON public.payment_requests
  FOR SELECT TO authenticated USING (public.is_admin());

-- Users can never UPDATE/DELETE payment_requests. Status/verification changes
-- happen exclusively through the admin RPCs below.
DROP POLICY IF EXISTS "Admins update payment requests" ON public.payment_requests;
CREATE POLICY "Admins update payment requests" ON public.payment_requests
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 4. user_notifications — in-app notifications (inserted by RPCs only).
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'payment',
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_notifications_user_id_idx ON public.user_notifications (user_id, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.user_notifications;
CREATE POLICY "Users read own notifications" ON public.user_notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Users may only toggle their own is_read flag.
DROP POLICY IF EXISTS "Users mark own notifications read" ON public.user_notifications;
CREATE POLICY "Users mark own notifications read" ON public.user_notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Only service_role writes new notifications (RPCs run as owner / service role).
DROP POLICY IF EXISTS "Service role writes notifications" ON public.user_notifications;
CREATE POLICY "Service role writes notifications" ON public.user_notifications
  FOR INSERT TO service_role WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Service role deletes notifications" ON public.user_notifications;
CREATE POLICY "Service role deletes notifications" ON public.user_notifications
  FOR DELETE TO service_role USING (TRUE);

-- Restrict user UPDATE to ONLY the is_read column.
CREATE OR REPLACE FUNCTION public.tg_restrict_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.data IS DISTINCT FROM OLD.data
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Only the is_read flag can be updated';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_notification_update ON public.user_notifications;
CREATE TRIGGER trg_restrict_notification_update
  BEFORE UPDATE ON public.user_notifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_restrict_notification_update();

-- ──────────────────────────────────────────────────────────────────────────
-- 5. Private storage bucket for payment proofs.
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "payment-proofs: users upload own proofs" ON storage.objects;
CREATE POLICY "payment-proofs: users upload own proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = (auth.uid())::TEXT
    AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
  );

DROP POLICY IF EXISTS "payment-proofs: users read own proofs" ON storage.objects;
CREATE POLICY "payment-proofs: users read own proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (owner_id = auth.uid()::TEXT OR public.is_admin())
  );

DROP POLICY IF EXISTS "payment-proofs: admins manage proofs" ON storage.objects;
CREATE POLICY "payment-proofs: admins manage proofs" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.is_admin())
  WITH CHECK (bucket_id = 'payment-proofs' AND public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 6. Notification helper (SECURITY DEFINER, used by RPCs).
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_create_user_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_kind TEXT DEFAULT 'payment',
  p_data JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_notifications (user_id, title, body, kind, data, is_read, created_at)
  VALUES (p_user_id, p_title, p_body, p_kind, p_data, FALSE, now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_create_user_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 7. get_payment_config — UPI config for signed-in users (server-gated).
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_payment_config()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS NULL THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Authentication required');
  END IF;

  SELECT * INTO v_config FROM public.payment_config WHERE id = 'default';
  IF NOT FOUND THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Payment configuration missing');
  END IF;

  RETURN json_build_object(
    'ok', TRUE,
    'upi_id', v_config.upi_id,
    'payee_name', v_config.payee_name,
    'currency', v_config.currency,
    'is_active', v_config.is_active,
    'pending_expiry_hours', v_config.pending_expiry_hours
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_payment_config() TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 8. submit_manual_payment — user submits UPI proof. Server validates plan,
--    amount, UTR (normalized + deduped), proof path. NEVER activates a
--    subscription. Status always starts as `pending`.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_manual_payment(
  p_plan_id TEXT,
  p_amount NUMERIC,
  p_utr TEXT,
  p_proof_path TEXT,
  p_payment_date TIMESTAMPTZ DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_utr TEXT;
  v_plan RECORD;
  v_expected NUMERIC;
  v_payment_date TIMESTAMPTZ;
  v_new_id UUID;
  v_amount_note TEXT := NULL;
BEGIN
  -- Resolve acting user (service_role may submit on behalf of p_user_id).
  IF auth.role() = 'service_role' THEN
    v_user_id := p_user_id;
  ELSE
    v_user_id := auth.uid();
  END IF;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Authentication required');
  END IF;

  -- Normalize UTR: uppercase, strip whitespace.
  v_utr := UPPER(BTRIM(REGEXP_REPLACE(COALESCE(p_utr, ''), '\s+', '', 'g')));
  IF char_length(v_utr) < 6 OR char_length(v_utr) > 40 THEN
    RETURN json_build_object('ok', FALSE, 'error', 'UTR must be between 6 and 40 characters');
  END IF;
  IF v_utr ~ '[^A-Z0-9/\-]' THEN
    RETURN json_build_object('ok', FALSE, 'error', 'UTR contains invalid characters. Use letters, digits, - or / only.');
  END IF;

  -- Duplicate UTR protection (DB unique partial index is the backstop).
  IF EXISTS (
    SELECT 1 FROM public.payment_requests
    WHERE utr = v_utr AND status IN ('pending', 'approved')
  ) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'This UTR has already been submitted.');
  END IF;

  -- Plans come from the database — never trusted from the client.
  SELECT price, is_active, interval, name INTO v_plan
  FROM public.subscription_plans WHERE id = p_plan_id;
  IF NOT FOUND OR NOT v_plan.is_active THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid or inactive plan.');
  END IF;

  v_expected := v_plan.price;

  -- Payable plans only.
  IF v_expected <= 0 THEN
    RETURN json_build_object('ok', FALSE, 'error', 'This plan does not require payment.');
  END IF;

  -- Server-side amount verification: the expectED amount is the plan price.
  -- If the user reports a different amount, keep status pending + flag it.
  IF p_amount IS NOT NULL AND p_amount <> v_expected THEN
    v_amount_note := 'Amount mismatch: expected ' || v_expected::TEXT || ', user reported ' || p_amount::TEXT;
  END IF;

  -- Payment date sanity.
  v_payment_date := COALESCE(p_payment_date, now());
  IF v_payment_date > now() + INTERVAL '1 hour' THEN
    v_payment_date := now();
  END IF;

  -- Proof path must be namespaced under the user's own folder.
  IF p_proof_path IS NULL
     OR POSITION('..' IN p_proof_path) > 0
     OR POSITION('\' IN p_proof_path) > 0
     OR POSITION(chr(0) IN p_proof_path) > 0
     OR p_proof_path !~ ('^payment-proofs/' || v_user_id::TEXT || '/[A-Za-z0-9\-]+/proof\.(png|jpg|jpeg|webp)$') THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid proof file path.');
  END IF;

  -- Rate limiting: max 3 submissions per user in 10 minutes, max 5 pending.
  IF (SELECT count(*) FROM public.payment_requests
      WHERE user_id = v_user_id AND created_at > now() - INTERVAL '10 minutes') >= 3 THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Too many submissions. Please try again later.');
  END IF;

  IF (SELECT count(*) FROM public.payment_requests
      WHERE user_id = v_user_id AND status = 'pending') >= 5 THEN
    RETURN json_build_object('ok', FALSE, 'error', 'You already have several payments awaiting verification.');
  END IF;

  INSERT INTO public.payment_requests (
    user_id, plan_id, amount, currency, utr, payment_date,
    proof_storage_path, status, admin_note, rejection_reason,
    verified_by, verified_at, created_at, updated_at
  )
  VALUES (
    v_user_id, p_plan_id, v_expected, 'INR', v_utr, v_payment_date,
    p_proof_path, 'pending', v_amount_note, NULL,
    NULL, NULL, now(), now()
  )
  RETURNING id INTO v_new_id;

  PERFORM public.fn_create_user_notification(
    v_user_id,
    'Payment proof submitted',
    'Your subscription payment is pending verification. We will notify you once it is verified.',
    'payment',
    json_build_object('payment_request_id', v_new_id::TEXT)
  );

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, created_at)
  VALUES (
    v_user_id, 'PAYMENT_SUBMITTED', 'payment_requests', v_new_id::TEXT,
    json_build_object('user_id', v_user_id::TEXT, 'plan_id', p_plan_id, 'amount', v_expected, 'utr', v_utr),
    now()
  );

  RETURN json_build_object('ok', TRUE, 'id', v_new_id::TEXT, 'status', 'pending', 'amount', v_expected);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_manual_payment(TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_manual_payment(TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_manual_payment(TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID) FROM anon;

-- ──────────────────────────────────────────────────────────────────────────
-- 9. admin_approve_manual_payment — atomic approval: verify admin, lock,
--    prevent double-approval, mark approved, activate subscription with
--    plan-derived expiry, notify + audit. All-or-nothing.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_approve_manual_payment(
  p_payment_request_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_plan RECORD;
  v_expires_at TIMESTAMPTZ;
  v_sub_id TEXT;
  v_admin_id UUID := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Not authorized');
  END IF;

  SELECT * INTO v_request FROM public.payment_requests
  WHERE id = p_payment_request_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Payment request not found');
  END IF;

  IF v_request.status <> 'pending' THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Only pending payment requests can be approved');
  END IF;

  SELECT name, price, interval INTO v_plan FROM public.subscription_plans WHERE id = v_request.plan_id;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Plan not found');
  END IF;

  -- Plan-derived expiry (renew extends from existing expiry when still valid).
  v_expires_at := now() + CASE
    WHEN v_plan.interval = 'yearly' THEN INTERVAL '1 year'
    ELSE INTERVAL '1 month'
  END;

  -- 1) Mark payment request approved (verified by the authenticated admin).
  UPDATE public.payment_requests
  SET status = 'approved',
      admin_note = COALESCE(p_note, v_request.admin_note),
      verified_by = v_admin_id,
      verified_at = now(),
      updated_at = now()
  WHERE id = p_payment_request_id;

  -- 2) Cancel existing active subscriptions (single active entitlement).
  UPDATE public.user_subscriptions
  SET status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  WHERE user_id = v_request.user_id
    AND status IN ('active', 'trial');

  -- 3) Activate the new subscription.
  v_sub_id := 'upi-' || v_request.user_id::TEXT || '-' || EXTRACT(EPOCH FROM now())::TEXT;
  INSERT INTO public.user_subscriptions (
    id, user_id, plan_id, status, started_at, expires_at, payment_id,
    founding_farmer, founding_farmer_price, created_at, updated_at
  )
  SELECT v_sub_id, v_request.user_id, v_request.plan_id, 'active', now(), v_expires_at,
         p_payment_request_id::TEXT, FALSE, NULL, now(), now();

  PERFORM public.fn_create_user_notification(
    v_request.user_id,
    'Payment verified',
    'Your ' || v_plan.name || ' subscription is now active.',
    'payment',
    json_build_object('payment_request_id', v_request.id::TEXT, 'plan_id', v_request.plan_id, 'expires_at', v_expires_at::TEXT)
  );

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, created_at)
  VALUES
    (v_admin_id, 'PAYMENT_APPROVED', 'payment_requests', v_request.id::TEXT,
     json_build_object('user_id', v_request.user_id::TEXT, 'plan_id', v_request.plan_id, 'amount', v_request.amount, 'utr', v_request.utr), now()),
    (v_admin_id, 'SUBSCRIPTION_ACTIVATED', 'user_subscriptions', v_sub_id,
     json_build_object('user_id', v_request.user_id::TEXT, 'plan_id', v_request.plan_id, 'expires_at', v_expires_at::TEXT), now());

  RETURN json_build_object(
    'ok', TRUE,
    'subscription_id', v_sub_id,
    'plan_id', v_request.plan_id,
    'expires_at', v_expires_at::TEXT,
    'payment_request_id', v_request.id::TEXT
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_manual_payment(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_approve_manual_payment(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_approve_manual_payment(UUID, TEXT) FROM anon;

-- ──────────────────────────────────────────────────────────────────────────
-- 10. admin_reject_manual_payment — rejection with a required reason.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reject_manual_payment(
  p_payment_request_id UUID,
  p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_reason TEXT;
  v_admin_id UUID := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Not authorized');
  END IF;

  v_reason := BTRIM(COALESCE(p_reason, ''));
  IF char_length(v_reason) < 3 THEN
    RETURN json_build_object('ok', FALSE, 'error', 'A rejection reason is required');
  END IF;

  SELECT * INTO v_request FROM public.payment_requests
  WHERE id = p_payment_request_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Payment request not found');
  END IF;

  IF v_request.status <> 'pending' THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Only pending payment requests can be rejected');
  END IF;

  UPDATE public.payment_requests
  SET status = 'rejected',
      rejection_reason = v_reason,
      verified_by = v_admin_id,
      verified_at = now(),
      updated_at = now()
  WHERE id = p_payment_request_id;

  PERFORM public.fn_create_user_notification(
    v_request.user_id,
    'Payment verification failed',
    'Payment could not be verified: ' || v_reason || '. Please review the reason and submit valid proof.',
    'payment',
    json_build_object('payment_request_id', v_request.id::TEXT, 'reason', v_reason)
  );

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, created_at)
  VALUES (v_admin_id, 'PAYMENT_REJECTED', 'payment_requests', v_request.id::TEXT,
          json_build_object('user_id', v_request.user_id::TEXT, 'plan_id', v_request.plan_id, 'reason', v_reason), now());

  RETURN json_build_object('ok', TRUE, 'id', v_request.id::TEXT, 'status', 'rejected');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reject_manual_payment(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_reject_manual_payment(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reject_manual_payment(UUID, TEXT) FROM anon;

-- ──────────────────────────────────────────────────────────────────────────
-- 11. admin_request_payment_info — admin asks user for more detail; keeps
--     the request pending, records the note, notifies the user + audit.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_request_payment_info(
  p_payment_request_id UUID,
  p_message TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_message TEXT;
  v_admin_id UUID := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Not authorized');
  END IF;

  v_message := BTRIM(COALESCE(p_message, ''));
  IF char_length(v_message) < 3 THEN
    RETURN json_build_object('ok', FALSE, 'error', 'A message is required');
  END IF;

  SELECT * INTO v_request FROM public.payment_requests
  WHERE id = p_payment_request_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Payment request not found');
  END IF;

  IF v_request.status <> 'pending' THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Only pending payment requests can be updated');
  END IF;

  UPDATE public.payment_requests
  SET admin_note = COALESCE(v_message, v_request.admin_note),
      updated_at = now()
  WHERE id = p_payment_request_id;

  PERFORM public.fn_create_user_notification(
    v_request.user_id,
    'Additional information needed',
    v_message,
    'payment',
    json_build_object('payment_request_id', v_request.id::TEXT)
  );

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, created_at)
  VALUES (v_admin_id, 'PAYMENT_INFO_REQUEST', 'payment_requests', v_request.id::TEXT,
          json_build_object('user_id', v_request.user_id::TEXT, 'message', v_message), now());

  RETURN json_build_object('ok', TRUE, 'id', v_request.id::TEXT, 'status', 'pending');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_request_payment_info(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_request_payment_info(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_request_payment_info(UUID, TEXT) FROM anon;

-- ──────────────────────────────────────────────────────────────────────────
-- 12. admin_manage_subscription — manual user-subscription management with
--     mandatory audit trail. Actions: grant | extend | cancel | suspend.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_manage_subscription(
  p_user_id UUID,
  p_plan_id TEXT DEFAULT NULL,
  p_action TEXT DEFAULT 'grant',
  p_duration_months INT DEFAULT 1,
  p_reason TEXT DEFAULT 'Manual verification'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan RECORD;
  v_sub RECORD;
  v_new_expires_at TIMESTAMPTZ;
  v_sub_id TEXT;
  v_admin_id UUID := auth.uid();
  v_action TEXT := LOWER(BTRIM(COALESCE(p_action, 'grant')));
BEGIN
  IF NOT public.is_admin() THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Not authorized');
  END IF;

  IF v_action NOT IN ('grant', 'extend', 'cancel', 'suspend') THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Unknown action. Use grant, extend, cancel or suspend.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'User not found');
  END IF;

  -- grant / extend require a valid active plan
  IF v_action IN ('grant', 'extend') THEN
    SELECT name, interval, is_active INTO v_plan FROM public.subscription_plans WHERE id = p_plan_id;
    IF NOT FOUND OR NOT v_plan.is_active THEN
      RETURN json_build_object('ok', FALSE, 'error', 'Invalid or inactive plan');
    END IF;
  END IF;

  IF v_action = 'grant' THEN
    v_new_expires_at := now() + (p_duration_months || ' months')::INTERVAL;
    UPDATE public.user_subscriptions
    SET status = 'cancelled', cancelled_at = now(), updated_at = now()
    WHERE user_id = p_user_id AND status IN ('active', 'trial');

    v_sub_id := 'adm-' || p_user_id::TEXT || '-' || EXTRACT(EPOCH FROM now())::TEXT;
    INSERT INTO public.user_subscriptions (
      id, user_id, plan_id, status, started_at, expires_at, payment_id,
      founding_farmer, created_at, updated_at
    ) VALUES (
      v_sub_id, p_user_id, p_plan_id, 'active', now(), v_new_expires_at, NULL,
      FALSE, now(), now()
    );

    PERFORM public.fn_create_user_notification(p_user_id, 'Subscription granted',
      'Your ' || v_plan.name || ' subscription is active.', 'subscription', NULL);

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, created_at)
    VALUES (v_admin_id, 'SUBSCRIPTION_MANUALLY_GRANTED', 'user_subscriptions', v_sub_id,
            json_build_object('user_id', p_user_id::TEXT, 'plan_id', p_plan_id, 'expires_at', v_new_expires_at::TEXT, 'reason', p_reason), now());

    RETURN json_build_object('ok', TRUE, 'subscription_id', v_sub_id, 'expires_at', v_new_expires_at::TEXT);
  END IF;

  IF v_action = 'extend' THEN
    SELECT * INTO v_sub FROM public.user_subscriptions
    WHERE user_id = p_user_id AND plan_id = p_plan_id AND status = 'active'
    ORDER BY expires_at DESC NULLS LAST LIMIT 1 FOR UPDATE;

    IF NOT FOUND THEN
      RETURN json_build_object('ok', FALSE, 'error', 'No active subscription found for this plan');
    END IF;

    v_new_expires_at := GREATEST(now(), COALESCE(v_sub.expires_at, now())) + (p_duration_months || ' months')::INTERVAL;
    UPDATE public.user_subscriptions
    SET expires_at = v_new_expires_at, updated_at = now()
    WHERE id = v_sub.id;

    PERFORM public.fn_create_user_notification(p_user_id, 'Subscription extended',
      'Your ' || v_plan.name || ' subscription has been extended.', 'subscription', NULL);

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, created_at)
    VALUES (v_admin_id, 'SUBSCRIPTION_EXTENDED', 'user_subscriptions', v_sub.id,
            json_build_object('user_id', p_user_id::TEXT, 'plan_id', p_plan_id, 'expires_at', v_new_expires_at::TEXT, 'reason', p_reason), now());

    RETURN json_build_object('ok', TRUE, 'subscription_id', v_sub.id, 'expires_at', v_new_expires_at::TEXT);
  END IF;

  -- cancel / suspend
  UPDATE public.user_subscriptions
  SET status = 'cancelled', cancelled_at = now(), updated_at = now()
  WHERE user_id = p_user_id AND status IN ('active', 'trial');

  PERFORM public.fn_create_user_notification(p_user_id,
    CASE WHEN v_action = 'suspend' THEN 'Subscription suspended' ELSE 'Subscription cancelled' END,
    'Admin update on your subscription.', 'subscription', NULL);

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, created_at)
  VALUES (v_admin_id,
          CASE WHEN v_action = 'suspend' THEN 'SUBSCRIPTION_SUSPENDED' ELSE 'SUBSCRIPTION_CANCELLED' END,
          'user_subscriptions', p_user_id::TEXT,
          json_build_object('user_id', p_user_id::TEXT, 'reason', p_reason), now());

  RETURN json_build_object('ok', TRUE, 'action', v_action);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_manage_subscription(UUID, TEXT, TEXT, INT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_manage_subscription(UUID, TEXT, TEXT, INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_manage_subscription(UUID, TEXT, TEXT, INT, TEXT) FROM anon;

-- ──────────────────────────────────────────────────────────────────────────
-- 13. Realtime: keep admins/users up to date without polling.
-- ──────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_plans; EXCEPTION WHEN others THEN NULL; END;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 14. Fix: Founding Farmer activate RPC wrote to audit_logs columns
--     (entity_type/entity_id/details) that no longer exist — use the live
--     audit_logs shape so FF activations do not throw at runtime.
-- ──────────────────────────────────────────────────────────────────────────
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

  IF p_plan = 'plus' THEN
    v_plan_id := 'plan-plus';
  ELSIF p_plan = 'pro' THEN
    v_plan_id := 'plan-pro';
  ELSE
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid plan');
  END IF;

  v_expires_at := now() + INTERVAL '30 days';
  v_sub_id := 'ff-' || p_user_id::TEXT || '-' || EXTRACT(EPOCH FROM now())::TEXT;

  UPDATE public.user_subscriptions
  SET status = 'cancelled', cancelled_at = now(), updated_at = now()
  WHERE user_id = p_user_id
    AND status IN ('active', 'trial')
    AND founding_farmer = FALSE;

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

  UPDATE public.profiles
  SET founding_farmer = TRUE,
      founding_farmer_number = p_founding_farmer_number,
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, created_at)
  VALUES (
    p_user_id, 'SUBSCRIPTION_ACTIVATED', 'user_subscriptions', v_sub_id,
    json_build_object(
      'user_id', p_user_id::TEXT, 'plan', p_plan, 'price', p_price,
      'founding_farmer_number', p_founding_farmer_number, 'payment_id', p_payment_id
    ),
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