-- ============================================================
-- Security hardening migration
-- 1) payments RLS: close open INSERT, prevent user_id hijack on
--    UPDATE, and use the real is_admin() helper instead of a
--    non-existent JWT `role` claim.
-- 2) cattle_listings: any authenticated user could insert rows
--    with seller_id = NULL, forging platform-seeded listings.
-- ============================================================

-- ── 1) payments ─────────────────────────────────────────────
-- Insert: only the service role (server) may insert.
drop policy if exists "Service role can insert" on public.payments;
create policy "Service role can insert" on public.payments
  for insert with check (auth.role() = 'service_role');

-- Update: owner may only update their OWN row (WITH CHECK must
-- lock user_id to auth.uid() so a user cannot hijack a row by
-- rewriting user_id to their own id).
drop policy if exists "Service role can update" on public.payments;
create policy "Service role can update" on public.payments
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admin select-all: rely on the real is_admin() helper.
drop policy if exists "Admin can select all" on public.payments;
create policy "Admin can select all" on public.payments
  for select using (public.is_admin());

-- ── 2) cattle_listings ──────────────────────────────────────
-- Require the seller to be the authenticated user. Platform-seeded
-- rows are inserted by the migration/service role, which bypasses
-- RLS, so the `seller_id IS NULL` escape hatch is not needed.
drop policy if exists "Authenticated users can create listings" on public.cattle_listings;
create policy "Authenticated users can create listings" on public.cattle_listings
  for insert with check (auth.uid() = seller_id);

-- ── 3) cattle-images storage: enforce per-user folders + type/size ──
-- Any authenticated user could previously upload into ANY folder
-- (including other users' folders) with any file type.
drop policy if exists "Authenticated users can upload cattle images" on storage.objects;
create policy "Authenticated users can upload cattle images" on storage.objects
  for insert
  with check (
    bucket_id = 'cattle-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and octet_length(metadata ->> 'size')::int <= 5 * 1024 * 1024
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- ── 4) store-images storage: server-side type/size limits ─────
drop policy if exists "Admins can upload store images" on storage.objects;
create policy "Admins can upload store images" on storage.objects
  for insert
  with check (
    bucket_id = 'store-images'
    and public.is_admin()
    and octet_length(metadata ->> 'size')::int <= 5 * 1024 * 1024
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );