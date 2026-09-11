-- Mandi price records: real AGMARKNET / data.gov.in synced prices (never fabricated).
-- One row per (state, district, market, commodity, variety, arrival_date).

create table if not exists public.mandi_price_records (
  id uuid primary key default gen_random_uuid(),
  lookup_key text not null,
  resource_id text,
  state text not null,
  district text,
  market text not null,
  commodity text not null,
  variety text,
  arrival_date date not null,
  min_price numeric(12,2),
  max_price numeric(12,2),
  modal_price numeric(12,2) not null check (modal_price > 0),
  unit text default 'Quintal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists mandi_price_records_lookup_key_idx
  on public.mandi_price_records (lookup_key);

create index if not exists mandi_price_records_state_idx
  on public.mandi_price_records (state);
create index if not exists mandi_price_records_district_idx
  on public.mandi_price_records (district);
create index if not exists mandi_price_records_market_idx
  on public.mandi_price_records (market);
create index if not exists mandi_price_records_commodity_idx
  on public.mandi_price_records (commodity);
create index if not exists mandi_price_records_arrival_date_idx
  on public.mandi_price_records (arrival_date desc);

-- Sync log: one row per mandi-prices edge sync run (successes + failures).
create table if not exists public.mandi_sync_log (
  id bigint generated always as identity primary key,
  status text not null check (status in ('success', 'partial', 'error')),
  resource_id text,
  records_fetched integer not null default 0,
  records_upserted integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer
);

create index if not exists mandi_sync_log_started_at_idx
  on public.mandi_sync_log (started_at desc);

-- Only the service role (used by the edge function) may write.
alter table public.mandi_price_records enable row level security;
alter table public.mandi_sync_log enable row level security;

drop policy if exists "mandi_price_records_select" on public.mandi_price_records;
create policy "mandi_price_records_select"
  on public.mandi_price_records for select
  to anon, authenticated
  using (true);

drop policy if exists "mandi_sync_log_select" on public.mandi_sync_log;
create policy "mandi_sync_log_select"
  on public.mandi_sync_log for select
  to anon
  using (true);

drop policy if exists "mandi_sync_log_select_admin" on public.mandi_sync_log;
create policy "mandi_sync_log_select_admin"
  on public.mandi_sync_log for select
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  ));