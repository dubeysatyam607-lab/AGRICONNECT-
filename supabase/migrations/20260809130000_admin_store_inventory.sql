-- Admin-managed AgriStore inventory.
-- 1. Extend store_inventory with brand / batch / pricing / stock fields.
-- 2. Restrict writes to admins (is_admin()); the public may only read.
-- 3. New store-images bucket with admin-only upload + public read.

-- ── 1. Extend store_inventory ──────────────────────────────────────────────
ALTER TABLE public.store_inventory
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS batch_no TEXT,
  ADD COLUMN IF NOT EXISTS mrp NUMERIC,
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 2. RLS: public may read, only admins may write ─────────────────────────
-- The old policy let any signed-in user insert. Products are curated by admins.
DROP POLICY IF EXISTS "store_inventory_user_insert" ON public.store_inventory;
DROP POLICY IF EXISTS "store_inventory_admin_insert" ON public.store_inventory;
DROP POLICY IF EXISTS "store_inventory_admin_update" ON public.store_inventory;
DROP POLICY IF EXISTS "store_inventory_admin_delete" ON public.store_inventory;

DROP POLICY IF EXISTS "store_inventory_public_select" ON public.store_inventory;
CREATE POLICY "store_inventory_public_select" ON public.store_inventory
  FOR SELECT USING (true);

CREATE POLICY "store_inventory_admin_insert" ON public.store_inventory
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "store_inventory_admin_update" ON public.store_inventory
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "store_inventory_admin_delete" ON public.store_inventory
  FOR DELETE USING (public.is_admin());

-- ── 3. store-images bucket ─────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view store images" ON storage.objects;
CREATE POLICY "Anyone can view store images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-images');

DROP POLICY IF EXISTS "Admins can upload store images" ON storage.objects;
CREATE POLICY "Admins can upload store images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'store-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update store images" ON storage.objects;
CREATE POLICY "Admins can update store images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'store-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete store images" ON storage.objects;
CREATE POLICY "Admins can delete store images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'store-images' AND public.is_admin());
