-- Zuban sync schema.
--
-- Sync is additive. The app is fully functional with no account: review
-- state lives in IndexedDB and the course is static data. These tables
-- exist so progress survives a lost phone and follows a learner across
-- devices — nothing more. Nothing here is on the critical path of a lesson.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profile: one row per learner per course.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  course       text        not null,
  -- Which exercise types are active, from the placement test.
  track        jsonb       not null default '{"script":true,"listening":true,"production":true}'::jsonb,
  -- Placement scores on the two independent axes.
  placement    jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, course)
);

-- ---------------------------------------------------------------------------
-- Review cards: FSRS state, one row per (learner, item).
--
-- `item_key` is `tier:id:exercise` — the same key the client uses, so sync
-- is a straight upsert with no id mapping.
-- ---------------------------------------------------------------------------
create table if not exists public.review_items (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  course      text        not null,
  item_key    text        not null,
  -- Full FSRS card: due, stability, difficulty, reps, lapses, state.
  card        jsonb       not null,
  -- Monotonic per-item counter; last writer with the highest rev wins.
  rev         integer     not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, course, item_key)
);

-- Indexed as text, not timestamptz: the cast isn't IMMUTABLE (it depends on
-- the session timezone) so Postgres rejects it in an index expression. The
-- client writes `due` as JSON.stringify's ISO-8601 UTC form, and those
-- fixed-format strings sort lexicographically in chronological order, so a
-- text index gives the same ordering.
create index if not exists review_items_due_idx
  on public.review_items (user_id, course, (card->>'due'));

-- ---------------------------------------------------------------------------
-- Known items: what the sequencer treats as acquired.
-- ---------------------------------------------------------------------------
create table if not exists public.known_items (
  user_id   uuid        not null references auth.users(id) on delete cascade,
  course    text        not null,
  tier      text        not null check (tier in ('glyph', 'lexeme', 'sentence')),
  item_id   text        not null,
  known_at  timestamptz not null default now(),
  primary key (user_id, course, tier, item_id)
);

-- ---------------------------------------------------------------------------
-- Review log: append-only.
--
-- Kept because FSRS parameters can be re-optimised per learner from raw
-- review history. Discarding the log would throw away the only data that
-- makes that possible.
-- ---------------------------------------------------------------------------
create table if not exists public.review_log (
  id         bigserial   primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  course     text        not null,
  item_key   text        not null,
  grade      text        not null check (grade in ('again', 'hard', 'good', 'easy')),
  reviewed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists review_log_user_idx on public.review_log (user_id, course, reviewed_at);

-- ---------------------------------------------------------------------------
-- RLS: a learner sees only their own rows. No exceptions, no service reads.
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.review_items enable row level security;
alter table public.known_items  enable row level security;
alter table public.review_log   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'review_items', 'known_items', 'review_log'] loop
    execute format($f$
      drop policy if exists %1$I on public.%1$I;
      create policy %1$I on public.%1$I
        for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;

-- Keep updated_at honest so last-write-wins comparisons mean something.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists review_items_touch on public.review_items;
create trigger review_items_touch before update on public.review_items
  for each row execute function public.touch_updated_at();
