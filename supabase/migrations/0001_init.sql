-- Call Evaluation System: core schema
-- Run against a fresh Supabase project with `supabase db push` or via the SQL editor.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- runs: one row per evaluation. Public can insert + read (no auth in scope).
-- Only the backend (service role, from the Edge Function) may update.
-- ---------------------------------------------------------------------------
create table if not exists public.runs (
  id                 uuid primary key default gen_random_uuid(),
  call_type          text not null check (call_type in ('kickoff', 'coaching')),
  status             text not null default 'queued'
                       check (status in ('queued', 'processing', 'completed', 'failed')),
  processing_stage   text not null default 'created'
                       check (processing_stage in (
                         'created',
                         'loading_rubric',
                         'processing_transcript',
                         'extracting_evidence',
                         'scoring_dimensions',
                         'applying_rules',
                         'building_report',
                         'completed'
                       )),
  transcript         text not null,
  model              text,                    -- OpenRouter model id actually used
  total_score        numeric,
  max_score          numeric,
  grade              text,
  report             jsonb,                   -- { one_thing, brief, red_flags[], evidence_coverage, ... }
  error              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  processing_started_at   timestamptz,
  processing_completed_at timestamptz
);

create index if not exists runs_status_idx on public.runs (status, created_at);

-- ---------------------------------------------------------------------------
-- evaluation_dimensions: one row per scored dimension per run.
-- ---------------------------------------------------------------------------
create table if not exists public.evaluation_dimensions (
  id             uuid primary key default gen_random_uuid(),
  run_id         uuid not null references public.runs (id) on delete cascade,
  dimension_key  text not null,
  dimension_name text not null,
  score          numeric,
  max_score      numeric not null,
  reasoning      text,
  evidence       jsonb not null default '[]'::jsonb,  -- [{speaker, quote, valid}]
  quick_fix      text,
  is_applicable  boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (run_id, dimension_key)
);

-- ---------------------------------------------------------------------------
-- keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists runs_set_updated_at on public.runs;
create trigger runs_set_updated_at
  before update on public.runs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Atomic "claim next run" for the step-machine worker.
-- FOR UPDATE SKIP LOCKED means two overlapping cron ticks never grab the same run.
-- ---------------------------------------------------------------------------
create or replace function public.claim_next_run()
returns public.runs
language plpgsql
as $$
declare
  claimed public.runs;
begin
  select * into claimed
  from public.runs
  where status in ('queued', 'processing')
  order by created_at asc
  for update skip locked
  limit 1;

  if claimed.id is not null then
    update public.runs
    set status = 'processing',
        processing_started_at = coalesce(processing_started_at, now())
    where id = claimed.id
    returning * into claimed;
  end if;

  return claimed;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Anonymous clients: can create a run and read any run (URL = the access control,
-- per PRD: "the URL can be shared with another person").
-- Only service_role (used by the Edge Function) can update.
-- ---------------------------------------------------------------------------
alter table public.runs enable row level security;
alter table public.evaluation_dimensions enable row level security;

create policy "anyone can insert a run"
  on public.runs for insert
  to anon
  with check (true);

create policy "anyone can read a run"
  on public.runs for select
  to anon
  using (true);

create policy "anyone can read dimensions"
  on public.evaluation_dimensions for select
  to anon
  using (true);

-- no insert/update/delete policies for anon on either table beyond the above ->
-- writes to status/report/dimensions only happen via the service-role key,
-- which bypasses RLS entirely inside the Edge Function.

-- ---------------------------------------------------------------------------
-- Realtime: let the frontend subscribe to a run's status instead of polling.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.runs;
