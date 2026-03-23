-- ================================================================
-- FULL RESET + RECREATE — Safe to run multiple times
-- Run this in Supabase SQL Editor
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
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: own insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);

-- ================================================================
-- 2. DRIVERS (preloaded)
-- ================================================================
create table public.drivers (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  mobile     text not null,
  car_number text not null,
  car_type   text not null check (car_type in ('Hatchback', 'Sedan', 'SUV')),
  created_at timestamptz default now()
);
alter table public.drivers enable row level security;
create policy "drivers: auth read" on public.drivers for select using (auth.role() = 'authenticated');

-- ================================================================
-- 3. EVENTS
-- ================================================================
create table public.events (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  date         date not null,
  organizer_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz default now()
);
alter table public.events enable row level security;
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
  created_at       timestamptz default now()
);
alter table public.guests enable row level security;
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
  status      text not null default 'Assigned'
                check (status in ('Pending', 'Assigned', 'Accepted', 'Rejected')),
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.bookings enable row level security;
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

-- ================================================================
-- 6. SEED: 20 DRIVERS
-- ================================================================
insert into public.drivers (name, mobile, car_number, car_type) values
  ('Ramesh Kumar',   '9876543210', 'KA01AB1234', 'Sedan'),
  ('Suresh Patel',   '9876543211', 'KA02CD5678', 'SUV'),
  ('Vijay Singh',    '9876543212', 'KA03EF9012', 'Hatchback'),
  ('Anil Sharma',    '9876543213', 'MH04GH3456', 'Sedan'),
  ('Deepak Verma',   '9876543214', 'MH05IJ7890', 'SUV'),
  ('Manoj Gupta',    '9876543215', 'DL06KL1234', 'Hatchback'),
  ('Pradeep Yadav',  '9876543216', 'DL07MN5678', 'Sedan'),
  ('Sanjay Tiwari',  '9876543217', 'UP08OP9012', 'SUV'),
  ('Ashok Nair',     '9876543218', 'TN09QR3456', 'Hatchback'),
  ('Ravi Pillai',    '9876543219', 'TN10ST7890', 'Sedan'),
  ('Mohan Das',      '9876543220', 'KL11UV1234', 'SUV'),
  ('Biju Thomas',    '9876543221', 'KL12WX5678', 'Hatchback'),
  ('Kiran Reddy',    '9876543222', 'AP13YZ9012', 'Sedan'),
  ('Srinivas Rao',   '9876543223', 'AP14AB3456', 'SUV'),
  ('Ganesh Iyer',    '9876543224', 'GJ15CD7890', 'Hatchback'),
  ('Harish Mehta',   '9876543225', 'GJ16EF1234', 'Sedan'),
  ('Naresh Joshi',   '9876543226', 'RJ17GH5678', 'SUV'),
  ('Dinesh Rawat',   '9876543227', 'RJ18IJ9012', 'Hatchback'),
  ('Mahesh Pandey',  '9876543228', 'MP19KL3456', 'Sedan'),
  ('Rakesh Dubey',   '9876543229', 'MP20MN7890', 'SUV');
