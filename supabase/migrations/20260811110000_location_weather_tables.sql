-- CENTRALIZED LOCATION + WEATHER CACHE
--
-- Creates the storage backing for the centralized location system and the
-- short-lived weather cache. No fake data, no hardcoded locations — only
-- schema + RLS.
--
-- Tables:
--   1. user_locations   — user's current/saved locations (gps/manual/saved)
--   2. farm_locations   — one or more farm locations per user
--   3. weather_cache    — short-lived weather responses keyed by coordinates

-- ── 1. user_locations ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_locations (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude   NUMERIC,
  longitude  NUMERIC,
  country    TEXT,
  state      TEXT,
  district   TEXT,
  city       TEXT,
  village    TEXT,
  pincode    TEXT,
  accuracy   NUMERIC,
  source     TEXT NOT NULL DEFAULT 'manual',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_locations_select_own" ON public.user_locations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_locations_insert_own" ON public.user_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_locations_update_own" ON public.user_locations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_locations_delete_own" ON public.user_locations
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_locations_user ON public.user_locations (user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_default ON public.user_locations (user_id, is_default);

-- ── 2. farm_locations ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.farm_locations (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  latitude   NUMERIC,
  longitude  NUMERIC,
  country    TEXT,
  state      TEXT,
  district   TEXT,
  village    TEXT,
  pincode    TEXT,
  area       NUMERIC,
  crop       TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.farm_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farm_locations_select_own" ON public.farm_locations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "farm_locations_insert_own" ON public.farm_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "farm_locations_update_own" ON public.farm_locations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "farm_locations_delete_own" ON public.farm_locations
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_farm_locations_user ON public.farm_locations (user_id);
CREATE INDEX IF NOT EXISTS idx_farm_locations_active ON public.farm_locations (user_id, is_active);

-- ── 3. weather_cache ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weather_cache (
  id           BIGSERIAL PRIMARY KEY,
  latitude     NUMERIC NOT NULL,
  longitude    NUMERIC NOT NULL,
  weather_data JSONB NOT NULL,
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + interval '10 minutes'
);

ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

-- Cache rows are read/written by the edge function using the service role.
CREATE POLICY "weather_cache_service_all" ON public.weather_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_weather_cache_coords ON public.weather_cache (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_weather_cache_expiry ON public.weather_cache (expires_at);
