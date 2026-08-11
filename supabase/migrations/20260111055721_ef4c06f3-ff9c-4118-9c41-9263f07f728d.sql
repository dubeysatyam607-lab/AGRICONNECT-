-- Create a function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (
      COALESCE(auth.uid(), NEW.user_id, NEW.seller_id, NEW.id),
      'INSERT',
      TG_TABLE_NAME,
      NEW.id::text,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      COALESCE(auth.uid(), NEW.user_id, NEW.seller_id, NEW.id),
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id::text,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (
      COALESCE(auth.uid(), OLD.user_id, OLD.seller_id, OLD.id),
      'DELETE',
      TG_TABLE_NAME,
      OLD.id::text,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for price_alerts table
CREATE TRIGGER audit_price_alerts
AFTER INSERT OR UPDATE OR DELETE ON public.price_alerts
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Create trigger for profiles table
CREATE TRIGGER audit_profiles
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Create trigger for cattle_listings table
CREATE TRIGGER audit_cattle_listings
AFTER INSERT OR UPDATE OR DELETE ON public.cattle_listings
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- Create trigger for push_subscriptions table
CREATE TRIGGER audit_push_subscriptions
AFTER INSERT OR UPDATE OR DELETE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();