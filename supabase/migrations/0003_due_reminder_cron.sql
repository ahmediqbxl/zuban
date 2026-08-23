-- Schedule the due-review reminder sender.
--
-- The sender is an edge function; this migration gives it a heartbeat
-- (pg_cron calling it over pg_net every six hours) and the bookkeeping
-- column that keeps it from nagging — a device is notified at most once
-- per day, no matter how many cron ticks see cards due.

alter table public.push_subscriptions
  add column if not exists last_notified_at timestamptz;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The bearer token is the anon key, which is public by definition (every
-- browser client ships it). Invoking the function early costs nothing:
-- the once-per-day guard above makes extra invocations no-ops.
select cron.schedule(
  'send-due-reminders',
  '0 */6 * * *',
  $$
  select net.http_post(
    url     := 'https://jjknnrfwvivhomorumhv.supabase.co/functions/v1/send-due-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqa25ucmZ3dml2aG9tb3J1bWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTgyOTMsImV4cCI6MjEwMzA3NDI5M30.DPL9CgFqC5sI4s2gpk9h3VyY9qTha20PNqpEqnLzi4Q'
    ),
    body    := '{}'::jsonb
  )
  $$
);
