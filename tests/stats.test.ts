import { describe, it, expect } from 'vitest';
import { computeStats, projectWeeksTo, type DayRow } from '../src/lib/ui/stats';

const row = (day: string, items = 10, correct = 8, coverage = 0.1): DayRow =>
  ({ day, items, correct, coverage });

describe('computeStats', () => {
  it('handles a learner who has never studied', () => {
    const s = computeStats([]);
    expect(s.daysStudied).toBe(0);
    expect(s.daysSinceLast).toBeNull();
    expect(s.returned.d1).toBe(false);
  });

  it('counts days, items and accuracy', () => {
    const s = computeStats([row('2026-03-01', 10, 8), row('2026-03-02', 20, 15)], new Date(2026, 2, 2));
    expect(s.daysStudied).toBe(2);
    expect(s.itemsTotal).toBe(30);
    expect(s.accuracy).toBeCloseTo(23 / 30, 5);
  });

  it('detects return at each window relative to first use', () => {
    const days = [row('2026-03-01'), row('2026-03-02'), row('2026-03-09'), row('2026-04-05')];
    const s = computeStats(days, new Date(2026, 3, 5));
    expect(s.returned).toEqual({ d1: true, d7: true, d30: true });
  });

  it('does not claim a return the learner has not made', () => {
    const s = computeStats([row('2026-03-01'), row('2026-03-02')], new Date(2026, 2, 2));
    expect(s.returned.d1).toBe(true);
    expect(s.returned.d7).toBe(false);
    expect(s.returned.d30).toBe(false);
  });

  it('reports days since last study', () => {
    const s = computeStats([row('2026-03-01')], new Date(2026, 2, 6));
    expect(s.daysSinceLast).toBe(5);
  });

  it('measures velocity in coverage points per week', () => {
    // 10 points gained over 7 days is 10 points/week.
    const s = computeStats(
      [row('2026-03-01', 10, 8, 0.20), row('2026-03-08', 10, 8, 0.30)],
      new Date(2026, 2, 8)
    );
    expect(s.velocity).toBeCloseTo(10, 1);
  });

  it('measures velocity over active days, so a break does not read as collapse', () => {
    // Two sessions a month apart, same gain: the rate is per elapsed day,
    // but the window is anchored on activity rather than the calendar.
    const s = computeStats(
      [row('2026-03-01', 10, 8, 0.20), row('2026-03-31', 10, 8, 0.30)],
      new Date(2026, 2, 31)
    );
    expect(s.velocity).toBeGreaterThan(0);
    expect(s.velocity).toBeLessThan(10);
  });

  it('is not thrown by a single day of activity', () => {
    const s = computeStats([row('2026-03-01')], new Date(2026, 2, 1));
    expect(s.velocity).toBe(0);
    expect(s.daysStudied).toBe(1);
  });
});

describe('projectWeeksTo', () => {
  it('projects a finish line from the current pace', () => {
    // 40% now, 80% target, 5 points/week -> 8 weeks.
    expect(projectWeeksTo(0.8, 0.4, 5)).toBe(8);
  });

  it('says nothing when the pace is too slow to extrapolate', () => {
    // Better to show nothing than "412 weeks", which is noise.
    expect(projectWeeksTo(0.8, 0.4, 0)).toBeNull();
    expect(projectWeeksTo(0.8, 0.4, 0.01)).toBeNull();
  });

  it('returns zero once the target is already met', () => {
    expect(projectWeeksTo(0.8, 0.85, 5)).toBe(0);
  });
});
