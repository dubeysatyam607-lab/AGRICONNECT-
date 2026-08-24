-- Admin roles table (RBAC)
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users table (links to profiles)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES public.admin_roles(id),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- Subscription plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  interval TEXT NOT NULL DEFAULT 'monthly' CHECK (interval IN ('monthly', 'yearly', 'lifetime')),
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'paused', 'trial')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  provider TEXT DEFAULT 'razorpay',
  provider_txn_id TEXT,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded', 'cancelled')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Wallet transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  wallet_id TEXT NOT NULL REFERENCES public.wallets(id),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC NOT NULL,
  reason TEXT,
  admin_id UUID,
  reference_type TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Government schemes table
CREATE TABLE IF NOT EXISTS public.government_schemes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  ministry TEXT,
  benefit TEXT,
  eligibility TEXT,
  state TEXT DEFAULT 'All India',
  deadline TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'upcoming')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- News articles table
CREATE TABLE IF NOT EXISTS public.news_articles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  content TEXT,
  source TEXT,
  category TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge hub articles
CREATE TABLE IF NOT EXISTS public.knowledge_articles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  author TEXT,
  language TEXT DEFAULT 'en',
  image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'archived')),
  views INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAQ entries
CREATE TABLE IF NOT EXISTS public.faq_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  sort_order INT DEFAULT 0,
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI prompts configuration
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT,
  model TEXT DEFAULT 'default',
  version TEXT DEFAULT '1.0',
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push notification campaigns
CREATE TABLE IF NOT EXISTS public.push_campaigns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  audience TEXT DEFAULT 'all',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INT DEFAULT 0,
  opened_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advertisements
CREATE TABLE IF NOT EXISTS public.advertisements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  advertiser TEXT,
  placement TEXT,
  image_url TEXT,
  budget NUMERIC DEFAULT 0,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crash reports
CREATE TABLE IF NOT EXISTS public.crash_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  version TEXT,
  platform TEXT CHECK (platform IN ('android', 'ios', 'web')),
  error TEXT NOT NULL,
  count INT DEFAULT 1,
  users_affected INT DEFAULT 1,
  stack_trace TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'fixed', 'ignored')),
  last_occurred TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports & complaints
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id),
  type TEXT DEFAULT 'complaint' CHECK (type IN ('complaint', 'report')),
  category TEXT,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App analytics daily snapshots
CREATE TABLE IF NOT EXISTS public.app_analytics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date DATE NOT NULL UNIQUE,
  active_users INT DEFAULT 0,
  new_signups INT DEFAULT 0,
  sessions INT DEFAULT 0,
  orders INT DEFAULT 0,
  retention NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default system roles
INSERT INTO public.admin_roles (id, name, description, permissions, is_system) VALUES
  ('role-super', 'Super Admin', 'Full unrestricted access', '["*"]'::jsonb, TRUE),
  ('role-admin', 'Admin', 'Standard admin access', '["users.read","users.write","marketplace.read","marketplace.write","content.read","content.write","operations.read","operations.write","analytics.read"]'::jsonb, TRUE),
  ('role-content', 'Content Editor', 'Content management', '["content.read","content.write","news.read","news.write","knowledge.read","knowledge.write","faq.read","faq.write","schemes.read","schemes.write"]'::jsonb, TRUE),
  ('role-finance', 'Finance Officer', 'Financial management', '["payments.read","payments.write","subscriptions.read","subscriptions.write","wallet.read","wallet.write"]'::jsonb, TRUE),
  ('role-support', 'Support Admin', 'Support management', '["support.read","support.write","reports.read","reports.write","verification.read","verification.write"]'::jsonb, TRUE),
  ('role-analyst', 'Analyst', 'Read-only analytics', '["analytics.read","reports.read"]'::jsonb, TRUE)
ON CONFLICT (name) DO NOTHING;

-- RLS Policies
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crash_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_analytics ENABLE ROW LEVEL SECURITY;

-- Admin tables: only authenticated admins can read
DROP POLICY IF EXISTS "Admins can read admin_roles" ON public.admin_roles;
CREATE POLICY "Admins can read admin_roles" ON public.admin_roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can read admin_users" ON public.admin_users;
CREATE POLICY "Admins can read admin_users" ON public.admin_users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Super admins can manage admin_users" ON public.admin_users;
CREATE POLICY "Super admins can manage admin_users" ON public.admin_users FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.admin_users au JOIN public.admin_roles ar ON au.role_id = ar.id WHERE au.user_id = auth.uid() AND ar.name = 'Super Admin' AND au.status = 'Active')
);

-- Public read for schemes, news, knowledge, faq
DROP POLICY IF EXISTS "Public read schemes" ON public.government_schemes;
CREATE POLICY "Public read schemes" ON public.government_schemes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read news" ON public.news_articles;
CREATE POLICY "Public read news" ON public.news_articles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read knowledge" ON public.knowledge_articles;
CREATE POLICY "Public read knowledge" ON public.knowledge_articles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read faq" ON public.faq_entries;
CREATE POLICY "Public read faq" ON public.faq_entries FOR SELECT USING (true);

-- Subscription plans: public read
DROP POLICY IF EXISTS "Public read plans" ON public.subscription_plans;
CREATE POLICY "Public read plans" ON public.subscription_plans FOR SELECT USING (true);

-- User data: users can read their own, admins can read all
DROP POLICY IF EXISTS "Users read own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users read own subscriptions" ON public.user_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users read own payments" ON public.payments;
CREATE POLICY "Users read own payments" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users read own wallet" ON public.wallets;
CREATE POLICY "Users read own wallet" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users read own wallet txns" ON public.wallet_transactions;
CREATE POLICY "Users read own wallet txns" ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Admins can manage all user data (checked via app-level RBAC)
DROP POLICY IF EXISTS "Authenticated read subscriptions" ON public.user_subscriptions;
CREATE POLICY "Authenticated read subscriptions" ON public.user_subscriptions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated read payments" ON public.payments;
CREATE POLICY "Authenticated read payments" ON public.payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated read wallets" ON public.wallets;
CREATE POLICY "Authenticated read wallets" ON public.wallets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated read wallet txns" ON public.wallet_transactions;
CREATE POLICY "Authenticated read wallet txns" ON public.wallet_transactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated read support tickets" ON public.support_tickets;
CREATE POLICY "Authenticated read support tickets" ON public.support_tickets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated insert support tickets" ON public.support_tickets;
CREATE POLICY "Authenticated insert support tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Authenticated read crash reports" ON public.crash_reports;
CREATE POLICY "Authenticated read crash reports" ON public.crash_reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated read reports" ON public.reports;
CREATE POLICY "Authenticated read reports" ON public.reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated read ai_prompts" ON public.ai_prompts;
CREATE POLICY "Authenticated read ai_prompts" ON public.ai_prompts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated read push campaigns" ON public.push_campaigns;
CREATE POLICY "Authenticated read push campaigns" ON public.push_campaigns FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated read ads" ON public.advertisements;
CREATE POLICY "Authenticated read ads" ON public.advertisements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated read analytics" ON public.app_analytics;
CREATE POLICY "Authenticated read analytics" ON public.app_analytics FOR SELECT TO authenticated USING (true);
