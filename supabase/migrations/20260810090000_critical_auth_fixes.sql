-- Critical security fixes from red-team audit 2026-08-10.
-- C-01: block self role-escalation on profiles UPDATE.
-- C-02: never accept 'admin' from signup metadata; role changes via service_role only.
-- C-03: profiles SELECT restricted to self + admins.

-- ── C-01: guard role changes on UPDATE ──────────────────────────────────────
-- Any signed-in user could previously set their own role='admin' because the
-- UPDATE policy only scoped WHICH row (USING) without constraining column values.
-- This trigger rejects role changes unless performed by an admin or service_role.

CREATE OR REPLACE FUNCTION public.guard_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
      RAISE EXCEPTION 'Changing role requires admin privileges';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_guard_role ON public.profiles;
CREATE TRIGGER trg_profiles_guard_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_role_change();

-- ── C-02: never trust signup metadata for privileged roles ─────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meta_role TEXT := lower(coalesce(new.raw_user_meta_data ->> 'role', ''));
BEGIN
  -- Only allow unprivileged roles from metadata; 'admin' is grant-only via RPC.
  IF v_meta_role NOT IN ('farmer', 'owner', 'buyer') THEN
    v_meta_role := 'farmer';
  END IF;
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    v_meta_role
  );
  RETURN new;
END;
$$;

-- ── C-03: profiles SELECT = self only (admins via separate policy) ─────────
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
