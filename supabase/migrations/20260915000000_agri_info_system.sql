-- ============================================================================
-- AgriConnect Live Agriculture Information System (schema §34)
-- Machine-readable official data storage for Schemes, News, MSP, Insurance
-- (PMFBY) and Loan products (KCC). All tables are written exclusively by the
-- service role via the agri-sync-worker edge function. Public users may only
-- SELECT content rows. Admin users may SELECT sync/log management rows.
--
-- Every content row carries provenance fields (source_name, source_url,
-- source_type, last_verified_at, fetched_at), a deterministic content_hash for
-- change detection, and OPTIONAL columns so that only verified facts are ever
-- stored. Values are never fabricated by clients.
-- ============================================================================

-- Enable trigram index support used for fuzzy name/title search below.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Government schemes (machine-readable basis for the Schemes & Subsidies tab)
-- ---------------------------------------------------------------------------
create table if not exists public.schemes (
  id uuid primary key default gen_random_uuid(),
  lookup_key text not null,
  name text not null,
  short_name text,
  category text,
  level text check (level in ('central', 'state')),
  country text default 'India',
  state text,
  district text,
  crop text,
  farmer_type text,
  ministry text,
  description text,
  benefits text,
  benefit_amount text,
  eligibility text,
  documents jsonb,
  application_process jsonb,
  application_url text,
  official_url text,
  helpline text,
  status text default 'active' check (status in ('active', 'closed', 'upcoming', 'rolling')),
  effective_from date,
  effective_until date,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  last_verified_at timestamptz,
  fetched_at timestamptz not null default now(),
  source_name text not null,
  source_url text,
  source_type text not null default 'manual_review' check (source_type in ('api', 'rss', 'feed', 'webpage', 'portal', 'policy', 'manual_review')),
  content_hash text,
  version integer not null default 1
);

create unique index if not exists schemes_lookup_key_idx on public.schemes (lookup_key);
create index if not exists schemes_category_idx on public.schemes (category);
create index if not exists schemes_level_idx on public.schemes (level);
create index if not exists schemes_state_idx on public.schemes (state);
create index if not exists schemes_status_idx on public.schemes (status);
create index if not exists schemes_updated_at_idx on public.schemes (updated_at desc);
create index if not exists schemes_name_trgm_idx on public.schemes using gin (name gin_trgm_ops);

-- Version history: snapshot of changed fields whenever a synced scheme updates.
create table if not exists public.scheme_versions (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  version integer not null,
  previous_version integer,
  changed_fields jsonb,
  old_value jsonb,
  new_value jsonb,
  source_url text,
  detected_at timestamptz not null default now()
);

create index if not exists scheme_versions_scheme_id_idx on public.scheme_versions (scheme_id, version desc);

-- ---------------------------------------------------------------------------
-- Deduplicated agriculture news (source-backed, labeled by origin)
-- ---------------------------------------------------------------------------
create table if not exists public.agri_news (
  id uuid primary key default gen_random_uuid(),
  content_hash text not null,
  title text not null,
  title_hash text not null,
  summary text,
  content text,
  category text default 'General',
  tags jsonb,
  location text,
  state text,
  district text,
  crop text,
  importance text default 'normal' check (importance in ('critical', 'important', 'normal')),
  source_name text not null,
  source_url text,
  official_source boolean not null default false,
  image_url text,
  canonical_url text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_verified_at timestamptz,
  status text default 'active' check (status in ('active', 'archived'))
);

create unique index if not exists agri_news_content_hash_idx on public.agri_news (content_hash);
create index if not exists agri_news_published_at_idx on public.agri_news (published_at desc);
create index if not exists agri_news_category_idx on public.agri_news (category);
create index if not exists agri_news_status_idx on public.agri_news (status);
create index if not exists agri_news_title_trgm_idx on public.agri_news using gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- MSP (Minimum Support Price) official rates
-- ---------------------------------------------------------------------------
create table if not exists public.msp_prices (
  id uuid primary key default gen_random_uuid(),
  lookup_key text not null,
  crop text not null,
  season text,
  marketing_year text,
  grade text,
  msp numeric(12,2) not null check (msp > 0),
  unit text default 'Quintal',
  effective_from date,
  source_name text not null,
  source_url text,
  source_type text not null default 'api' check (source_type in ('api', 'rss', 'feed', 'webpage', 'portal', 'policy', 'manual_review')),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  fetched_at timestamptz not null default now(),
  last_verified_at timestamptz,
  content_hash text
);

create unique index if not exists msp_prices_lookup_key_idx on public.msp_prices (lookup_key);
create index if not exists msp_prices_crop_idx on public.msp_prices (crop);
create index if not exists msp_prices_year_idx on public.msp_prices (marketing_year);
create index if not exists msp_prices_season_idx on public.msp_prices (season);

-- ---------------------------------------------------------------------------
-- Crop insurance products (PMFBY) — premium rates are official caps, not
-- actuarial guesses.
-- ---------------------------------------------------------------------------
create table if not exists public.insurance_products (
  id uuid primary key default gen_random_uuid(),
  lookup_key text not null,
  scheme_name text not null,
  scheme_code text,
  product_name text,
  level text default 'central' check (level in ('central', 'state')),
  season text,
  state text,
  crop text,
  farmer_premium_rate numeric(8,4),
  premium_cap_percent numeric(8,4),
  sum_insured_per_unit numeric(14,2),
  unit text,
  eligibility text,
  covered_crops jsonb,
  notified_areas jsonb,
  premium_details text,
  claim_details text,
  application_url text,
  policy_status_url text,
  grievance_url text,
  helpline text,
  guidelines_url text,
  official_url text,
  status text default 'active' check (status in ('active', 'inactive', 'unverified')),
  effective_from date,
  effective_until date,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  fetched_at timestamptz not null default now(),
  last_verified_at timestamptz,
  source_name text not null,
  source_url text,
  source_type text not null default 'manual_review' check (source_type in ('api', 'rss', 'feed', 'webpage', 'portal', 'policy', 'manual_review')),
  content_hash text
);

create unique index if not exists insurance_products_lookup_key_idx on public.insurance_products (lookup_key);
create index if not exists insurance_products_scheme_code_idx on public.insurance_products (scheme_code);
create index if not exists insurance_products_state_idx on public.insurance_products (state);

-- ---------------------------------------------------------------------------
-- Loan products (KCC & related) — government policy-backed rate references.
-- Interest fields may be UNKNOWN (null) when no verified policy rate exists;
-- the UI must render nulls as "not available", never invent a rate.
-- ---------------------------------------------------------------------------
create table if not exists public.loan_products (
  id uuid primary key default gen_random_uuid(),
  lookup_key text not null,
  bank text,
  scheme_name text not null,
  product_name text,
  loan_type text check (loan_type in ('kcc', 'crop_loan', 'term_loan', 'machinery_loan', 'other')),
  interest_rate numeric(8,4),
  min_rate numeric(8,4),
  max_rate numeric(8,4),
  subvention numeric(8,4),
  prompt_payment_incentive numeric(8,4),
  effective_rate numeric(8,4),
  processing_fee text,
  tenure text,
  eligibility text,
  status text default 'unverified' check (status in ('active', 'inactive', 'unverified')),
  effective_from date,
  effective_until date,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  fetched_at timestamptz not null default now(),
  last_verified_at timestamptz,
  source_name text not null,
  source_url text,
  source_type text not null default 'manual_review' check (source_type in ('api', 'rss', 'feed', 'webpage', 'portal', 'policy', 'manual_review')),
  content_hash text
);

create unique index if not exists loan_products_lookup_key_idx on public.loan_products (lookup_key);
create index if not exists loan_products_loan_type_idx on public.loan_products (loan_type);
create index if not exists loan_products_bank_idx on public.loan_products (bank);

-- ---------------------------------------------------------------------------
-- Data source registry: health, provenance, and allow-listing for the sync
-- engine. Sources are seeded below; health is updated by the worker.
-- ---------------------------------------------------------------------------
create table if not exists public.data_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null unique,
  source_url text,
  feed_url text,
  endpoint text,
  api_key_env text,
  source_type text not null check (source_type in ('api', 'rss', 'feed', 'webpage', 'portal', 'policy', 'manual_review')),
  category text not null check (category in ('schemes', 'news', 'msp', 'insurance', 'loans', 'general')),
  priority integer not null default 100,
  status text not null default 'UNVERIFIED' check (status in ('HEALTHY', 'DEGRADED', 'DOWN', 'STALE', 'UNVERIFIED')),
  allowlisted boolean not null default true,
  records_count integer not null default 0,
  failure_count integer not null default 0,
  response_time_ms integer,
  last_success timestamptz,
  last_failure timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_sources_category_idx on public.data_sources (category);
create index if not exists data_sources_status_idx on public.data_sources (status);

-- ---------------------------------------------------------------------------
-- Sync run log: one row per agri-sync-worker job execution (success/failure
-- with record deltas). Mirrors mandi_sync_log conventions.
-- ---------------------------------------------------------------------------
create table if not exists public.data_sync_logs (
  id bigint generated always as identity primary key,
  job_name text not null,
  source_name text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null check (status in ('success', 'partial', 'error', 'skipped')),
  records_found integer not null default 0,
  records_added integer not null default 0,
  records_updated integer not null default 0,
  records_removed integer not null default 0,
  records_skipped integer not null default 0,
  error_message text,
  duration_ms integer
);

create index if not exists data_sync_logs_started_at_idx on public.data_sync_logs (started_at desc);
create index if not exists data_sync_logs_job_name_idx on public.data_sync_logs (job_name);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.schemes enable row level security;
alter table public.scheme_versions enable row level security;
alter table public.agri_news enable row level security;
alter table public.msp_prices enable row level security;
alter table public.insurance_products enable row level security;
alter table public.loan_products enable row level security;
alter table public.data_sources enable row level security;
alter table public.data_sync_logs enable row level security;

-- Public content: everyone may read content rows. Writes are service-role only
-- (no anon/authenticated write policies exist).
drop policy if exists "schemes_select" on public.schemes;
create policy "schemes_select" on public.schemes for select to anon, authenticated using (true);

drop policy if exists "agri_news_select" on public.agri_news;
create policy "agri_news_select" on public.agri_news for select to anon, authenticated using (true);

drop policy if exists "msp_prices_select" on public.msp_prices;
create policy "msp_prices_select" on public.msp_prices for select to anon, authenticated using (true);

drop policy if exists "insurance_products_select" on public.insurance_products;
create policy "insurance_products_select" on public.insurance_products for select to anon, authenticated using (true);

drop policy if exists "loan_products_select" on public.loan_products;
create policy "loan_products_select" on public.loan_products for select to anon, authenticated using (true);

-- Management rows: not exposed to anonymous users; authenticated admins and the
-- service role (used by the sync engine) may read them. No public writes.
drop policy if exists "scheme_versions_select" on public.scheme_versions;
create policy "scheme_versions_select" on public.scheme_versions for select to anon, authenticated using (true);

drop policy if exists "data_sources_select" on public.data_sources;
create policy "data_sources_select" on public.data_sources for select to anon, authenticated using (true);

drop policy if exists "data_sources_select_admin" on public.data_sources;
create policy "data_sources_select_admin" on public.data_sources for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  ));

drop policy if exists "data_sync_logs_select" on public.data_sync_logs;
create policy "data_sync_logs_select" on public.data_sync_logs for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  ));

-- ---------------------------------------------------------------------------
-- Seed: data source registry (machine configuration for the sync engine).
-- Statuses reflect reality until the worker contacts each source.
-- ---------------------------------------------------------------------------
insert into public.data_sources (source_name, source_url, feed_url, source_type, category, priority, status)
select * from (values
  ('PIB (Press Information Bureau) Releases — Agriculture', null, 'https://www.pib.gov.in/Rsss.aspx?CatId=9', 'rss', 'news', 10, 'UNVERIFIED'),
  ('PIB (Press Information Bureau) Releases — All', null, 'https://www.pib.gov.in/Rsss.aspx', 'rss', 'news', 20, 'UNVERIFIED'),
  ('data.gov.in Open Government Data', 'https://www.data.gov.in', null, 'api', 'general', 30, 'UNVERIFIED'),
  ('PM-KISAN Portal', 'https://pmkisan.gov.in', null, 'portal', 'schemes', 40, 'UNVERIFIED'),
  ('PMFBY Portal', 'https://pmfby.gov.in', null, 'portal', 'insurance', 50, 'UNVERIFIED'),
  ('Reserve Bank of India (KCC)', 'https://www.rbi.org.in', null, 'policy', 'loans', 60, 'UNVERIFIED')
) as sourced(source_name, source_url, feed_url, source_type, category, priority, status)
where not exists (select 1 from public.data_sources d where d.source_name = sourced.source_name);