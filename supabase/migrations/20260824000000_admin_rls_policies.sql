-- ============================================================
-- RLS + Security for Admin Tables
-- Only authenticated users with admin role can access admin data.
-- All policies use DROP IF EXISTS for idempotent re-runs.
-- ============================================================

-- Enable RLS on all admin tables
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crash_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
    AND status = 'Active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    JOIN public.admin_roles ar ON au.role_id = ar.id
    WHERE au.user_id = auth.uid()
    AND au.status = 'Active'
    AND ar.name = 'Super Admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── admin_roles: admins can read, super_admins can modify ──
DROP POLICY IF EXISTS "Admins can view roles" ON public.admin_roles;
CREATE POLICY "Admins can view roles"
  ON public.admin_roles FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Super admins can insert roles" ON public.admin_roles;
CREATE POLICY "Super admins can insert roles"
  ON public.admin_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can update roles" ON public.admin_roles;
CREATE POLICY "Super admins can update roles"
  ON public.admin_roles FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

-- ── admin_users: admins can read, super_admins can manage ──
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
CREATE POLICY "Admins can view admin users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Super admins can insert admin users" ON public.admin_users;
CREATE POLICY "Super admins can insert admin users"
  ON public.admin_users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can update admin users" ON public.admin_users;
CREATE POLICY "Super admins can update admin users"
  ON public.admin_users FOR UPDATE
  TO authenticated
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins can delete admin users" ON public.admin_users;
CREATE POLICY "Super admins can delete admin users"
  ON public.admin_users FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- ── subscription_plans: admins can read/write ──
DROP POLICY IF EXISTS "Admins can view subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins can view subscription plans"
  ON public.subscription_plans FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins can insert subscription plans"
  ON public.subscription_plans FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins can update subscription plans"
  ON public.subscription_plans FOR UPDATE
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins can delete subscription plans"
  ON public.subscription_plans FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ── user_subscriptions: admins can read/write ──
DROP POLICY IF EXISTS "Admins can view user subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can view user subscriptions"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert user subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can insert user subscriptions"
  ON public.user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update user subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can update user subscriptions"
  ON public.user_subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ── payments: admins can read ──
DROP POLICY IF EXISTS "Admins can view payments" ON public.payments;
CREATE POLICY "Admins can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── wallets: admins can read ──
DROP POLICY IF EXISTS "Admins can view wallets" ON public.wallets;
CREATE POLICY "Admins can view wallets"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── wallet_transactions: admins can read ──
DROP POLICY IF EXISTS "Admins can view wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view wallet transactions"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── support_tickets: admins can read/write ──
DROP POLICY IF EXISTS "Admins can view support tickets" ON public.support_tickets;
CREATE POLICY "Admins can view support tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update support tickets" ON public.support_tickets;
CREATE POLICY "Admins can update support tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- ── crash_reports: admins can read ──
DROP POLICY IF EXISTS "Admins can view crash reports" ON public.crash_reports;
CREATE POLICY "Admins can view crash reports"
  ON public.crash_reports FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── reports: admins can read ──
DROP POLICY IF EXISTS "Admins can view reports" ON public.reports;
CREATE POLICY "Admins can view reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── audit_logs: admins can read, system/appends via SECURITY DEFINER ──
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── Content tables: admins can read/write ──
DROP POLICY IF EXISTS "Admins can view government schemes" ON public.government_schemes;
CREATE POLICY "Admins can view government schemes"
  ON public.government_schemes FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can manage government schemes" ON public.government_schemes;
CREATE POLICY "Admins can manage government schemes"
  ON public.government_schemes FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view news articles" ON public.news_articles;
CREATE POLICY "Admins can view news articles"
  ON public.news_articles FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can manage news articles" ON public.news_articles;
CREATE POLICY "Admins can manage news articles"
  ON public.news_articles FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Admins can view knowledge articles"
  ON public.knowledge_articles FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can manage knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Admins can manage knowledge articles"
  ON public.knowledge_articles FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view faq entries" ON public.faq_entries;
CREATE POLICY "Admins can view faq entries"
  ON public.faq_entries FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can manage faq entries" ON public.faq_entries;
CREATE POLICY "Admins can manage faq entries"
  ON public.faq_entries FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view ai prompts" ON public.ai_prompts;
CREATE POLICY "Admins can view ai prompts"
  ON public.ai_prompts FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can manage ai prompts" ON public.ai_prompts;
CREATE POLICY "Admins can manage ai prompts"
  ON public.ai_prompts FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view push campaigns" ON public.push_campaigns;
CREATE POLICY "Admins can view push campaigns"
  ON public.push_campaigns FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can manage push campaigns" ON public.push_campaigns;
CREATE POLICY "Admins can manage push campaigns"
  ON public.push_campaigns FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view advertisements" ON public.advertisements;
CREATE POLICY "Admins can view advertisements"
  ON public.advertisements FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can manage advertisements" ON public.advertisements;
CREATE POLICY "Admins can manage advertisements"
  ON public.advertisements FOR ALL TO authenticated USING (public.is_admin());

-- ── profiles: users can read own, admins can read all ──
-- (profiles may already have RLS; this ensures admin access)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin());
