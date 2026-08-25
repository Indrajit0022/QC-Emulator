-- Schedules the background worker.
--
-- Before running this migration, create the two secrets it depends on and
-- substitute your project ref below:
--
--   -- the key the cron job uses to invoke the Edge Function. The anon key
--   -- is a valid project-signed JWT and satisfies verify_jwt; it is public
--   -- by design (RLS is what protects the data).
--   select vault.create_secret('<ANON_KEY>', 'edge_invoke_key');
--
--   -- the LLM credential, read by the worker via public.get_secret().
--   select vault.create_secret('<OPENROUTER_API_KEY>', 'openrouter_api_key');
--
--   -- optional: pin the model. Without it the worker falls back to the
--   -- DEFAULT_MODEL in openrouter-client.ts. Setting it here means the model
--   -- can be swapped when OpenRouter rotates its free lineup, with no redeploy:
--   select vault.create_secret('<MODEL_ID>', 'openrouter_model');
--
-- Replace <PROJECT_REF> in the URL below with your Supabase project ref.
--
-- pg_cron and pg_net are both available on the free tier.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Un-schedule a previous version of this job if this migration is re-run.
select cron.unschedule(jobid) from cron.job where jobname = 'process-run-tick';

-- Every 10 seconds, ask the Edge Function to advance one unit of work.
-- (If your pg_cron version predates sub-minute schedules, use '* * * * *'
-- instead — background processing still works, just with slower ticks.)
--
-- The `where not exists` guard matters: pg_net works one request at a time,
-- and a scoring call takes tens of seconds. Without it the job enqueues far
-- faster than the queue drains, the backlog grows without bound, and every
-- surplus request is a wasted "nothing to claim" invocation anyway.
select cron.schedule(
  'process-run-tick',
  '10 seconds',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/process-run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'edge_invoke_key'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  )
  where not exists (select 1 from net.http_request_queue);
  $$
);
