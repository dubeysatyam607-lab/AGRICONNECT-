-- Security hardening: fix tractor_bookings RLS (owner-only) and lock
-- storage uploads to the uploader's own folder.

-- ===== tractor_bookings =====
-- Previous policies leaked any authenticated user's bookings because the
-- SELECT policy used `auth.uid() IS NULL OR ...` and the INSERT policy never
-- required user_id to match the authenticated caller. Bookmarks/saveBooking
-- now always writes user_id server-side (see tractor-hire edge function), so
-- we can safely scope both policies to the row owner.

DROP POLICY IF EXISTS "Users view own tractor bookings" ON public.tractor_bookings;
CREATE POLICY "Users view own tractor bookings"
ON public.tractor_bookings FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create tractor bookings" ON public.tractor_bookings;
CREATE POLICY "Users create tractor bookings"
ON public.tractor_bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ===== storage: cattle-images =====
-- The INSERT policy only required an authenticated role, so any signed-in
-- user could upload objects into other users' folders. The client always
-- uploads to `{userId}/...` (see useImageUpload), so lock INSERT to the
-- uploader's own folder to match the existing UPDATE/DELETE policies.

DROP POLICY IF EXISTS "Authenticated users can upload cattle images" ON storage.objects;
CREATE POLICY "Users can upload cattle images to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'cattle-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ===== rate_limits =====
-- Replace the read-then-write rate limiter (racy + fail-open) with an atomic
-- upsert. Two concurrent requests used to both SELECT (empty), both INSERT,
-- and the unique-violation error fell through to a fail-open "allowed: true"
-- branch. This function increments the counter in one statement so abuse
-- can never slip through the race, and the edge function now fails closed.

CREATE OR REPLACE FUNCTION public.rate_limit_check(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_ms INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_record public.rate_limits%ROWTYPE;
  v_now timestamptz := now();
  v_reset_at timestamptz;
BEGIN
  v_window_start := v_now - make_interval(msecs => p_window_ms);

  INSERT INTO public.rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, v_now)
  ON CONFLICT (identifier, endpoint)
  DO UPDATE SET
    request_count = CASE
      WHEN public.rate_limits.window_start < v_window_start THEN 1
      ELSE public.rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN public.rate_limits.window_start < v_window_start THEN v_now
      ELSE public.rate_limits.window_start
    END
  RETURNING * INTO v_record;

  v_reset_at := v_record.window_start + make_interval(msecs => p_window_ms);

  RETURN jsonb_build_object(
    'allowed', v_record.request_count <= p_max_requests,
    'remaining', greatest(0, p_max_requests - v_record.request_count),
    'reset_at', to_char(v_reset_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_check(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_check(text, text, integer, integer) TO service_role;
