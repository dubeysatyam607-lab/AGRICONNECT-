-- ==============================================================================
-- 20260827100000_search_path_hardening.sql
-- Pin `search_path` on every SECURITY DEFINER function in the public schema
-- that lacks it (function-hijacking hardening). Idempotent.
-- ==============================================================================

DO $$
DECLARE
  r RECORD;
  v_done INT := 0;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef = true
      AND n.nspname = 'public'
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM unnest(p.proconfig) AS cfg WHERE cfg LIKE 'search_path=%'
        )
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public',
      'public', r.proname, pg_get_function_identity_arguments(r.oid)
    );
    v_done := v_done + 1;
  END LOOP;
  RAISE NOTICE 'Search-path pinned on % SECURITY DEFINER functions.', v_done;
END;
$$;