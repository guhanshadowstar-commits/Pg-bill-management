create extension if not exists "pgcrypto";

create table if not exists public.owner_accounts (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  email text,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  room_number text not null,
  sharing_type int not null,
  meter_number text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  full_name text not null,
  phone text,
  payment_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.occupancy_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  room_id uuid not null references public.rooms(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  check_in date not null,
  check_out date,
  created_at timestamptz not null default now()
);

create table if not exists public.electricity_bills (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  room_id uuid not null references public.rooms(id) on delete cascade,
  bill_month date not null,
  total_amount numeric(12,2) not null,
  total_person_days int not null,
  per_person_day_cost numeric(12,4) not null,
  created_at timestamptz not null default now(),
  unique (room_id, bill_month)
);

create table if not exists public.bill_splits (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  bill_id uuid not null references public.electricity_bills(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  days_stayed int not null,
  amount numeric(12,2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  bill_split_id uuid not null references public.bill_splits(id) on delete cascade,
  paid_amount numeric(12,2) not null,
  payment_date date not null default current_date,
  status text not null default 'pending',
  method text,
  txn_ref text,
  created_at timestamptz not null default now()
);

alter table public.rooms drop constraint if exists rooms_room_number_key;

alter table public.rooms add column if not exists owner_id text not null default 'owner';
alter table public.tenants add column if not exists owner_id text not null default 'owner';
alter table public.occupancy_logs add column if not exists owner_id text not null default 'owner';
alter table public.electricity_bills add column if not exists owner_id text not null default 'owner';
alter table public.bill_splits add column if not exists owner_id text not null default 'owner';
alter table public.payments add column if not exists owner_id text not null default 'owner';

create unique index if not exists idx_rooms_owner_room_number on public.rooms(owner_id, room_number);
create index if not exists idx_rooms_owner_id on public.rooms(owner_id);
create index if not exists idx_tenants_owner_id on public.tenants(owner_id);
create index if not exists idx_occupancy_logs_owner_id on public.occupancy_logs(owner_id);
create index if not exists idx_electricity_bills_owner_id on public.electricity_bills(owner_id);
create index if not exists idx_bill_splits_owner_id on public.bill_splits(owner_id);
create index if not exists idx_payments_owner_id on public.payments(owner_id);
create index if not exists idx_occupancy_logs_room_id on public.occupancy_logs(room_id);
create index if not exists idx_occupancy_logs_tenant_id on public.occupancy_logs(tenant_id);
create index if not exists idx_occupancy_logs_check_in on public.occupancy_logs(check_in);
create index if not exists idx_occupancy_logs_check_out on public.occupancy_logs(check_out);
create index if not exists idx_electricity_bills_bill_month on public.electricity_bills(bill_month);
create index if not exists idx_bill_splits_bill_id on public.bill_splits(bill_id);
create index if not exists idx_payments_bill_split_id on public.payments(bill_split_id);
create index if not exists idx_owner_accounts_username on public.owner_accounts(username);
