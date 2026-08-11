create table user_locations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id),
  latitude double precision not null,
  longitude double precision not null,
  city text,
  district text,
  state text,
  country text,
  pincode text,
  formatted_address text,
  location_source text not null,
  updated_at timestamp with time zone default now()
);

-- Row Level Security
alter table user_locations enable row level security;

create policy "allow select own" on user_locations for select
  using (auth.uid() = user_id);

create policy "allow insert own" on user_locations for insert
  with check (auth.uid() = user_id);

create policy "allow update own" on user_locations for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "allow delete own" on user_locations for delete
  using (auth.uid() = user_id);
