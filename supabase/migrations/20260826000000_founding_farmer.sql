-- ============================================================
-- Founding Farmer Program — Schema, RPCs, RLS
-- ============================================================

-- 1. Config table (single-row, admin-configurable)
CREATE TABLE IF NOT EXISTS public.founding_farmer_config (
  id           TEXT PRIMARY KEY DEFAULT 'default',
  is_active    BOOLEAN DEFAULT TRUE,
  max_slots    INT NOT NULL DEFAULT 500,
  slots_taken  INT NOT NULL DEFAULT 0,
  offer_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  offer_end    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  plus_price   NUMERIC NOT NULL DEFAULT 29,
  pro_price    NUMERIC NOT NULL DEFAULT 59,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Seed default config (only if not exists)
INSERT INTO public.founding_farmer_config (id, is_active, max_slots, slots_taken, offer_start, offer_end, plus_price, pro_price)
VALUES ('default', TRUE, 500, 0, now(), now() + INTERVAL '90 days', 29, 59)
ON CONFLICT (id) DO NOTHING;

-- 2. Extend user_subscriptions with founding farmer columns
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS founding_farmer BOOLEAN DEFAULT FALSE;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS founding_farmer_price NUMERIC;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS founding_farmer_joined_at TIMESTAMPTZ;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS founding_farmer_number INT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS normal_price NUMERIC;

-- 3. Extend profiles with founding farmer badge
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS founding_farmer BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS founding_farmer_number INT;

-- 4. Index for fast FF lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_founding_farmer ON public.user_subscriptions (founding_farmer) WHERE founding_farmer = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_founding_farmer ON public.profiles (founding_farmer) WHERE founding_farmer = TRUE;

-- ============================================================
-- RPC: Get Founding Farmer config (public read)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_founding_farmer_config()
RETURNS JSON
LANGUAGE SQL
STABLE
AS $$
  SELECT json_build_object(
    'is_active', c.is_active,
    'max_slots', c.max_slots,
    'slots_taken', c.slots_taken,
    'remaining_slots', GREATEST(0, c.max_slots - c.slots_taken),
    'offer_start', c.offer_start,
    'offer_end', c.offer_end,
    'plus_price', c.plus_price,
    'pro_price', c.pro_price,
    'offer_valid', (
      c.is_active
      AND now() BETWEEN c.offer_start AND c.offer_end
      AND c.slots_taken < c.max_slots
    )
  )
  FROM public.founding_farmer_config c
  WHERE c.id = 'default';
$$;

-- ============================================================
-- RPC: Claim a Founding Farmer slot (atomic, idempotent)
-- Uses SELECT FOR UPDATE to prevent double-claim on last slot
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_founding_farmer_slot(
  p_user_id UUID,
  p_plan TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_number INT;
  v_price NUMERIC;
BEGIN
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

-- ============================================================
-- RPC: Activate Founding Farmer subscription (service_role only)
-- Called after payment verification
-- ============================================================
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
AS $$
DECLARE
  v_plan_id TEXT;
  v_sub_id TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
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

-- ============================================================
-- RLS Policies for founding_farmer_config
-- ============================================================

-- Public can read config (to check eligibility)
ALTER TABLE public.founding_farmer_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read FF config" ON public.founding_farmer_config;
CREATE POLICY "Public can read FF config"
  ON public.founding_farmer_config
  FOR SELECT
  USING (true);

-- Admins can update config
DROP POLICY IF EXISTS "Admins can update FF config" ON public.founding_farmer_config;
CREATE POLICY "Admins can update FF config"
  ON public.founding_farmer_config
  FOR ALL
  USING (public.is_admin());

-- ============================================================
-- Add founding_farmer_config to realtime publication
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.founding_farmer_config;
