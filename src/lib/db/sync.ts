/**
 * Optional Supabase sync.
 *
 * Deliberately additive: every function here is a no-op when Supabase is
 * unconfigured or the learner is signed out, and the app never awaits sync
 * on the path of answering a card. Losing the network degrades the product
 * to "this device only", never to broken.
 *
 * Conflict resolution is last-write-wins on a per-item `rev` counter. That
 * is adequate because the only writer for a given item is the learner
 * themselves, on one device at a time; the realistic conflict is a stale
 * device coming back online, and the higher rev is genuinely the newer state.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
// Dynamic, not static: static env requires the vars to exist at build
// time, and Supabase is optional here — an unconfigured build must still
// compile and run.
import { env } from '$env/dynamic/public';
import type { ReviewItem } from '$engine/scheduler';
import * as local from './local';

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  const url = env.PUBLIC_SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}

export const isConfigured = () => supabase() !== null;

async function userId(): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Shape a browser PushSubscription into a push_subscriptions row.
 *
 * Exported for tests; returns null when the subscription is missing the
 * pieces the Web Push protocol needs (an endpoint and both encryption
 * keys), because a partial row can never be delivered to.
 */
export function toSubscriptionRow(
  userId: string,
  sub: PushSubscriptionJSON
): { user_id: string; endpoint: string; keys: { p256dh: string; auth: string } } | null {
  const { endpoint, keys } = sub;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return null;
  return { user_id: userId, endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

/**
 * Store this device's push subscription so the server can send to it.
 *
 * No-op unless configured and signed in — anonymous learners keep local
 * reminders only. Safe to call repeatedly: keyed on (user, endpoint).
 */
export async function saveSubscription(sub: PushSubscriptionJSON): Promise<boolean> {
  const sb = supabase();
  const uid = await userId();
  if (!sb || !uid) return false;
  const row = toSubscriptionRow(uid, sub);
  if (!row) return false;
  const { error } = await sb
    .from('push_subscriptions')
    .upsert(row, { onConflict: 'user_id,endpoint' });
  return !error;
}

/** Forget a device, e.g. after the browser revokes the subscription. */
export async function deleteSubscription(endpoint: string): Promise<void> {
  const sb = supabase();
  const uid = await userId();
  if (!sb || !uid) return;
  await sb.from('push_subscriptions').delete().eq('user_id', uid).eq('endpoint', endpoint);
}

/**
 * Push local state up, then merge remote state down.
 *
 * Safe to call repeatedly and safe to interrupt — every write is an upsert
 * keyed on (user, course, item), so a partial run just resumes next time.
 */
export async function sync(course: string): Promise<{ pushed: number; pulled: number } | null> {
  const sb = supabase();
  const uid = await userId();
  if (!sb || !uid) return null;

  // --- push -----------------------------------------------------------------
  const localItems = await local.loadItems();
  const rows = [...localItems.values()].map((i) => ({
    user_id: uid,
    course,
    item_key: i.key,
    card: i.card,
    rev: i.rev
  }));

  let pushed = 0;
  if (rows.length) {
    const { error } = await sb.from('review_items').upsert(rows, {
      onConflict: 'user_id,course,item_key'
    });
    if (!error) pushed = rows.length;
  }

  const known = await local.loadKnown();
  const knownRows = [
    ...[...known.glyphs].map((id) => ({ tier: 'glyph', item_id: id })),
    ...[...known.lexemes].map((id) => ({ tier: 'lexeme', item_id: id })),
    ...[...known.sentences].map((id) => ({ tier: 'sentence', item_id: id }))
  ].map((r) => ({ ...r, user_id: uid, course }));

  if (knownRows.length) {
    await sb.from('known_items').upsert(knownRows, {
      onConflict: 'user_id,course,tier,item_id'
    });
  }

  // Drain the append-only review log; it is what lets FSRS parameters be
  // re-optimised per learner later, so it is never discarded locally.
  const pending = await local.pendingReviews();
  if (pending.length) {
    await sb.from('review_log').insert(
      pending.map((r) => ({
        user_id: uid,
        course,
        item_key: r.item,
        grade: r.grade,
        reviewed_at: r.at
      }))
    );
  }

  // --- pull -----------------------------------------------------------------
  const { data: remote } = await sb
    .from('review_items')
    .select('item_key, card, rev')
    .eq('user_id', uid)
    .eq('course', course);

  let pulled = 0;
  for (const r of remote ?? []) {
    const mine = localItems.get(r.item_key as ReviewItem['key']);
    // Only accept strictly newer remote state.
    if (mine && mine.rev >= r.rev) continue;
    await local.saveItem({
      key: r.item_key as ReviewItem['key'],
      card: { ...r.card, due: new Date(r.card.due) },
      rev: r.rev
    } as ReviewItem);
    pulled++;
  }

  const { data: remoteKnown } = await sb
    .from('known_items')
    .select('tier, item_id')
    .eq('user_id', uid)
    .eq('course', course);

  for (const k of remoteKnown ?? []) {
    await local.markKnown(k.tier as string, k.item_id as string);
  }

  return { pushed, pulled };
}
