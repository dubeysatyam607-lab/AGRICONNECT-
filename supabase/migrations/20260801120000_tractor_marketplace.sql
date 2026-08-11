-- Uber-like Tractor Rental Marketplace
-- Scalable tables for bookings, reviews and driver tracking.

CREATE TABLE IF NOT EXISTS public.tractor_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  tractor_id TEXT NOT NULL,
  tractor_name TEXT NOT NULL,
  owner_id TEXT,
  owner_name TEXT,
  category TEXT,
  hours NUMERIC DEFAULT 0,
  acres NUMERIC DEFAULT 0,
  address TEXT,
  payment_method TEXT,
  with_driver BOOLEAN DEFAULT TRUE,
  base_fare NUMERIC DEFAULT 0,
  fuel_surcharge NUMERIC DEFAULT 0,
  driver_charge NUMERIC DEFAULT 0,
  deposit NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tractor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.tractor_bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  tractor_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scalability: indexes for common query paths
CREATE INDEX IF NOT EXISTS tractor_bookings_user_idx ON public.tractor_bookings (user_id);
CREATE INDEX IF NOT EXISTS tractor_bookings_tractor_idx ON public.tractor_bookings (tractor_id);
CREATE INDEX IF NOT EXISTS tractor_bookings_status_idx ON public.tractor_bookings (status);
CREATE INDEX IF NOT EXISTS tractor_reviews_tractor_idx ON public.tractor_reviews (tractor_id);
CREATE INDEX IF NOT EXISTS tractor_reviews_user_idx ON public.tractor_reviews (user_id);

-- Row Level Security
ALTER TABLE public.tractor_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tractor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own tractor bookings" ON public.tractor_bookings;
CREATE POLICY "Users view own tractor bookings"
  ON public.tractor_bookings FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users create tractor bookings" ON public.tractor_bookings;
CREATE POLICY "Users create tractor bookings"
  ON public.tractor_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "Users view own tractor reviews" ON public.tractor_reviews;
CREATE POLICY "Users view own tractor reviews"
  ON public.tractor_reviews FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create tractor reviews" ON public.tractor_reviews;
CREATE POLICY "Users create tractor reviews"
  ON public.tractor_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);
