-- ── Agricultural Machinery marketplace: equipment photo storage bucket ────────
-- Machinery listings accept photos (JPG/PNG/WebP). Photos are stored in a PRIVATE
-- bucket scoped to the owner's folder and referenced from the listing.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'equipment-images',
  'equipment-images',
  FALSE,
  8388608, -- 8MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Equipment owners upload only into their own folder (first path segment = auth uid).
DROP POLICY IF EXISTS "equipment-images: users upload own" ON storage.objects;
CREATE POLICY "equipment-images: users upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'equipment-images'
    AND (storage.foldername(name))[1] = (auth.uid())::TEXT
    AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
  );

-- Owners read their own photos; admins can read all.
DROP POLICY IF EXISTS "equipment-images: users read own" ON storage.objects;
CREATE POLICY "equipment-images: users read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'equipment-images'
    AND (owner_id = (auth.uid())::TEXT OR public.is_admin())
  );

-- Owners delete their own photos; admins can manage all.
DROP POLICY IF EXISTS "equipment-images: users delete own" ON storage.objects;
CREATE POLICY "equipment-images: users delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'equipment-images'
    AND (owner_id = (auth.uid())::TEXT OR public.is_admin())
  );

DROP POLICY IF EXISTS "equipment-images: admins manage" ON storage.objects;
CREATE POLICY "equipment-images: admins manage" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'equipment-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'equipment-images' AND public.is_admin());