-- ============================================================
-- Jaila Globals — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES — one row per authenticated user (business owner)
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  company_name  text not null default 'Jaila Globals',
  rc_number     text,
  email         text,
  phone         text,
  address       text,
  logo_url      text,
  bank_name     text,
  bank_account  text,
  account_name  text,
  default_vat   numeric(5,2) not null default 7.5,
  default_terms text,
  supa_url      text,  -- stored for reference only
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
create table if not exists public.customers (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  email      text,
  phone      text,
  address    text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INVOICES
-- ============================================================
create type public.invoice_status as enum ('pending', 'paid', 'overdue');

create table if not exists public.invoices (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  customer_id   uuid references public.customers(id) on delete set null,
  invoice_num   text not null,
  invoice_date  date not null default current_date,
  due_date      date,
  status        public.invoice_status not null default 'pending',
  subtotal      numeric(15,2) not null default 0,
  vat_rate      numeric(5,2) not null default 7.5,
  vat_amount    numeric(15,2) not null default 0,
  total         numeric(15,2) not null default 0,
  notes         text,
  -- snapshot of customer details at time of invoice (in case customer record changes)
  customer_name    text not null,
  customer_email   text,
  customer_phone   text,
  customer_address text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- enforce unique invoice numbers per owner
  unique (owner_id, invoice_num)
);

-- ============================================================
-- INVOICE LINE ITEMS
-- ============================================================
create table if not exists public.invoice_items (
  id          uuid primary key default uuid_generate_v4(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity    numeric(10,3) not null default 1,
  unit_price  numeric(15,2) not null default 0,
  total       numeric(15,2) not null default 0,
  sort_order  integer not null default 0
);

-- ============================================================
-- ROW LEVEL SECURITY — owners only see their own data
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.customers   enable row level security;
alter table public.invoices    enable row level security;
alter table public.invoice_items enable row level security;

-- profiles
create policy "Owner can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Owner can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Owner can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- customers
create policy "Owner can manage own customers"
  on public.customers for all using (auth.uid() = owner_id);

-- invoices
create policy "Owner can manage own invoices"
  on public.invoices for all using (auth.uid() = owner_id);

-- invoice items — access via parent invoice's owner
create policy "Owner can manage own invoice items"
  on public.invoice_items for all
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
        and invoices.owner_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE — for logo uploads
-- ============================================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "Owner can upload own logo"
  on storage.objects for insert
  with check (bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view logos"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "Owner can delete own logo"
  on storage.objects for delete
  using (bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- AUTO-CREATE PROFILE on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, company_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'company_name', 'My Business'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- UPDATED_AT auto-update trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_invoices_updated_at
  before update on public.invoices
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index if not exists idx_invoices_owner     on public.invoices(owner_id);
create index if not exists idx_invoices_status    on public.invoices(status);
create index if not exists idx_invoices_date      on public.invoices(invoice_date desc);
create index if not exists idx_customers_owner    on public.customers(owner_id);
create index if not exists idx_items_invoice      on public.invoice_items(invoice_id);

-- ============================================================
-- USEFUL VIEW: invoices with item count and customer info
-- ============================================================
create or replace view public.invoices_summary as
select
  i.*,
  count(ii.id) as item_count
from public.invoices i
left join public.invoice_items ii on ii.invoice_id = i.id
group by i.id;
