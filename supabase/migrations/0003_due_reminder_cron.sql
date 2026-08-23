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

-- Scheduling itself is deliberately NOT done here. Migrations replay in
-- every environment, and a job body needs an environment-specific
-- function URL — a dev or preview database replaying this file must not
-- acquire a cron job that quietly POSTs to production every six hours.
-- (Production's job was created when this migration first ran there;
-- this file was later reduced to extensions-only.)
--
-- To enable reminders in an environment, run once by hand, with that
-- environment's function URL and its anon key (the anon key is public —
-- every browser client ships it — and early invocations are no-ops
-- thanks to the once-per-day guard):
--
--   select cron.schedule('send-due-reminders', '0 */6 * * *', $job$
--     select net.http_post(
--       url     := 'https://<project-ref>.supabase.co/functions/v1/send-due-reminders',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer <anon key>'),
--       body    := '{}'::jsonb)
--   $job$);
