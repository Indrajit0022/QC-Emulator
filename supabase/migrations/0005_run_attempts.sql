-- Transient upstream failures (429 from the shared free-tier pool, provider
-- 5xx, aborted requests) should not permanently fail a run. The worker counts
-- attempts and leaves the run claimable so the next tick retries the same
-- stage, giving up only once the budget is exhausted (MAX_ATTEMPTS in
-- process-run/index.ts).
alter table public.runs
  add column if not exists attempts integer not null default 0;
