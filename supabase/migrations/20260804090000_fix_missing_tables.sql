-- Fix missing tables referenced by the client app but never created.
-- Also add the missing `role` column to profiles.

-- 1. Contact messages (dashboard contact form)
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Transport booking requests
CREATE TABLE IF NOT EXISTS public.transport_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  destination TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  weight TEXT,
  date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Labor hiring requests
CREATE TABLE IF NOT EXISTS public.labor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  work_type TEXT NOT NULL,
  labor_count TEXT,
  date TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Laborer directory (queried by LaborHire, mock fallback previously)
CREATE TABLE IF NOT EXISTS public.laborers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  skill TEXT,
  location TEXT,
  rate NUMERIC,
  count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Available'
);

-- 5. Transport vehicles directory
CREATE TABLE IF NOT EXISTS public.transport_vehicles (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  capacity TEXT,
  rate NUMERIC,
  location TEXT,
  status TEXT DEFAULT 'Available'
);

-- 6. Livestock directory (Pashu Mela)
CREATE TABLE IF NOT EXISTS public.livestock (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  breed TEXT,
  price NUMERIC,
  location TEXT,
  status TEXT DEFAULT 'Available'
);

-- 7. Cold storage facilities
CREATE TABLE IF NOT EXISTS public.storage_facilities (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  capacity TEXT,
  rate NUMERIC,
  temperature TEXT,
  status TEXT DEFAULT 'Available'
);

-- 8. Role column for farmer/owner switching
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'farmer';

-- RLS: public-facing forms may INSERT without auth, but reading any of the
-- request tables (which hold farmer name/phone PII) is restricted to admins.
-- Public catalogue tables are read-only for everyone; only admins may modify.
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laborers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livestock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_facilities ENABLE ROW LEVEL SECURITY;

-- Anonymous form submissions are allowed (no auth header in the form flow)…
CREATE POLICY "contact_messages_anon_insert" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "transport_bookings_anon_insert" ON public.transport_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "labor_requests_anon_insert" ON public.labor_requests FOR INSERT WITH CHECK (true);

-- …but only admins (or the service role) may read the request inbox.
CREATE POLICY "contact_messages_admin_select" ON public.contact_messages FOR SELECT
  USING (auth.role() = 'service_role');
CREATE POLICY "transport_bookings_admin_select" ON public.transport_bookings FOR SELECT
  USING (auth.role() = 'service_role');
CREATE POLICY "labor_requests_admin_select" ON public.labor_requests FOR SELECT
  USING (auth.role() = 'service_role');

-- Public catalogues are readable by everyone…
CREATE POLICY "laborers_public_select" ON public.laborers FOR SELECT USING (true);
CREATE POLICY "transport_vehicles_public_select" ON public.transport_vehicles FOR SELECT USING (true);
CREATE POLICY "livestock_public_select" ON public.livestock FOR SELECT USING (true);
CREATE POLICY "storage_facilities_public_select" ON public.storage_facilities FOR SELECT USING (true);

-- …but only admins may write to them.
CREATE POLICY "laborers_admin_all" ON public.laborers FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'))
  WITH CHECK (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'));
CREATE POLICY "transport_vehicles_admin_all" ON public.transport_vehicles FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'))
  WITH CHECK (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'));
CREATE POLICY "livestock_admin_all" ON public.livestock FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'))
  WITH CHECK (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'));
CREATE POLICY "storage_facilities_admin_all" ON public.storage_facilities FOR ALL
  USING (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'))
  WITH CHECK (auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'));
