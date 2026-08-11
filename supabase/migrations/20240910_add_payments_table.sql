-- Migration: add payments table and RLS policies
-- Place this file in supabase/migrations/20240910_add_payments_table.sql

create table public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  order_id uuid,
  razorpay_order_id text not null,
  razorpay_payment_id text,
  razorpay_signature text,
  amount_cents integer not null,
  currency text default 'INR' not null,
  status text not null,
  payment_method text,
  product_type text,
  product_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index payments_user_id_idx on payments(user_id);
create index payments_razorpay_order_id_idx on payments(razorpay_order_id);
create index payments_status_idx on payments(status);

-- Row Level Security policies
alter table public.payments enable row level security;

-- Users can select their own rows
create policy "Allow select own payments" on public.payments for select using (auth.uid() = user_id);

-- Service role can insert and update (backend)
create policy "Service role can insert" on public.payments for insert with check (true);
create policy "Service role can update" on public.payments for update using (auth.uid() = user_id) with check (true);

-- Admin role (if exists) can select all
-- Assuming a role claim `role = 'admin'` is set in JWT
create policy "Admin can select all" on public.payments for select using (auth.jwt()->>'role' = 'admin');

-- Ensure RLS is active
alter table public.payments force row level security;
