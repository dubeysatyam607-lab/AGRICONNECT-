-- Postgres function for Supabase Auth send_email hook.
-- Calls the deployed send-auth-email edge function via pg_net to send branded
-- OTP / magic-link emails through Gmail SMTP, then returns NULL to suppress
-- Supabase's built-in email.
--
-- Prerequisites:
--   1. CREATE EXTENSION IF NOT EXISTS pg_net;
--   2. The send-auth-email edge function must be deployed.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.handle_send_email(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _edge_url text := 'https://yrebxnpilkfeaofykvhq.supabase.co/functions/v1/send-auth-email';
BEGIN
  -- Fire-and-forget HTTP POST to the edge function via pg_net.
  -- The x-internal-source header tells the edge function to skip webhook
  -- secret verification (this is a trusted internal call from the database).
  PERFORM net.http_post(
    _edge_url,
    event::text,
    jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-source', 'pg_net'
    ),
    10000
  );

  -- Return NULL to suppress Supabase's built-in email (we send our own)
  RETURN NULL;
END;
$$;

-- Grant execution to supabase_auth_admin (Supabase Auth calls this function)
GRANT EXECUTE ON FUNCTION public.handle_send_email(jsonb) TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
