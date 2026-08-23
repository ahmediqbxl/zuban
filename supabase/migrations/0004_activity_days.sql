-- Retention instrumentation: one row per device per study day.
--
-- The Phase 3 messaging decision needs D1/D7/D30 and coverage velocity;
-- until now those existed only inside each learner's IndexedDB, which is
-- exactly the place you cannot aggregate. This is the thinnest ledger
-- that answers the question:
--
--   - device_id is a random UUID minted client-side and kept in
--     localStorage. It is deliberately NOT joined to auth.users — most
--     learners never sign in, and retention math doesn't need identity,
--     only continuity.
--   - coverage_pct is a level (0-100), letting velocity be computed
--     server-side without knowing a single word the learner studied.
--
-- Clients can only INSERT. There are intentionally no select/update/
-- delete policies: the anon key can append a day, never read the ledger.

create table if not exists public.activity_days (
  device_id     uuid        not null,
  day           date        not null,
  course        text        not null,
  coverage_pct  smallint    not null default 0
                check (coverage_pct between 0 and 100),
  created_at    timestamptz not null default now(),
  primary key (device_id, day, course)
);

alter table public.activity_days enable row level security;

drop policy if exists activity_days_insert on public.activity_days;
create policy activity_days_insert on public.activity_days
  for insert to anon, authenticated
  with check (true);
