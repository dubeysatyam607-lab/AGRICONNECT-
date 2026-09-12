-- ── PHASE 1 · Foundation hardening ───────────────────────────────────────────
-- Audit-driven, idempotent. No data changes, no table drops (every table is
-- referenced by the app — no duplicates confirmed removable). Adds:
--   1. created_at / updated_at columns where missing
--   2. Automatic updated_at triggers on every table that has updated_at
--   3. Missing indexes on frequently-queried / FK columns
--   4. Safe CHECK constraints (NOT VALID: enforce forwards, never break legacy)
--   5. RLS gap fixes (owner DELETE for user_notifications)
--
-- Policy audit result: all 55 public tables already have RLS enabled with
-- owner-scoped USING/CHECK (payments, wallets, ledger, AI chats, soil orders,
-- marketplaces verified). Only the notification-delete gap is repaired here.

BEGIN;

-- ── 1. created_at columns ───────────────────────────────────────────────────
ALTER TABLE public.contact_messages  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.laborers          ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.livestock         ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.payment_config    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.storage_facilities ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.transport_bookings ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.transport_vehicles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.wallet_limits     ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- ── 2. updated_at columns (editable/business tables only — append-only logs  ─
-- ──    keep created_at-only semantics by design)                            ──
ALTER TABLE public.ai_messages              ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.labor_requests           ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.laborers                 ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.livestock                ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.price_alerts             ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.push_subscriptions       ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.soil_test_labs           ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.storage_facilities       ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.store_inventory          ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.tractor_bookings         ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.tractor_listings         ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.tractor_reviews          ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.transport_bookings       ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.transport_vehicles       ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.user_notifications       ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.wallet_admin_adjustments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Existing rows quickly touch the new column so nothing reports updated_at = null.
UPDATE public.ai_messages              SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.labor_requests           SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.laborers                 SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.livestock                SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.price_alerts             SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.push_subscriptions       SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.soil_test_labs           SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.storage_facilities       SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.store_inventory          SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.tractor_bookings         SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.tractor_listings         SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.tractor_reviews          SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.transport_bookings       SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.transport_vehicles       SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.user_notifications       SET updated_at = now() WHERE updated_at IS NULL;
UPDATE public.wallet_admin_adjustments SET updated_at = now() WHERE updated_at IS NULL;

-- ── 3. Automatic updated_at triggers (reuses existing function) ─────────────
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
    WHERE c.column_name = 'updated_at'
      AND c.table_schema = 'public'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_trigger tr
        JOIN pg_class cl ON cl.oid = tr.tgrelid
        JOIN pg_namespace n ON n.oid = cl.relnamespace
        WHERE cl.relname = c.table_name AND n.nspname = 'public'
          AND tr.tgname LIKE '%updated_at%'
          AND NOT tr.tgisinternal
      )
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trig_%I_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      t, t
    );
  END LOOP;
END $$;

-- ── 4. Missing indexes for frequently-queried / FK columns ──────────────────
CREATE INDEX IF NOT EXISTS idx_cattle_listings_seller   ON public.cattle_listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_cattle_listings_active_created ON public.cattle_listings (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user         ON public.price_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_active  ON public.price_alerts (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_push_subs_user            ON public.push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_pw_user_created ON public.push_subscriptions (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tractor_listings_owner    ON public.tractor_listings (owner_id);
CREATE INDEX IF NOT EXISTS idx_tractor_listings_status   ON public.tractor_listings (status);
CREATE INDEX IF NOT EXISTS idx_tractor_bookings_user_created ON public.tractor_bookings (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read   ON public.user_notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_user_created     ON public.payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_labor_requests_created    ON public.labor_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_laborers_created          ON public.laborers (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_livestock_created         ON public.livestock (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created  ON public.contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transport_bookings_created ON public.transport_bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_created ON public.transport_vehicles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_facilities_created ON public.storage_facilities (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_user_created   ON public.wallet_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_admin_adjust_user  ON public.wallet_admin_adjustments (user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_user_subs_status          ON public.user_subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user      ON public.support_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_created     ON public.news_articles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gov_schemes_status      ON public.government_schemes (status);
CREATE INDEX IF NOT EXISTS idx_store_inventory_seller    ON public.store_inventory (seller_id);
CREATE INDEX IF NOT EXISTS idx_soil_test_orders_user_created ON public.soil_test_orders (user_id, created_at DESC);

-- ── 5. Safe CHECK constraints (NOT VALID → enforce forwards only) ───────────
DO $$ BEGIN
  ALTER TABLE public.cattle_listings ADD CONSTRAINT cattle_listings_price_nonneg CHECK (price >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.wallets ADD CONSTRAINT wallets_balance_nonneg CHECK (balance >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_txn_amount_nonneg CHECK (amount >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.soil_test_orders ADD CONSTRAINT soil_orders_total_nonneg CHECK (total_amount >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.mandi_price_records ADD CONSTRAINT mandi_min_nonneg CHECK (min_price >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.mandi_price_records ADD CONSTRAINT mandi_max_nonneg CHECK (max_price >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.mandi_price_records ADD CONSTRAINT mandi_modal_nonneg CHECK (modal_price >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.price_alerts ADD CONSTRAINT price_alerts_target_nonneg CHECK (target_price >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 6. RLS repair: owners may delete their own notifications ────────────────
DROP POLICY IF EXISTS "user_notifications_delete_own" ON public.user_notifications;
CREATE POLICY "user_notifications_delete_own"
  ON public.user_notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

COMMIT;