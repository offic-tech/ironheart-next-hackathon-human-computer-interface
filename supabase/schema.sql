-- Starter schema for OYA billing and Stripe integration.
-- Apply manually in Supabase SQL editor or via Supabase CLI after linking the project.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_bots (
  id uuid primary key default gen_random_uuid(),
  attendee_bot_id text unique,
  meeting_url text,
  voice_agent_url text,
  status text,
  customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.meeting_bots enable row level security;
alter table public.stripe_events enable row level security;
