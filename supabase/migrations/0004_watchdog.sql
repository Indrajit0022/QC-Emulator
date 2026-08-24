-- Backstop for PRD §8 ("a failed run must never remain stuck on an infinite
-- spinner"). If the Edge Function is killed mid-flight by the runtime — a
-- wall-clock or memory limit — its catch block never runs, so the run stays
-- in `processing` and every tick retries it forever. This fails runs that
-- have made no progress for 10 minutes.
--
-- Note this measures progress, not total duration: the scoring stage updates
-- the row after each group of dimensions, so a long but healthy run keeps
-- resetting the clock.
create or replace function public.fail_stuck_runs(stale_after interval default interval '10 minutes')
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n integer;
begin
  update public.runs
  set status = 'failed',
      error = coalesce(
        nullif(error, ''),
        'Processing stalled at stage "' || processing_stage ||
        '" and was timed out by the watchdog. This usually means the model call ' ||
        'exceeded the worker time limit. Try again, or use a shorter transcript.'
      )
  where status in ('queued', 'processing')
    and updated_at < now() - stale_after;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.fail_stuck_runs(interval) from public;
revoke all on function public.fail_stuck_runs(interval) from anon;
revoke all on function public.fail_stuck_runs(interval) from authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'fail-stuck-runs';

select cron.schedule('fail-stuck-runs', '* * * * *', $$select public.fail_stuck_runs();$$);
