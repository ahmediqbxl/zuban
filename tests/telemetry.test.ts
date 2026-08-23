import { describe, it, expect } from 'vitest';
import { todayUTC, coveragePct } from '../src/lib/db/telemetry';

describe('todayUTC', () => {
  it('stamps the UTC date, not the local one', () => {
    // 23:30 UTC on the 4th is already the 5th in Dhaka; the ledger must
    // say the 4th regardless of where the device sits.
    expect(todayUTC(new Date('2026-03-04T23:30:00Z'))).toBe('2026-03-04');
    expect(todayUTC(new Date('2026-03-04T00:10:00Z'))).toBe('2026-03-04');
  });
});

describe('coveragePct', () => {
  it('converts the 0..1 level to an integer percent', () => {
    expect(coveragePct(0)).toBe(0);
    expect(coveragePct(0.237)).toBe(24);
    expect(coveragePct(1)).toBe(100);
  });

  it('clamps out-of-range and rejects junk, because the column checks 0-100', () => {
    expect(coveragePct(-0.2)).toBe(0);
    expect(coveragePct(1.7)).toBe(100);
    expect(coveragePct(NaN)).toBe(0);
    expect(coveragePct(Infinity)).toBe(0);
  });
});
