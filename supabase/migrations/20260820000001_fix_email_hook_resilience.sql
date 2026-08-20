-- Bulletproof Postgres function for Supabase Auth send_email hook.
-- Wraps HTTP dispatch in an EXCEPTION block so email transport glitches never
-- block user registration, login, or password reset transactions.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.handle_send_email(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net
AS $$
DECLARE
  _edge_url text := 'https://yrebxnpilkfeaofykvhq.supabase.co/functions/v1/send-auth-email';
BEGIN
  BEGIN
    -- Fire HTTP POST to the edge function via pg_net if event is provided
    IF event IS NOT NULL THEN
      PERFORM net.http_post(
        url := _edge_url,
        body := event::text,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-internal-source', 'pg_net'
        ),
        timeout_milliseconds := 5000
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log warning without throwing error so auth flow is never blocked
    RAISE WARNING 'handle_send_email failed safely: %', SQLERRM;
  END;

  -- Return empty JSON object to signify success to Supabase Auth
  RETURN jsonb_build_object();
END;
$$;

-- Grant execution permissions to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.handle_send_email(jsonb) TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT USAGE ON SCHEMA net TO supabase_auth_admin;
