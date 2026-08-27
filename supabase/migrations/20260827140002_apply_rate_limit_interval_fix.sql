-- ==============================================================================
-- 20260827140002_apply_rate_limit_interval_fix.sql
-- Applies the corrected `rate_limit_check` to databases that already ran the
-- broken 140000/140001 versions. Body mirrors 20260827140001 (correct
-- `make_interval(secs => ...)` + `ON CONFLICT (identifier, endpoint)`).
-- ==============================================================================

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
  v_window interval := make_interval(secs => p_window_ms::double precision / 1000.0);
BEGIN
  v_window_start := v_now - v_window;

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

  v_reset_at := v_record.window_start + v_window;

  RETURN jsonb_build_object(
    'allowed', v_record.request_count <= p_max_requests,
    'remaining', greatest(0, p_max_requests - v_record.request_count),
    'reset_at', to_char(v_reset_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_check(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_check(text, text, integer, integer) TO service_role;