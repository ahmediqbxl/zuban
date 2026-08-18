/**
 * Learning statistics, computed from local activity.
 *
 * Deliberately not a streak counter. A streak measures consecutive days of
 * opening an app, punishes a missed day, and tells a learner nothing about
 * whether they are learning. These measure the two things that are
 * actually true and checkable: how much of the language they can follow,
 * and how fast that is moving.
 */

export interface DayRow {
  day: string;
  items: number;
  correct: number;
  coverage: number;
}

export interface Stats {
  daysStudied: number;
  itemsTotal: number;
  accuracy: number;
  /** Coverage percentage points gained per week, over the recent window. */
  velocity: number;
  /** Days since the learner last studied. 0 = today. */
  daysSinceLast: number | null;
  /** Did they come back the day after they started, a week later, a month later? */
  returned: { d1: boolean; d7: boolean; d30: boolean };
  recent: DayRow[];
}

const DAY = 86_400_000;

function parse(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function computeStats(days: DayRow[], now = new Date()): Stats {
  if (days.length === 0) {
    return {
      daysStudied: 0, itemsTotal: 0, accuracy: 0, velocity: 0,
      daysSinceLast: null, returned: { d1: false, d7: false, d30: false }, recent: []
    };
  }

  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  const itemsTotal = sorted.reduce((n, d) => n + d.items, 0);
  const correctTotal = sorted.reduce((n, d) => n + d.correct, 0);

  const first = parse(sorted[0].day);
  const last = parse(sorted[sorted.length - 1].day);
  const todayMs = parse(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );

  // Did they come back within each window of first use? This is the
  // learner's own retention, the thing the roadmap wants measured.
  const sinceFirst = (d: DayRow) => Math.round((parse(d.day) - first) / DAY);
  const returned = {
    d1: sorted.some((d) => sinceFirst(d) >= 1),
    d7: sorted.some((d) => sinceFirst(d) >= 7),
    d30: sorted.some((d) => sinceFirst(d) >= 30)
  };

  // Velocity over the last 14 days of *activity*, not calendar days, so a
  // week off doesn't read as a collapse in learning rate.
  const window = sorted.slice(-14);
  let velocity = 0;
  if (window.length >= 2) {
    const spanDays = Math.max(1, (parse(window[window.length - 1].day) - parse(window[0].day)) / DAY);
    const gained = (window[window.length - 1].coverage - window[0].coverage) * 100;
    velocity = (gained / spanDays) * 7;
  }

  return {
    daysStudied: sorted.length,
    itemsTotal,
    accuracy: itemsTotal === 0 ? 0 : correctTotal / itemsTotal,
    velocity,
    daysSinceLast: Math.round((todayMs - last) / DAY),
    returned,
    recent: sorted.slice(-30)
  };
}

/**
 * How long until the learner can follow most of everyday Bangla, at the
 * pace they are actually going. Honest about being an extrapolation, and
 * silent when there isn't enough data to say anything.
 */
export function projectWeeksTo(target: number, current: number, velocity: number): number | null {
  if (velocity <= 0.05) return null;
  const remaining = target * 100 - current * 100;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / velocity);
}
