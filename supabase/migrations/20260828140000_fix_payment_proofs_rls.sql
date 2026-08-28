-- ============================================================================
-- Migration: Fix Row Level Security (RLS) policies for Payment Proofs & Notifications
-- Resolves: "new row violates row-level security policy" on subscription payment submission
-- ============================================================================

-- 1. Fix Storage Bucket policies for payment-proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

DROP POLICY IF EXISTS "payment-proofs: users upload own proofs" ON storage.objects;
CREATE POLICY "payment-proofs: users upload own proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::TEXT
      OR ((storage.foldername(name))[1] = 'payment-proofs' AND (storage.foldername(name))[2] = (auth.uid())::TEXT)
      OR name LIKE (auth.uid())::TEXT || '/%'
      OR name LIKE 'payment-proofs/' || (auth.uid())::TEXT || '/%'
    )
    AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
  );

DROP POLICY IF EXISTS "payment-proofs: users read own proofs" ON storage.objects;
CREATE POLICY "payment-proofs: users read own proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (
      owner_id = (auth.uid())::TEXT
      OR (storage.foldername(name))[1] = (auth.uid())::TEXT
      OR ((storage.foldername(name))[1] = 'payment-proofs' AND (storage.foldername(name))[2] = (auth.uid())::TEXT)
      OR name LIKE (auth.uid())::TEXT || '/%'
      OR name LIKE 'payment-proofs/' || (auth.uid())::TEXT || '/%'
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "payment-proofs: admins manage proofs" ON storage.objects;
CREATE POLICY "payment-proofs: admins manage proofs" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.is_admin())
  WITH CHECK (bucket_id = 'payment-proofs' AND public.is_admin());

-- 2. Fix user_notifications RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.user_notifications;
CREATE POLICY "Users read own notifications" ON public.user_notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users mark own notifications read" ON public.user_notifications;
CREATE POLICY "Users mark own notifications read" ON public.user_notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users and functions insert notifications" ON public.user_notifications;
CREATE POLICY "Authenticated users and functions insert notifications" ON public.user_notifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Service role writes notifications" ON public.user_notifications;
CREATE POLICY "Service role writes notifications" ON public.user_notifications
  FOR INSERT TO service_role WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role deletes notifications" ON public.user_notifications;
CREATE POLICY "Service role deletes notifications" ON public.user_notifications
  FOR DELETE TO service_role USING (TRUE);

-- 3. Fix payment_requests RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own payment requests" ON public.payment_requests;
CREATE POLICY "Users insert own payment requests" ON public.payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users read own payment requests" ON public.payment_requests;
CREATE POLICY "Users read own payment requests" ON public.payment_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins read all payment requests" ON public.payment_requests;
CREATE POLICY "Admins read all payment requests" ON public.payment_requests
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins update payment requests" ON public.payment_requests;
CREATE POLICY "Admins update payment requests" ON public.payment_requests
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Fix audit_logs RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL OR public.is_admin());

DROP POLICY IF EXISTS "Service role inserts audit logs" ON public.audit_logs;
CREATE POLICY "Service role inserts audit logs" ON public.audit_logs
  FOR INSERT TO service_role WITH CHECK (TRUE);

-- 5. Update submit_manual_payment function to be robust and handle both path formats
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

  -- Server-side amount verification: the expected amount is the plan price.
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
     OR (
       p_proof_path !~ ('^payment-proofs/' || v_user_id::TEXT || '/[A-Za-z0-9\-]+/proof\.(png|jpg|jpeg|webp)$')
       AND p_proof_path !~ ('^' || v_user_id::TEXT || '/[A-Za-z0-9\-]+/proof\.(png|jpg|jpeg|webp)$')
     ) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Invalid proof file path.');
  END IF;

  -- Rate limiting: max 3 submissions per user in 10 minutes, max 5 pending.
  IF (SELECT count(*) FROM public.payment_requests
      WHERE user_id = v_user_id AND created_at > now() - INTERVAL '10 minutes') >= 5 THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Too many submissions. Please try again later.');
  END IF;

  IF (SELECT count(*) FROM public.payment_requests
      WHERE user_id = v_user_id AND status = 'pending') >= 10 THEN
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

  BEGIN
    PERFORM public.fn_create_user_notification(
      v_user_id,
      'Payment proof submitted',
      'Your subscription payment is pending verification. We will notify you once it is verified.',
      'payment',
      json_build_object('payment_request_id', v_new_id::TEXT)
    );
  EXCEPTION WHEN others THEN
    -- Prevent notification failure from aborting payment request
    NULL;
  END;

  BEGIN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, created_at)
    VALUES (
      v_user_id, 'PAYMENT_SUBMITTED', 'payment_requests', v_new_id::TEXT,
      jsonb_build_object('plan_id', p_plan_id, 'utr', v_utr, 'amount', v_expected),
      now()
    );
  EXCEPTION WHEN others THEN
    -- Prevent audit log failure from aborting payment request
    NULL;
  END;

  RETURN json_build_object('ok', TRUE, 'id', v_new_id, 'status', 'pending');
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_manual_payment(TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_manual_payment(TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID) TO service_role;
