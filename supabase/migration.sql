-- ================================================================
-- FULL RESET + RECREATE — Safe to run multiple times
-- Run this in Supabase SQL Editor
-- After running this, run seed.sql to insert sample drivers
-- ================================================================

-- Drop tables in reverse dependency order (policies auto-drop with tables)
drop table if exists public.bookings  cascade;
drop table if exists public.guests    cascade;
drop table if exists public.events    cascade;
drop table if exists public.drivers   cascade;
drop table if exists public.profiles  cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ================================================================
-- 1. PROFILES
-- ================================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null check (role in ('organizer', 'agent')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;

create policy "profiles: own read"
on public.profiles
for select
using (true);

create policy "profiles: own insert"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles: own update"
on public.profiles
for update
using (auth.uid() = id);

-- ================================================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger on auth.users)
-- Reads full_name & role from user_metadata set during signUp()
-- ================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'organizer')
  );
  return new;
end;
$$;

-- Drop the trigger first if it already exists (safe re-run)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ================================================================
-- 2. DRIVERS (preloaded via seed.sql)
-- ================================================================
create table public.drivers (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  mobile     text not null unique,
  car_number text not null unique,
  car_type   text not null check (car_type in ('Hatchback', 'Sedan', 'SUV')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.drivers enable row level security;

create policy "drivers: auth read"
  on public.drivers for select
  using (auth.uid() is not null);

-- ================================================================
-- 3. EVENTS
-- ================================================================
create table public.events (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  date         date not null,
  organizer_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.events enable row level security;

create index idx_events_organizer_id on public.events(organizer_id);

create policy "events: organizer manage" on public.events
  for all using (auth.uid() = organizer_id);
create policy "events: agent read all" on public.events
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'agent')
  );

-- ================================================================
-- 4. GUESTS
-- ================================================================
create table public.guests (
  id               uuid primary key default uuid_generate_v4(),
  event_id         uuid not null references public.events(id) on delete cascade,
  name             text not null,
  arrival_datetime timestamptz,
  pickup_location  text not null,
  drop_location    text not null,
  return_required  boolean default false,
  car_preference   text not null check (car_preference in ('Hatchback', 'Sedan', 'SUV')),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table public.guests enable row level security;

create index idx_guests_event_id on public.guests(event_id);

create policy "guests: organizer manage" on public.guests
  for all using (
    exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid())
  );
create policy "guests: agent read" on public.guests
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'agent')
  );

-- ================================================================
-- 5. BOOKINGS
-- ================================================================
create table public.bookings (
  id          uuid primary key default uuid_generate_v4(),
  guest_id    uuid not null unique references public.guests(id) on delete cascade,
  event_id    uuid not null references public.events(id) on delete cascade,
  driver_id   uuid references public.drivers(id),
  status      text not null default 'Pending'
                check (status in ('Pending', 'Assigned', 'Accepted', 'Rejected')),
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.bookings enable row level security;

create index idx_bookings_guest_id  on public.bookings(guest_id);
create index idx_bookings_event_id  on public.bookings(event_id);
create index idx_bookings_driver_id on public.bookings(driver_id);

create policy "bookings: agent insert" on public.bookings
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'agent')
  );
create policy "bookings: agent update" on public.bookings
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'agent')
  );
create policy "bookings: organizer read" on public.bookings
  for select using (
    exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid())
  );
create policy "bookings: organizer update status" on public.bookings
  for update using (
    exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid())
  );
create policy "bookings: agent read" on public.bookings
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'agent')
  );
