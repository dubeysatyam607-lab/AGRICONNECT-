-- ══════════════════════════════════════════════════════════════════════
-- Founding Farmer Analytics Events
-- Lightweight event tracking for FF program funnel
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ff_analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ff_analytics_events_created ON public.ff_analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ff_analytics_events_event ON public.ff_analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_ff_analytics_events_user ON public.ff_analytics_events(user_id);

-- Admin can read all, authenticated users can insert their own
ALTER TABLE public.ff_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read ff_analytics" ON public.ff_analytics_events;
CREATE POLICY "Admin read ff_analytics"
  ON public.ff_analytics_events FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated insert ff_analytics" ON public.ff_analytics_events;
CREATE POLICY "Authenticated insert ff_analytics"
  ON public.ff_analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admin delete ff_analytics" ON public.ff_analytics_events;
CREATE POLICY "Admin delete ff_analytics"
  ON public.ff_analytics_events FOR DELETE
  USING (public.is_admin());

-- Realtime for admin live view
ALTER PUBLICATION supabase_realtime ADD TABLE public.ff_analytics_events;
