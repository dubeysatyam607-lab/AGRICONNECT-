-- ============================================================================
-- Fix: argument of OR must be type boolean, not type text
-- In submit_manual_payment(), wrap the regex string concatenation in parentheses
-- so the PostgreSQL !~ operator acts on the full pattern string.
-- ============================================================================

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
     OR POSITION(chr(92) IN p_proof_path) > 0
     OR POSITION(chr(0) IN p_proof_path) > 0
     OR (
       p_proof_path !~ ('^payment-proofs/' || v_user_id::TEXT || '/[A-Za-z0-9\-_.]+/proof\.(png|jpg|jpeg|webp)$')
       AND p_proof_path !~ ('^' || v_user_id::TEXT || '/[A-Za-z0-9\-_.]+/proof\.(png|jpg|jpeg|webp)$')
       AND p_proof_path !~ ('^payment-proofs/' || v_user_id::TEXT || '/[A-Za-z0-9\-_.]+\.(png|jpg|jpeg|webp)$')
       AND p_proof_path !~ ('^' || v_user_id::TEXT || '/[A-Za-z0-9\-_.]+\.(png|jpg|jpeg|webp)$')
     ) THEN
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
    jsonb_build_object('plan_id', p_plan_id, 'utr', v_utr, 'amount', v_expected),
    now()
  );

  RETURN json_build_object('ok', TRUE, 'id', v_new_id, 'status', 'pending');
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_manual_payment(TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_manual_payment(TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID) TO service_role;
