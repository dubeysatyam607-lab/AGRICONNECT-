-- ── Crop Scan AI: private storage bucket for scanned crop images ─────────────
-- Phase 6 (AI Crop Scan). Images are compressed client-side, uploaded to a
-- PRIVATE bucket scoped to the owner's folder, and analyzed server-side. The
-- edge function stores a short-lived signed URL for the user's own history.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crop-scan-images',
  'crop-scan-images',
  FALSE,
  8388608, -- 8MB (compressed payloads are ~<500KB)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Users may upload only into their own folder (first path segment = auth uid).
DROP POLICY IF EXISTS "crop-scan-images: users upload own" ON storage.objects;
CREATE POLICY "crop-scan-images: users upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'crop-scan-images'
    AND (storage.foldername(name))[1] = (auth.uid())::TEXT
    AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
  );

-- Users read their own scans; admins can read all.
DROP POLICY IF EXISTS "crop-scan-images: users read own" ON storage.objects;
CREATE POLICY "crop-scan-images: users read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'crop-scan-images'
    AND (owner_id = (auth.uid())::TEXT OR public.is_admin())
  );

-- Users delete their own scans; admins can manage all.
DROP POLICY IF EXISTS "crop-scan-images: users delete own" ON storage.objects;
CREATE POLICY "crop-scan-images: users delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'crop-scan-images'
    AND (owner_id = (auth.uid())::TEXT OR public.is_admin())
  );

DROP POLICY IF EXISTS "crop-scan-images: admins manage" ON storage.objects;
CREATE POLICY "crop-scan-images: admins manage" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'crop-scan-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'crop-scan-images' AND public.is_admin());
