-- Forecaster chat and memory: saved inputs, forecasts, chat messages and recollections.
-- Every row belongs to one auth user and only that user can read or write it.

create table public.forecast_inputs (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  input jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.forecasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Day of the forecast in Asia/Seoul. Change this in the dashboard to simulate "the next day".
  forecast_date date not null,
  input jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);

create index forecasts_user_date_idx on public.forecasts (user_id, forecast_date desc, created_at desc);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  forecast_id uuid not null references public.forecasts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  kind text not null default 'chat' check (kind in ('chat', 'recall_question')),
  created_at timestamptz not null default clock_timestamp()
);

create index chat_messages_forecast_idx on public.chat_messages (forecast_id, created_at);

-- What the user confided when the forecaster asked how an earlier forecast turned out.
create table public.recollections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  forecast_id uuid not null references public.forecasts (id) on delete cascade,
  about_date date not null,
  about_grade text not null,
  answer text not null,
  -- Day of the answer in Asia/Seoul.
  answered_on date not null,
  created_at timestamptz not null default clock_timestamp()
);

create index recollections_user_idx on public.recollections (user_id, answered_on desc, created_at desc);

alter table public.forecast_inputs enable row level security;
alter table public.forecasts enable row level security;
alter table public.chat_messages enable row level security;
alter table public.recollections enable row level security;

create policy "Owners manage their inputs" on public.forecast_inputs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners manage their forecasts" on public.forecasts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners manage their chat messages" on public.chat_messages
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners manage their recollections" on public.recollections
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.forecast_inputs, public.forecasts, public.chat_messages, public.recollections from anon;
grant select, insert, update, delete
  on public.forecast_inputs, public.forecasts, public.chat_messages, public.recollections
  to authenticated;
