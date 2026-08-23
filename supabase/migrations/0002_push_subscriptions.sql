-- Push subscriptions: where "your cards are slipping" notifications go.
--
-- A PushSubscription lives in the browser; the server can only send to
-- endpoints it has stored. Rows are tied to the signed-in learner because
-- the thing worth pushing — due review counts — only exists server-side
-- for accounts (review_items is per-user). Anonymous learners still get
-- local reminders while the app is open; that path never touches this
-- table.
--
-- (user_id, endpoint) is the key: one learner can have several devices,
-- and a device re-subscribing after a permission reset gets a fresh
-- endpoint, upserted over the old row by the client.

create table if not exists public.push_subscriptions (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  endpoint    text        not null,
  -- p256dh + auth from PushSubscription.toJSON(): the encryption keys the
  -- Web Push protocol needs to seal a payload for this device.
  keys        jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions on public.push_subscriptions;
create policy push_subscriptions on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists push_subscriptions_touch on public.push_subscriptions;
create trigger push_subscriptions_touch before update on public.push_subscriptions
  for each row execute function public.touch_updated_at();
