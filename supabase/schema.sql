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

-- ===========================================================================
-- Beds, per-room meter readings, and rent billing (additive migration)
-- ===========================================================================

alter table public.rooms add column if not exists monthly_rent numeric(10,2);

create table if not exists public.beds (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  room_id uuid references public.rooms(id) on delete cascade,
  bed_label text not null,
  status text not null default 'vacant' check (status in ('vacant', 'occupied', 'reserved', 'maintenance')),
  created_at timestamptz not null default now()
);

create index if not exists idx_beds_owner_room on public.beds(owner_id, room_id);

alter table public.occupancy_logs add column if not exists bed_id uuid references public.beds(id);

create table if not exists public.room_meter_readings (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  room_id uuid references public.rooms(id) on delete cascade,
  occupancy_log_id uuid references public.occupancy_logs(id) on delete set null,
  reading_value numeric not null,
  reading_type text not null check (reading_type in ('checkin', 'checkout', 'month_end')),
  reading_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_room_meter_readings_owner_room_date on public.room_meter_readings(owner_id, room_id, reading_date);

create table if not exists public.rent_charges (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  room_id uuid references public.rooms(id) on delete cascade,
  charge_month date not null,
  total_rent numeric(10,2) not null,
  occupant_count int not null,
  per_tenant_amount numeric(10,2) not null,
  created_at timestamptz not null default now(),
  unique (owner_id, room_id, charge_month)
);

create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  rent_charge_id uuid references public.rent_charges(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  paid_amount numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'partial', 'paid')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_rent_charges_owner_room_month on public.rent_charges(owner_id, room_id, charge_month);
create index if not exists idx_rent_payments_owner_charge on public.rent_payments(owner_id, rent_charge_id);
create index if not exists idx_rent_payments_owner_tenant on public.rent_payments(owner_id, tenant_id);

-- ===========================================================================
-- Owner settings, tenant applications, and vacancy requests (additive migration)
-- ===========================================================================

create table if not exists public.owner_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null unique default 'owner',
  vacancy_notice_days int not null default 30,
  guest_policy_text text,
  apply_slug text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_applications (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  full_name text not null,
  phone text,
  email text,
  desired_room_id uuid references public.rooms(id) on delete set null,
  desired_check_in date,
  id_proof text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_applications_owner_status on public.tenant_applications(owner_id, status);

create table if not exists public.vacancy_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  tenant_id uuid references public.tenants(id) on delete cascade,
  occupancy_log_id uuid references public.occupancy_logs(id) on delete cascade,
  requested_vacate_date date not null,
  notice_given_date date not null default current_date,
  notice_days_required int not null,
  advance_refund_eligible boolean not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_vacancy_requests_owner_status on public.vacancy_requests(owner_id, status);

-- ===========================================================================
-- Guest requests, licenses, and payment proofs (additive migration)
-- ===========================================================================

create table if not exists public.guest_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  tenant_id uuid references public.tenants(id) on delete cascade,
  guest_name text not null,
  guest_phone text,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  charge_amount numeric(10,2),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_guest_requests_owner_status on public.guest_requests(owner_id, status);

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null default 'owner',
  license_name text not null,
  expiry_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_licenses_owner_expiry on public.licenses(owner_id, expiry_date);

alter table public.payments add column if not exists proof_url text;
alter table public.payments add column if not exists proof_uploaded_by text check (proof_uploaded_by in ('owner', 'tenant'));
alter table public.rent_payments add column if not exists proof_url text;
alter table public.rent_payments add column if not exists proof_uploaded_by text check (proof_uploaded_by in ('owner', 'tenant'));

-- NOTE: also create a PRIVATE Supabase Storage bucket named "payment-proofs"
-- (Dashboard -> Storage -> New bucket -> name: payment-proofs, public: OFF).
-- Payment proof images are uploaded there by the app.
