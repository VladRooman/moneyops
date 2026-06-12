create extension if not exists pgcrypto;

alter table if exists budget_settings drop column if exists monthly_income;

create table if not exists budget_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  required_savings numeric(12, 2) not null,
  currency text not null default 'RON',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists income_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  amount numeric(12, 2) not null,
  category text not null,
  source_name text not null,
  note text not null,
  income_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null,
  category text not null,
  note text not null,
  transaction_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists fixed_costs (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  amount numeric(12, 2) not null,
  due_day smallint not null check (due_day between 1 and 31),
  category text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  target_amount numeric(12, 2),
  current_amount numeric(12, 2) not null default 0,
  monthly_contribution numeric(12, 2) not null default 0,
  priority smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists purchase_checks (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  item_name text not null,
  price numeric(12, 2) not null,
  category text not null,
  result text not null check (result in ('recommended', 'caution', 'not recommended')),
  daily_limit_before numeric(12, 2) not null,
  daily_limit_after numeric(12, 2) not null,
  recommendation text not null,
  created_at timestamptz not null default now()
);

create index if not exists budget_settings_owner_idx on budget_settings(owner_id);
create index if not exists income_entries_owner_date_idx on income_entries(owner_id, income_date desc, created_at desc);
create index if not exists transactions_owner_date_idx on transactions(owner_id, transaction_date desc, created_at desc);
create index if not exists fixed_costs_owner_idx on fixed_costs(owner_id, due_day);
create index if not exists goals_owner_idx on goals(owner_id, priority);
create index if not exists purchase_checks_owner_idx on purchase_checks(owner_id, created_at desc);

insert into budget_settings (id, owner_id, required_savings, currency)
values ('11111111-1111-1111-1111-111111111111', 'vlad', 500, 'RON')
on conflict (id) do nothing;

insert into fixed_costs (id, owner_id, name, amount, due_day, category, is_active)
values
  ('22222222-2222-2222-2222-222222222221', 'vlad', 'CAR', 600, 5, 'Transport', true),
  ('22222222-2222-2222-2222-222222222222', 'vlad', 'Fuel estimate', 900, 12, 'Transport', true),
  ('22222222-2222-2222-2222-222222222223', 'vlad', 'ChatGPT + Apple Music', 47, 18, 'Software', true),
  ('22222222-2222-2222-2222-222222222224', 'vlad', 'Car repair', 500, 27, 'Transport', true)
on conflict (id) do nothing;

insert into goals (id, owner_id, name, target_amount, current_amount, monthly_contribution, priority, is_active)
values
  ('33333333-3333-3333-3333-333333333331', 'vlad', 'Corfu accommodation', 1100, 0, 0, 1, true),
  ('33333333-3333-3333-3333-333333333332', 'vlad', 'Corfu flight', 600, 0, 0, 2, true),
  ('33333333-3333-3333-3333-333333333333', 'vlad', 'Emergency fund', null, 0, 0, 3, false),
  ('33333333-3333-3333-3333-333333333334', 'vlad', 'Investments', null, 0, 0, 4, false)
on conflict (id) do nothing;
