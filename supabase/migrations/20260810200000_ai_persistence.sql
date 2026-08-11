-- ── AgriConnect AI persistence: conversations, crop scans, usage metering ──
-- Enables secure chat memory (spec §7), scan history (§16), and usage/cost
-- tracking (§19) with RLS so users only see their own data.

-- ── 1. ai_conversations ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New chat',
  language text NOT NULL DEFAULT 'en',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {farmId, cropId, scanId, ...}
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ── 2. ai_messages (append-only per conversation) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  language text,
  tool_calls jsonb NOT NULL DEFAULT '[]'::jsonb,   -- which tools were invoked
  tool_data jsonb NOT NULL DEFAULT '{}'::jsonb,    -- snapshot of live data used
  tokens_in integer,
  tokens_out integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
  ON public.ai_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user
  ON public.ai_conversations (user_id, updated_at DESC);

-- ── 3. crop_scans ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crop_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url text,
  storage_path text,          -- Supabase Storage object path (private bucket)
  mime_type text,
  language text,
  -- Structured vision result (spec §15)
  crop text,
  plant_part text,
  health_status text,
  possible_issue text,
  confidence numeric(5,2),    -- 0..100
  symptoms jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  urgency text,               -- 'low' | 'medium' | 'high' | 'urgent'
  raw_result jsonb,           -- full AI output snapshot
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crop_scans_user
  ON public.crop_scans (user_id, created_at DESC);

-- ── 4. ai_usage (cost & subscription metering — server-enforced) ────────────
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature text NOT NULL,              -- 'kisan_chat' | 'crop_scan' | 'tts' | 'stt'
  provider text,
  model text,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  images integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,  -- voice seconds x1000
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_time
  ON public.ai_usage (user_id, created_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Users read/manage their own conversations & messages. Admins read-all.
CREATE POLICY "own conversations select" ON public.ai_conversations
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "own conversations insert" ON public.ai_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "own conversations update" ON public.ai_conversations
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "own conversations delete" ON public.ai_conversations
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "own messages select" ON public.ai_messages
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "own messages insert" ON public.ai_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());
-- messages never updated, only deleted with their conversation (cascade).

CREATE POLICY "own scans select" ON public.crop_scans
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "own scans insert" ON public.crop_scans
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "own scans delete" ON public.crop_scans
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- Usage rows are written by edge functions (service_role). Users read own.
CREATE POLICY "own usage select" ON public.ai_usage
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "own usage insert" ON public.ai_usage
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "usage service insert" ON public.ai_usage
  FOR INSERT TO service_role WITH CHECK (true);

-- ── 5. RPCs (SECURITY DEFINER, narrow grants — wallet pattern) ──────────────
-- Record AI usage atomically; returns total usage for the plan window so the
-- backend can enforce limits server-side (spec §19: never trust frontend).
CREATE OR REPLACE FUNCTION public.ai_log_usage(
  p_user_id uuid,
  p_feature text,
  p_provider text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_tokens_in integer DEFAULT 0,
  p_tokens_out integer DEFAULT 0,
  p_images integer DEFAULT 0,
  p_duration_ms integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_day_total numeric;
  v_month_total numeric;
BEGIN
  INSERT INTO public.ai_usage (user_id, feature, provider, model, tokens_in, tokens_out, images, duration_ms)
  VALUES (p_user_id, p_feature, p_provider, p_model, p_tokens_in, p_tokens_out, p_images, p_duration_ms);

  SELECT COALESCE(SUM(tokens_in + tokens_out + images * 1000), 0)
    INTO v_day_total
    FROM public.ai_usage
    WHERE user_id = p_user_id AND created_at >= date_trunc('day', v_now);

  SELECT COALESCE(SUM(tokens_in + tokens_out + images * 1000), 0)
    INTO v_month_total
    FROM public.ai_usage
    WHERE user_id = p_user_id AND created_at >= date_trunc('month', v_now);

  RETURN jsonb_build_object(
    'recorded', true,
    'day_total', v_day_total,
    'month_total', v_month_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ai_log_usage FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_log_usage TO service_role;
