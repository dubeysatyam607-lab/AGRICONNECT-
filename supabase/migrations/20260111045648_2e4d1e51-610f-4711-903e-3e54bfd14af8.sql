-- Phase 1: Critical RLS Fixes

-- 1. Fix profiles table: Restrict SELECT to only own profile
-- Users should only see their own profile data (contains PII)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Create a security definer function to safely get seller info for cattle listings
-- This prevents exposing phone numbers and other PII
CREATE OR REPLACE FUNCTION public.get_seller_display_name(seller_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(full_name, 'Seller') FROM public.profiles WHERE id = seller_user_id;
$$;

-- 2. Fix push_subscriptions: Remove NULL user bypass and require authentication
-- Make user_id NOT NULL to prevent anonymous subscriptions
ALTER TABLE public.push_subscriptions 
  ALTER COLUMN user_id SET NOT NULL;

DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can manage their own subscriptions" 
ON public.push_subscriptions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);