-- H-03: rate-limit anonymous request-table inserts at the DB level.
-- The public forms (contact / transport / labor) stay open to anonymous users,
-- but a per-phone trigger throttles spam: max 3 rows per 15 minutes per phone.

-- ── shared throttle helper ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.request_throttle(
  p_table TEXT,
  p_phone TEXT,
  p_max INTEGER DEFAULT 3,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_phone IS NULL OR length(btrim(p_phone)) < 5 THEN
    RETURN; -- not enough to key on; let the caller decide
  END IF;
  EXECUTE format(
    'SELECT count(*) FROM public.%I WHERE phone = %L AND created_at > now() - make_interval(mins => %s)',
    p_table, btrim(p_phone), p_window_minutes
  ) INTO v_count;
  IF v_count >= p_max THEN
    RAISE EXCEPTION 'Too many requests. Please wait % minutes before submitting again.', p_window_minutes
      USING ERRCODE = '23514';
  END IF;
END;
$$;

-- ── per-table before-insert triggers ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.throttle_contact_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.request_throttle('contact_messages', NEW.phone);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.throttle_transport_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.request_throttle('transport_bookings', NEW.phone);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.throttle_labor_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.request_throttle('labor_requests', NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_throttle_contact ON public.contact_messages;
CREATE TRIGGER trg_throttle_contact
  BEFORE INSERT ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.throttle_contact_messages();

DROP TRIGGER IF EXISTS trg_throttle_transport ON public.transport_bookings;
CREATE TRIGGER trg_throttle_transport
  BEFORE INSERT ON public.transport_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.throttle_transport_bookings();

DROP TRIGGER IF EXISTS trg_throttle_labor ON public.labor_requests;
CREATE TRIGGER trg_throttle_labor
  BEFORE INSERT ON public.labor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.throttle_labor_requests();
