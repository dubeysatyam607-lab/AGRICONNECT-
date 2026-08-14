-- CORRECTIVE MIGRATION: user_locations
--
-- The 20260811110000 migration created user_locations with columns
-- (source, village, accuracy). The frontend (LocationContext.tsx) writes a
-- payload containing BOTH village+accuracy AND location_source, so the table
-- must expose every column the app references. This migration is idempotent:
-- it works whether or not the table already exists and never errors on a
-- fresh `supabase db push` (no bare CREATE TABLE, no uuid-ossp dependency).

-- Ensure the table exists with the canonical schema.
create table if not exists public.user_locations (
  id                bigserial primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  latitude          numeric,
  longitude         numeric,
  country           text,
  state             text,
  district          text,
  city              text,
  village           text,
  pincode           text,
  accuracy          numeric,
  source            text not null default 'manual',
  location_source   text not null default 'manual',
  formatted_address text,
  is_default        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Add any columns a partial schema may be missing (safe on both fresh + live).
alter table public.user_locations add column if not exists village text;
alter table public.user_locations add column if not exists accuracy numeric;
alter table public.user_locations add column if not exists source text not null default 'manual';
alter table public.user_locations add column if not exists location_source text not null default 'manual';
alter table public.user_locations add column if not exists formatted_address text;
alter table public.user_locations add column if not exists is_default boolean not null default false;

-- Row Level Security
alter table public.user_locations enable row level security;

drop policy if exists "user_locations_select_own" on public.user_locations;
drop policy if exists "user_locations_insert_own" on public.user_locations;
drop policy if exists "user_locations_update_own" on public.user_locations;
drop policy if exists "user_locations_delete_own" on public.user_locations;
drop policy if exists "allow select own" on public.user_locations;
drop policy if exists "allow insert own" on public.user_locations;
drop policy if exists "allow update own" on public.user_locations;
drop policy if exists "allow delete own" on public.user_locations;

create policy "user_locations_select_own" on public.user_locations
  for select using (auth.uid() = user_id);
create policy "user_locations_insert_own" on public.user_locations
  for insert with check (auth.uid() = user_id);
create policy "user_locations_update_own" on public.user_locations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_locations_delete_own" on public.user_locations
  for delete using (auth.uid() = user_id);

create index if not exists idx_user_locations_user on public.user_locations (user_id);
create index if not exists idx_user_locations_default on public.user_locations (user_id, is_default);