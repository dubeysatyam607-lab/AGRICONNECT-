-- ── PHASE 1 · RLS recursion fix for profiles ─────────────────────────────────
-- The old owner-or-admin SELECT policy used an unqualified subquery on
-- profiles (EXISTS ... FROM profiles p WHERE p.role='Admin'), which self-referenced
-- the policy and caused infinite-recursion errors (42P17) for anon/non-owner
-- reads. Replace with the canonical, recursion-safe is_admin() helper.
BEGIN;

DROP POLICY IF EXISTS "Public profiles are viewable by owner or admins" ON public.profiles;

CREATE POLICY "Public profiles are viewable by owner or admins"
  ON public.profiles
  FOR SELECT TO public
  USING (
    (auth.uid() = id)
    OR (auth.role() = 'service_role'::text)
    OR public.is_admin()
  );

COMMIT;