-- Schedules the background worker.
--
-- IMPORTANT — fill in the two placeholders below before running this migration:
--   <PROJECT_REF>          e.g. abcxyzproject  (from your Supabase project URL)
--   <SERVICE_ROLE_KEY>     Settings -> API -> service_role key (NEVER expose this client-side)
--
-- pg_net and pg_cron are both available on the free tier as Postgres extensions.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store the service key in Vault rather than inline in a cron job definition,
-- so it doesn't sit in plain text in pg_cron.job / logs.
select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');

-- Un-schedule a previous version of this job if this migration is re-run.
select cron.unschedule(jobid)
from cron.job
where jobname = 'process-run-tick';

-- Every 10 seconds, ask the Edge Function to process one stage of one run.
-- (If your pg_cron version doesn't support second-level intervals, use
-- '* * * * *' for a 1-minute cadence instead — still meets "continues
-- processing even if the browser is closed," just slower to update.)
select cron.schedule(
  'process-run-tick',
  '10 seconds',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/process-run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
