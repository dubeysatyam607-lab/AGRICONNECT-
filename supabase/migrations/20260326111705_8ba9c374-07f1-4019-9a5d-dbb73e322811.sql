-- Fix log_audit_event trigger: profiles table uses 'id' not 'user_id'
-- This was crashing signup with "record new has no field user_id"

CREATE OR REPLACE FUNCTION public.log_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'profiles' THEN
      _user_id := COALESCE(auth.uid(), OLD.id);
    ELSIF TG_TABLE_NAME = 'cattle_listings' THEN
      _user_id := COALESCE(auth.uid(), OLD.seller_id);
    ELSE
      _user_id := COALESCE(auth.uid(), OLD.user_id);
    END IF;
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (_user_id, 'DELETE', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
    RETURN OLD;
  ELSE
    IF TG_TABLE_NAME = 'profiles' THEN
      _user_id := COALESCE(auth.uid(), NEW.id);
    ELSIF TG_TABLE_NAME = 'cattle_listings' THEN
      _user_id := COALESCE(auth.uid(), NEW.seller_id);
    ELSE
      _user_id := COALESCE(auth.uid(), NEW.user_id);
    END IF;
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
      VALUES (_user_id, 'INSERT', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
      VALUES (_user_id, 'UPDATE', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  END IF;
END;
$function$;

DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_price_alerts ON public.price_alerts;
CREATE TRIGGER audit_price_alerts
  AFTER INSERT OR UPDATE OR DELETE ON public.price_alerts
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_cattle_listings ON public.cattle_listings;
CREATE TRIGGER audit_cattle_listings
  AFTER INSERT OR UPDATE OR DELETE ON public.cattle_listings
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();