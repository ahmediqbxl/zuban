/**
 * Retention telemetry: the least we can send and still compute D1/D7/D30.
 *
 * One insert per device per day — a random device UUID, the date, and the
 * coverage level. No identity (deliberately never joined to an account),
 * no words, no grades, no timings. The full activity ledger stays local
 * in IndexedDB; this is a daily "still alive" mark in an append-only,
 * client-unreadable table.
 *
 * Fire-and-forget by contract: called mid-lesson, so it must never throw,
 * never await anything the lesson waits on, and degrade to a no-op when
 * Supabase is unconfigured or the network is gone.
 */

import { browser } from '$app/environment';
import { supabase } from './sync';

const DEVICE_KEY = 'zuban:device';
const PINGED_KEY = 'zuban:pinged';

/** UTC day stamp. The server ledger uses UTC so cohorts don't straddle
 *  timezones; the local stats ledger keeps using the device's local day. */
export function todayUTC(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Coverage arrives as 0..1; the ledger stores a clamped integer percent. */
export function coveragePct(coverage: number): number {
  if (!Number.isFinite(coverage)) return 0;
  return Math.min(100, Math.max(0, Math.round(coverage * 100)));
}

export async function pingActivity(coverage: number, course: string): Promise<void> {
  if (!browser) return;
  const sb = supabase();
  if (!sb) return;

  try {
    const day = todayUTC();
    if (localStorage.getItem(PINGED_KEY) === day) return;

    let device = localStorage.getItem(DEVICE_KEY);
    if (!device) {
      device = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, device);
    }

    const { error } = await sb
      .from('activity_days')
      .insert({ device_id: device, day, course, coverage_pct: coveragePct(coverage) });

    // A duplicate-key error means another tab already pinged today; both
    // outcomes mean "today is recorded", so both stamp the guard.
    if (!error || error.code === '23505') localStorage.setItem(PINGED_KEY, day);
  } catch {
    // Telemetry must never disturb a lesson. Tomorrow is another ping.
  }
}
