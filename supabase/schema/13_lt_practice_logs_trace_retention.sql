-- Keystroke traces are only needed for anti-cheat at submission time and for
-- short-term investigation. They are the bulk of each log row (one number
-- per typed character), so drop them from logs older than 90 days while
-- keeping the aggregate metrics. Requires the pg_cron extension (enabled by
-- default on Supabase projects).
create extension if not exists pg_cron with schema pg_catalog;

-- Lets the nightly prune touch only the rows at the 90-day boundary; the
-- partial index shrinks as traces are cleared.
create index if not exists idx_logs_created_with_trace
  on public.lt_practice_logs (created_at)
  where trace is not null;

create or replace function public.lt_prune_practice_traces()
returns void
language sql
security definer
set search_path = public
as $$
  update public.lt_practice_logs
  set trace = null
  where trace is not null
    and created_at < now() - interval '90 days';
$$;

revoke all on function public.lt_prune_practice_traces() from public;

-- Every day at 03:15 UTC
select cron.schedule('lt_prune_practice_traces', '15 3 * * *', $$select public.lt_prune_practice_traces();$$)
where not exists (select 1 from cron.job where jobname = 'lt_prune_practice_traces');
