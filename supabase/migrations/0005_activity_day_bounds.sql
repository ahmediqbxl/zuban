-- Bound what the anon key can write into the retention ledger.
--
-- activity_days is insert-only and pseudonymous by design, which means
-- anyone holding the (public) anon key can append rows. That is the
-- accepted cost of measuring anonymous learners at all — the same trade
-- every client-side analytics system makes. What is NOT acceptable is a
-- poisoned ledger spanning arbitrary history: a `day` far in the past
-- fabricates whole retention cohorts, and one in the future corrupts
-- them ahead of time. Pin `day` to "roughly now", so fabricated rows can
-- at worst inflate today — visible, and correctable by excluding the
-- affected dates.

alter table public.activity_days
  drop constraint if exists activity_days_day_is_current;

alter table public.activity_days
  add constraint activity_days_day_is_current
  check (day between (current_date - 2) and (current_date + 1));
