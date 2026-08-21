-- ====================================================================
-- AgriConnect — Google OAuth Onboarding, Profile Fields & Legal Compliance
-- Migration: 20260822000000_google_onboarding_and_compliance.sql
-- ====================================================================

-- 1. Extend profiles table with dedicated onboarding, agricultural, and legal compliance columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cookies_preferences JSONB DEFAULT '{"essential": true, "analytics": false, "preferences": true, "marketing": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS village TEXT,
  ADD COLUMN IF NOT EXISTS farm_location TEXT,
  ADD COLUMN IF NOT EXISTS primary_crop TEXT,
  ADD COLUMN IF NOT EXISTS farm_size NUMERIC,
  ADD COLUMN IF NOT EXISTS irrigation_type TEXT,
  ADD COLUMN IF NOT EXISTS soil_type TEXT,
  ADD COLUMN IF NOT EXISTS farming_experience TEXT,
  ADD COLUMN IF NOT EXISTS alternate_phone TEXT,
  ADD COLUMN IF NOT EXISTS additional_crops TEXT[] DEFAULT '{}'::text[];

-- 2. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON public.profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_state_district ON public.profiles(state, district);

-- 3. Update handle_new_user() trigger function to safely capture Google OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_avatar_url TEXT;
  v_email TEXT;
  v_phone TEXT;
BEGIN
  -- Extract Google/OAuth or password signup metadata
  v_full_name := COALESCE(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'user_name',
    ''
  );
  v_avatar_url := COALESCE(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture',
    ''
  );
  v_email := COALESCE(new.email, new.raw_user_meta_data ->> 'email', '');
  v_phone := COALESCE(new.raw_user_meta_data ->> 'phone', new.phone, '');

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    avatar_url,
    onboarding_completed,
    role,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    v_email,
    v_full_name,
    v_phone,
    v_avatar_url,
    false,
    'farmer',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    avatar_url = CASE WHEN public.profiles.avatar_url IS NULL OR public.profiles.avatar_url = '' THEN EXCLUDED.avatar_url ELSE public.profiles.avatar_url END,
    updated_at = now();

  RETURN new;
END;
$$;

-- 4. Ensure RLS policies are locked down
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile or admins to view profiles
DROP POLICY IF EXISTS "Public profiles are viewable by owner or admins" ON public.profiles;
CREATE POLICY "Public profiles are viewable by owner or admins"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Admin'));

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to update only their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
