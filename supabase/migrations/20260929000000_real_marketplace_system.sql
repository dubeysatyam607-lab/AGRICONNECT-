-- REAL DATABASE-BACKED USER-GENERATED MARKETPLACE MIGRATION
-- Supports Machinery, Cattle/Livestock, Labour/Workers, and Agricultural Services.

-- 1. Create Supabase Storage Bucket for Marketplace Images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketplace-images',
  'marketplace-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage bucket RLS policies
DROP POLICY IF EXISTS "Public storage select for marketplace images" ON storage.objects;
CREATE POLICY "Public storage select for marketplace images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace-images');

DROP POLICY IF EXISTS "Authenticated users upload marketplace images" ON storage.objects;
CREATE POLICY "Authenticated users upload marketplace images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'marketplace-images'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users delete own marketplace images" ON storage.objects;
CREATE POLICY "Users delete own marketplace images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'marketplace-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- 2. Core Listings Table
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('machinery', 'cattle', 'labour', 'service')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  price_unit TEXT NOT NULL DEFAULT 'per_day',
  security_deposit NUMERIC DEFAULT 0,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  village TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  service_radius_km NUMERIC DEFAULT 25,
  availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'rented', 'unavailable', 'paused', 'sold', 'expired')),
  available_from DATE,
  available_until DATE,
  contact_preference TEXT DEFAULT 'both' CHECK (contact_preference IN ('call', 'whatsapp', 'in_app', 'both')),
  owner_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  owner_is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified', 'flagged', 'rejected')),
  views_count INTEGER DEFAULT 0,
  reports_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_type ON public.listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_state_district ON public.listings(state, district);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(availability_status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);


-- 3. Listing Images Table
CREATE TABLE IF NOT EXISTS public.listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  display_order INTEGER DEFAULT 0,
  is_cover BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON public.listing_images(listing_id);


-- 4. Category-Specific Detail Tables

-- Machinery & Equipment Details
CREATE TABLE IF NOT EXISTS public.listing_machinery_details (
  listing_id UUID PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  manufacturing_year INTEGER,
  condition TEXT DEFAULT 'good',
  horsepower NUMERIC,
  capacity TEXT,
  fuel_type TEXT DEFAULT 'diesel',
  minimum_rental_duration TEXT,
  delivery_available BOOLEAN DEFAULT false,
  delivery_charges NUMERIC DEFAULT 0,
  operator_included BOOLEAN DEFAULT false,
  operator_charges NUMERIC DEFAULT 0,
  additional_notes TEXT
);

-- Cattle / Livestock Details
CREATE TABLE IF NOT EXISTS public.listing_cattle_details (
  listing_id UUID PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  animal_type TEXT NOT NULL,
  breed TEXT,
  age_years NUMERIC,
  gender TEXT DEFAULT 'female',
  health_status TEXT DEFAULT 'healthy',
  weight_kg NUMERIC,
  milk_production_daily_litres NUMERIC,
  lactation_number INTEGER,
  vaccination_info TEXT,
  purpose TEXT DEFAULT 'sale'
);

-- Labour / Farm Worker Details
CREATE TABLE IF NOT EXISTS public.listing_labour_details (
  listing_id UUID PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  work_category TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}',
  experience_years NUMERIC DEFAULT 1,
  team_size INTEGER DEFAULT 1,
  available_dates TEXT,
  languages TEXT[] DEFAULT '{}',
  gender TEXT
);

-- Other Agricultural Service Details
CREATE TABLE IF NOT EXISTS public.listing_service_details (
  listing_id UUID PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  custom_service_name TEXT,
  service_scope TEXT,
  terms_conditions TEXT
);


-- 5. Listing Reports Table
CREATE TABLE IF NOT EXISTS public.listing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reported_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('fake_listing', 'incorrect_info', 'wrong_price', 'inappropriate', 'fraud_scam', 'unavailable', 'other')),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_reports_listing_id ON public.listing_reports(listing_id);


-- 6. Admin Audits Table
CREATE TABLE IF NOT EXISTS public.listing_admin_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('approve', 'verify', 'flag', 'disable', 'restore', 'delete')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 7. Row Level Security (RLS) Policies

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_machinery_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_cattle_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_labour_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_service_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_admin_audits ENABLE ROW LEVEL SECURITY;

-- Listings Policies
DROP POLICY IF EXISTS "Public can view active non-rejected listings" ON public.listings;
CREATE POLICY "Public can view active non-rejected listings" ON public.listings
  FOR SELECT USING (
    verification_status != 'rejected'
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Authenticated users insert own listings" ON public.listings;
CREATE POLICY "Authenticated users insert own listings" ON public.listings
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Owners update own listings" ON public.listings;
CREATE POLICY "Owners update own listings" ON public.listings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners delete own listings" ON public.listings;
CREATE POLICY "Owners delete own listings" ON public.listings
  FOR DELETE USING (auth.uid() = user_id);


-- Images Policies
DROP POLICY IF EXISTS "Public select listing_images" ON public.listing_images;
CREATE POLICY "Public select listing_images" ON public.listing_images
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners insert listing_images" ON public.listing_images;
CREATE POLICY "Owners insert listing_images" ON public.listing_images
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners delete listing_images" ON public.listing_images;
CREATE POLICY "Owners delete listing_images" ON public.listing_images
  FOR DELETE USING (auth.uid() = owner_id);


-- Detail Tables Policies (inherited via listing ownership for write, public for read)
DROP POLICY IF EXISTS "Public select machinery_details" ON public.listing_machinery_details;
CREATE POLICY "Public select machinery_details" ON public.listing_machinery_details FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owner write machinery_details" ON public.listing_machinery_details;
CREATE POLICY "Owner write machinery_details" ON public.listing_machinery_details FOR ALL USING (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Public select cattle_details" ON public.listing_cattle_details;
CREATE POLICY "Public select cattle_details" ON public.listing_cattle_details FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owner write cattle_details" ON public.listing_cattle_details;
CREATE POLICY "Owner write cattle_details" ON public.listing_cattle_details FOR ALL USING (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Public select labour_details" ON public.listing_labour_details;
CREATE POLICY "Public select labour_details" ON public.listing_labour_details FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owner write labour_details" ON public.listing_labour_details;
CREATE POLICY "Owner write labour_details" ON public.listing_labour_details FOR ALL USING (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Public select service_details" ON public.listing_service_details;
CREATE POLICY "Public select service_details" ON public.listing_service_details FOR SELECT USING (true);
DROP POLICY IF EXISTS "Owner write service_details" ON public.listing_service_details;
CREATE POLICY "Owner write service_details" ON public.listing_service_details FOR ALL USING (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND user_id = auth.uid())
);


-- Reports & Admin Audits Policies
DROP POLICY IF EXISTS "Auth insert listing_reports" ON public.listing_reports;
CREATE POLICY "Auth insert listing_reports" ON public.listing_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin view listing_reports" ON public.listing_reports;
CREATE POLICY "Admin view listing_reports" ON public.listing_reports
  FOR SELECT USING (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);


-- 8. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_images;
