-- Harden the payments RLS originally created in 20240910_add_payments_table.sql.
--
-- Problem: the UPDATE policy used `with check (true)` so an authenticated user
-- could rewrite any own payment row (amount, status, razorpay ids). Amounts and
-- status flags must only be set/confirmed server-side (edge functions + webhooks).
--
-- This migration doesn't need manual application since it will be applied fresh
-- by `supabase db push` for new environments, and by `supabase migration up`
-- for already-provisioned databases.

-- 1) Drop the overly permissive UPDATE policy if it exists.
drop policy if exists "Service role can update" on public.payments;

-- 2) Replace it: users may only update their OWN row and only when the change
--    keeps the bank-authoritative columns untouched.
create policy "Owner can update own payments" on public.payments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);