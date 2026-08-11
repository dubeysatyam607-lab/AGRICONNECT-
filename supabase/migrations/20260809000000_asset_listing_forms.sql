-- Allow farmers to list vehicles in the transport marketplace.
-- Previously only admins could write to transport_vehicles; the "List Vehicle" form
-- now inserts from an authenticated farmer session.
DROP POLICY IF EXISTS "transport_vehicles_user_insert" ON public.transport_vehicles;
CREATE POLICY "transport_vehicles_user_insert" ON public.transport_vehicles
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Store inventory listings (Agri-Store).
CREATE TABLE IF NOT EXISTS public.store_inventory (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  price NUMERIC,
  image_url TEXT,
  status TEXT DEFAULT 'Available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_inventory_public_select" ON public.store_inventory FOR SELECT USING (true);
CREATE POLICY "store_inventory_user_insert" ON public.store_inventory FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Soil testing lab listings.
CREATE TABLE IF NOT EXISTS public.soil_test_labs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  test_type TEXT,
  turnaround TEXT,
  price NUMERIC,
  image_url TEXT,
  status TEXT DEFAULT 'Available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.soil_test_labs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "soil_test_labs_public_select" ON public.soil_test_labs FOR SELECT USING (true);
CREATE POLICY "soil_test_labs_user_insert" ON public.soil_test_labs FOR INSERT
  WITH CHECK (auth.role() IN ('authenticated', 'service_role'));
