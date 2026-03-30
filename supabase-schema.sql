-- Run this in your Supabase SQL editor

-- Daily sessions (one per day)
create table if not exists sessions (
  id uuid default gen_random_uuid() primary key,
  date date not null unique,
  operator_name text not null,
  checkin_time timestamptz not null default now(),
  checkout_time timestamptz,
  status text not null default 'open', -- open | closed
  opening_balances jsonb not null default '{}',
  closing_balances jsonb,
  checksum_passed boolean,
  created_at timestamptz default now()
);

-- Transactions within a session
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade,
  date date not null,
  time timestamptz not null default now(),
  account text not null, -- cash | jazz_retailer | zong_retailer | telenor_retailer | ufone_retailer | jazzcash_business
  type text not null,    -- load | package | withdrawal | send_money | bill_collection | other
  description text,
  amount numeric(12,2) not null,
  direction text not null, -- in | out
  created_at timestamptz default now()
);

-- Bills with due date reminders
create table if not exists bills (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  bill_type text not null, -- wapda | sngpl | ptcl | other
  amount numeric(12,2) not null,
  due_date date not null,
  reminder_sent boolean default false,
  paid boolean default false,
  created_at timestamptz default now()
);

-- App settings (PIN, etc.)
create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Insert default PIN (5858 hashed via app)
-- This is handled by the app on first run
