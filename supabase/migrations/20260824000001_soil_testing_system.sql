-- ==============================================================================
-- 20260824000000_soil_testing_system.sql
-- Production Soil Testing (Mitti Jaanch) Schema, RLS, Storage and Status System
-- ==============================================================================

-- 1. Create soil_test_orders table
CREATE TABLE IF NOT EXISTS public.soil_test_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  farm_name TEXT,
  address TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  village TEXT,
  pincode TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  farm_size NUMERIC(8, 2),
  farm_size_unit TEXT DEFAULT 'acre' CHECK (farm_size_unit IN ('acre', 'hectare', 'bigha', 'guntha')),
  crop TEXT,
  crop_stage TEXT,
  test_type TEXT NOT NULL CHECK (test_type IN ('standard', 'micronutrient', 'water')),
  sample_quantity TEXT DEFAULT '500g composite sample',
  pickup_required BOOLEAN NOT NULL DEFAULT TRUE,
  pickup_fee NUMERIC(10, 2) NOT NULL DEFAULT 150.00,
  test_price NUMERIC(10, 2) NOT NULL DEFAULT 299.00,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 449.00,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method TEXT DEFAULT 'upi',
  payment_id TEXT,
  order_status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    order_status IN (
      'submitted',
      'payment_confirmed',
      'agent_pending',
      'pickup_scheduled',
      'sample_collected',
      'sample_received',
      'testing_in_progress',
      'report_ready',
      'report_delivered',
      'cancelled'
    )
  ),
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_agent_name TEXT,
  assigned_agent_phone TEXT,
  preferred_pickup_date DATE,
  confirmed_pickup_date DATE,
  pickup_time_slot TEXT,
  sample_collected_at TIMESTAMPTZ,
  sample_received_at TIMESTAMPTZ,
  lab_started_at TIMESTAMPTZ,
  report_generated_at TIMESTAMPTZ,
  report_url TEXT,
  report_file_path TEXT,
  lab_name TEXT DEFAULT 'AgriConnect Certified Central Laboratory',
  structured_results JSONB DEFAULT '{}'::jsonb,
  internal_notes TEXT,
  additional_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create soil_test_status_history audit table
CREATE TABLE IF NOT EXISTS public.soil_test_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soil_test_order_id UUID NOT NULL REFERENCES public.soil_test_orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for fast retrieval and query filtering
CREATE INDEX IF NOT EXISTS idx_soil_orders_user_id ON public.soil_test_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_soil_orders_order_number ON public.soil_test_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_soil_orders_status ON public.soil_test_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_soil_orders_agent ON public.soil_test_orders(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_soil_orders_created_at ON public.soil_test_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_soil_status_history_order_id ON public.soil_test_status_history(soil_test_order_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.soil_test_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_test_status_history ENABLE ROW LEVEL SECURITY;

-- Helper function to check if caller is an admin
CREATE OR REPLACE FUNCTION public.is_soil_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
    AND au.status = 'Active'
  ) OR EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND (
      u.raw_user_meta_data->>'role' IN ('admin', 'super_admin', 'lab_technician')
      OR u.raw_app_meta_data->>'role' IN ('admin', 'super_admin')
    )
  );
$$;

-- Helper function to generate unique non-sequential Order Number
CREATE OR REPLACE FUNCTION public.generate_soil_test_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_random TEXT;
  v_order_num TEXT;
BEGIN
  LOOP
    v_random := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    v_order_num := 'ST-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || v_random;
    IF NOT EXISTS (SELECT 1 FROM public.soil_test_orders WHERE order_number = v_order_num) THEN
      RETURN v_order_num;
    END IF;
  END LOOP;
END;
$$;

-- RLS Policies on soil_test_orders:
-- 1. Farmer can view own orders, assigned agent or admin can view
DROP POLICY IF EXISTS "Farmers view own soil orders" ON public.soil_test_orders;
CREATE POLICY "Farmers view own soil orders"
  ON public.soil_test_orders
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_agent_id = auth.uid()
    OR public.is_soil_admin()
  );

-- 2. Farmer can create own soil order
DROP POLICY IF EXISTS "Farmers insert own soil orders" ON public.soil_test_orders;
CREATE POLICY "Farmers insert own soil orders"
  ON public.soil_test_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- 3. Farmer / Agent / Admin can update relevant order
DROP POLICY IF EXISTS "Authorized users update soil orders" ON public.soil_test_orders;
CREATE POLICY "Authorized users update soil orders"
  ON public.soil_test_orders
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_agent_id = auth.uid()
    OR public.is_soil_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR assigned_agent_id = auth.uid()
    OR public.is_soil_admin()
  );

-- RLS Policies on soil_test_status_history:
DROP POLICY IF EXISTS "View order status history" ON public.soil_test_status_history;
CREATE POLICY "View order status history"
  ON public.soil_test_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.soil_test_orders o
      WHERE o.id = soil_test_status_history.soil_test_order_id
      AND (
        o.user_id = auth.uid()
        OR o.assigned_agent_id = auth.uid()
        OR public.is_soil_admin()
      )
    )
  );

DROP POLICY IF EXISTS "Insert order status history" ON public.soil_test_status_history;
CREATE POLICY "Insert order status history"
  ON public.soil_test_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.soil_test_orders o
      WHERE o.id = soil_test_status_history.soil_test_order_id
      AND (
        o.assigned_agent_id = auth.uid()
        OR public.is_soil_admin()
        OR o.user_id = auth.uid()
      )
    )
  );

-- Storage bucket for soil lab reports (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'soil-reports',
  'soil-reports',
  FALSE,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];

-- Storage bucket RLS policies:
-- Admins/Lab can upload and manage PDF reports
DROP POLICY IF EXISTS "Admin upload soil reports" ON storage.objects;
CREATE POLICY "Admin upload soil reports"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'soil-reports'
    AND public.is_soil_admin()
  );

DROP POLICY IF EXISTS "Admin update soil reports" ON storage.objects;
CREATE POLICY "Admin update soil reports"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'soil-reports'
    AND public.is_soil_admin()
  );

-- Authenticated farmers & agents can read reports for their authorized orders
DROP POLICY IF EXISTS "Authorized read soil reports" ON storage.objects;
CREATE POLICY "Authorized read soil reports"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'soil-reports'
    AND (
      public.is_soil_admin()
      OR EXISTS (
        SELECT 1 FROM public.soil_test_orders o
        WHERE o.report_file_path = name
        AND (o.user_id = auth.uid() OR o.assigned_agent_id = auth.uid())
      )
    )
  );
