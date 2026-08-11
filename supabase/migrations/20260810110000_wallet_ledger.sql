-- AgriConnect Wallet — ledger-based, server-authoritative.
-- Every balance change is a wallet_transactions row created atomically by a
-- SECURITY DEFINER RPC. Clients never write wallets/transactions directly.

-- ── 1. Configurable financial limits (server-side, never hardcoded) ───────
CREATE TABLE IF NOT EXISTS public.wallet_limits (
  key TEXT PRIMARY KEY,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'INR',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.wallet_limits (key, value, unit) VALUES
  ('minimum_add_money', 10, 'INR'),
  ('maximum_add_money', 100000, 'INR'),
  ('daily_add_money_limit', 250000, 'INR'),
  ('monthly_add_money_limit', 2000000, 'INR'),
  ('minimum_withdrawal', 100, 'INR'),
  ('maximum_withdrawal', 50000, 'INR')
ON CONFLICT (key) DO NOTHING;

-- ── 2. wallets ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'frozen', 'closed')),
  -- Authoritative real-money balance. Promo/reward buckets live in the ledger
  -- and are surfaced by wallet_get_summary(); only verified flows change this.
  balance NUMERIC(14,2) NOT NULL DEFAULT 0
    CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);

-- ── 3. wallet_transactions (append-only ledger) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('credit','debit','refund','cashback','reward','payment','withdrawal','adjustment')),
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','failed','reversed')),
  reference_type TEXT,
  reference_id TEXT,
  description TEXT,
  -- Promotional credits are NOT withdrawable cash.
  credit_type TEXT CHECK (credit_type IN ('cash','promo','reward')),
  source TEXT,
  expiry TIMESTAMPTZ,
  usage_restrictions TEXT,
  balance_after NUMERIC(14,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Webhook replay protection: a verified payment can credit exactly once.
  UNIQUE (reference_type, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_txn_wallet_created ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_status ON public.wallet_transactions(status);

-- ── 4. RLS: users read their own wallet + ledger; writes only via RPC ──────
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own wallet" ON public.wallets;
CREATE POLICY "Users read own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users read own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users read own wallet transactions"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Anyone reads wallet limits" ON public.wallet_limits;
CREATE POLICY "Anyone reads wallet limits"
  ON public.wallet_limits FOR SELECT USING (true);

-- Admin read-all for the admin panel.
DROP POLICY IF EXISTS "Admin views all wallets" ON public.wallets;
CREATE POLICY "Admin views all wallets"
  ON public.wallets FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin views all wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admin views all wallet transactions"
  ON public.wallet_transactions FOR SELECT USING (public.is_admin());

-- ── 5. Atomic helper: lock a wallet row, apply ledger + balance together ────
CREATE OR REPLACE FUNCTION public.wallet_apply_ledger(
  p_wallet_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_direction TEXT,
  p_amount NUMERIC,
  p_reference_type TEXT,
  p_reference_id TEXT,
  p_description TEXT,
  p_credit_type TEXT DEFAULT NULL,
  p_source TEXT DEFAULT NULL,
  p_expiry TIMESTAMPTZ DEFAULT NULL,
  p_usage_restrictions TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'completed'
)
RETURNS public.wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_txn public.wallet_transactions%ROWTYPE;
  v_new_balance NUMERIC(14,2);
BEGIN
  -- Serialise concurrent ops on the same wallet (prevents race conditions).
  -- The idempotency check MUST run inside this lock: two concurrent deliveries
  -- for the same reference would both pass a pre-lock SELECT (uncommitted row
  -- invisible under READ COMMITTED) and one would then hit the UNIQUE violation.
  PERFORM pg_advisory_xact_lock(hashtext('wallet:' || p_wallet_id::text));

  -- Idempotency: the caller must supply reference_type+reference_id together.
  IF p_reference_type IS NOT NULL AND p_reference_id IS NOT NULL THEN
    SELECT * INTO v_txn FROM public.wallet_transactions
      WHERE reference_type = p_reference_type AND reference_id = p_reference_id
      LIMIT 1;
    IF FOUND THEN
      -- Already processed (webhook replay / duplicate submit). Refuse if the
      -- found transaction belongs to a different wallet or user.
      IF v_txn.wallet_id <> p_wallet_id OR v_txn.user_id <> p_user_id THEN
        RAISE EXCEPTION 'Reference already used by another wallet' USING ERRCODE = 'P0001';
      END IF;
      RETURN v_txn;
    END IF;
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE id = p_wallet_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  IF v_wallet.status = 'closed' THEN
    RAISE EXCEPTION 'Wallet is closed';
  END IF;
  IF v_wallet.status = 'frozen' AND p_direction = 'out' THEN
    RAISE EXCEPTION 'Wallet is frozen — debits are disabled';
  END IF;

  v_new_balance := v_wallet.balance;
  IF p_direction = 'in' THEN
    v_new_balance := v_new_balance + p_amount;
  ELSIF p_direction = 'out' THEN
    IF v_new_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient balance' USING ERRCODE = 'P0001';
    END IF;
    v_new_balance := v_new_balance - p_amount;
  ELSE
    RAISE EXCEPTION 'Invalid direction';
  END IF;

  UPDATE public.wallets SET balance = v_new_balance, updated_at = now()
    WHERE id = p_wallet_id;

  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, direction, amount, currency, status,
    reference_type, reference_id, description, credit_type, source,
    expiry, usage_restrictions, balance_after
  ) VALUES (
    p_wallet_id, p_user_id, p_type, p_direction, p_amount, 'INR', p_status,
    p_reference_type, p_reference_id, p_description, p_credit_type, p_source,
    p_expiry, p_usage_restrictions, v_new_balance
  )
  RETURNING * INTO v_txn;

  RETURN v_txn;
END;
$$;

-- ── 6. Get-or-create wallet + summary for the signed-in user ───────────────
CREATE OR REPLACE FUNCTION public.wallet_get_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_wallet public.wallets%ROWTYPE;
  v_summary JSONB;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_user;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id) VALUES (v_user) RETURNING * INTO v_wallet;
  END IF;

  SELECT jsonb_build_object(
    'wallet_id', v_wallet.id,
    'currency', v_wallet.currency,
    'status', v_wallet.status,
    'available_balance', v_wallet.balance,
    'pending_balance', COALESCE((
      SELECT sum(amount) FROM public.wallet_transactions
      WHERE wallet_id = v_wallet.id AND status = 'pending'
    ), 0),
    'total_earned', COALESCE((
      SELECT sum(amount) FROM public.wallet_transactions
      WHERE wallet_id = v_wallet.id AND direction = 'in' AND status = 'completed'
    ), 0),
    'total_spent', COALESCE((
      SELECT sum(amount) FROM public.wallet_transactions
      WHERE wallet_id = v_wallet.id AND direction = 'out' AND status = 'completed'
    ), 0),
    'promo_credit', COALESCE((
      SELECT sum(amount) FROM public.wallet_transactions
      WHERE wallet_id = v_wallet.id AND direction = 'in' AND status = 'completed'
        AND credit_type IN ('promo','reward')
    ), 0)
  ) INTO v_summary;

  RETURN v_summary;
END;
$$;

-- ── 7. Paginated transaction history ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.wallet_transactions_page(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_type_filter TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_wallet public.wallets%ROWTYPE;
  v_count BIGINT;
  v_rows JSONB;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_user;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('rows', jsonb_build_array(), 'total', 0, 'page', p_page, 'page_size', p_page_size);
  END IF;

  SELECT count(*) INTO v_count FROM public.wallet_transactions
    WHERE wallet_id = v_wallet.id
      AND (p_type_filter = 'all' OR type = p_type_filter);

  SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT to_jsonb(wt) AS t
    FROM public.wallet_transactions wt
    WHERE wt.wallet_id = v_wallet.id
      AND (p_type_filter = 'all' OR wt.type = p_type_filter)
    ORDER BY wt.created_at DESC
    LIMIT p_page_size OFFSET ((p_page - 1) * p_page_size)
  ) sub;

  RETURN jsonb_build_object('rows', v_rows, 'total', v_count, 'page', p_page, 'page_size', p_page_size);
END;
$$;

-- ── 8. Add-money limits check (used by the edge function before Razorpay) ──
CREATE OR REPLACE FUNCTION public.wallet_add_money_check(p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_wallet public.wallets%ROWTYPE;
  v_min NUMERIC; v_max NUMERIC; v_daily NUMERIC; v_monthly NUMERIC;
  v_daily_sum NUMERIC; v_monthly_sum NUMERIC;
BEGIN
  SELECT value INTO v_min FROM public.wallet_limits WHERE key = 'minimum_add_money';
  SELECT value INTO v_max FROM public.wallet_limits WHERE key = 'maximum_add_money';
  SELECT value INTO v_daily FROM public.wallet_limits WHERE key = 'daily_add_money_limit';
  SELECT value INTO v_monthly FROM public.wallet_limits WHERE key = 'monthly_add_money_limit';

  IF p_amount < v_min OR p_amount > v_max THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', format('Amount must be between %s and %s', v_min, v_max),
      'min', v_min, 'max', v_max
    );
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_user;
  IF v_wallet.id IS NOT NULL THEN
    SELECT COALESCE(sum(amount), 0) INTO v_daily_sum FROM public.wallet_transactions
      WHERE wallet_id = v_wallet.id AND type = 'credit' AND status = 'completed'
        AND created_at > now() - interval '1 day';
    SELECT COALESCE(sum(amount), 0) INTO v_monthly_sum FROM public.wallet_transactions
      WHERE wallet_id = v_wallet.id AND type = 'credit' AND status = 'completed'
        AND created_at > now() - interval '1 month';
    IF v_daily_sum + p_amount > v_daily THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Daily add-money limit reached', 'daily', v_daily);
    END IF;
    IF v_monthly_sum + p_amount > v_monthly THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Monthly add-money limit reached', 'monthly', v_monthly);
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- ── 9. Server-side credit (edge function / webhook only; uses service key) ─
CREATE OR REPLACE FUNCTION public.wallet_credit_verified(
  p_user_id UUID,
  p_amount NUMERIC,
  p_reference_type TEXT,
  p_reference_id TEXT,
  p_description TEXT DEFAULT NULL,
  p_credit_type TEXT DEFAULT 'cash',
  p_source TEXT DEFAULT 'razorpay'
)
RETURNS public.wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_txn public.wallet_transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id) VALUES (p_user_id) RETURNING * INTO v_wallet;
  END IF;

  v_txn := public.wallet_apply_ledger(
    v_wallet.id, p_user_id, 'credit', 'in', p_amount,
    p_reference_type, p_reference_id, p_description,
    p_credit_type, p_source
  );
  RETURN v_txn;
END;
$$;

-- ── 10. Admin manual adjustment (audited, requires admin) ───────────────────
CREATE TABLE IF NOT EXISTS public.wallet_admin_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  reason TEXT NOT NULL,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_admin_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins read adjustments" ON public.wallet_admin_adjustments;
CREATE POLICY "Only admins read adjustments"
  ON public.wallet_admin_adjustments FOR SELECT USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.wallet_admin_adjust(
  p_user_id UUID,
  p_amount NUMERIC,
  p_direction TEXT,
  p_reason TEXT
)
RETURNS public.wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_wallet public.wallets%ROWTYPE;
  v_txn public.wallet_transactions%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required';
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id) VALUES (p_user_id) RETURNING * INTO v_wallet;
  END IF;

  -- Deterministic reference (wallet|direction|amount|reason): an admin retry
  -- after a timeout hits the idempotency check instead of double-applying.
  v_txn := public.wallet_apply_ledger(
    v_wallet.id, p_user_id,
    'adjustment', p_direction, p_amount,
    'admin_adjustment',
    md5(v_wallet.id::text || '|' || p_direction || '|' || p_amount::text || '|' || btrim(p_reason)),
    p_reason, NULL, 'admin'
  );

  INSERT INTO public.wallet_admin_adjustments (
    wallet_id, user_id, amount, direction, reason, admin_user_id
  ) VALUES (v_wallet.id, p_user_id, p_amount, p_direction, p_reason, v_admin);

  RETURN v_txn;
END;
$$;

-- ── 11. Admin wallet list (view) ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_wallets_list()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'wallet_id', w.id,
      'user_id', w.user_id,
      'full_name', p.full_name,
      'phone', p.phone,
      'balance', w.balance,
      'status', w.status,
      'currency', w.currency,
      'created_at', w.created_at,
      'updated_at', w.updated_at
    ) ORDER BY w.updated_at DESC)
    FROM public.wallets w
    LEFT JOIN public.profiles p ON p.id = w.user_id
  ), '[]'::jsonb);
END;
$$;

-- ── 12. Privilege lockdown (SECURITY DEFINER money functions) ──────────────
-- By default PostgreSQL grants EXECUTE to PUBLIC, exposing these over
-- /rest/v1/rpc/* to anon/authenticated — an unauthenticated money-minting
-- vector. Revoke from everyone and grant narrowly.
REVOKE ALL ON FUNCTION public.wallet_apply_ledger FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_credit_verified FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_get_summary FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_transactions_page FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_add_money_check FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_admin_adjust FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_wallets_list FROM PUBLIC, anon, authenticated;

-- service_role only: internal ledger + webhook credit (called by edge fn).
GRANT EXECUTE ON FUNCTION public.wallet_apply_ledger TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_credit_verified TO service_role;

-- authenticated only: wallet_get_summary / transactions_page / add_money_check
-- are invoked by the edge function with the user's JWT (auth.uid() set);
-- wallet_admin_adjust / admin_wallets_list self-gate via is_admin().
GRANT EXECUTE ON FUNCTION public.wallet_get_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_transactions_page TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_add_money_check TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_admin_adjust TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_wallets_list TO authenticated;
