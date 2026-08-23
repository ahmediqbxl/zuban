/**
 * Send "cards are slipping" web pushes to devices that opted in.
 *
 * Invoked by pg_cron every six hours (see migration 0003). For each stored
 * subscription whose owner has enough due reviews, sends a payload of
 * `{ due: n }` — a count, not content; review state is the learner's and
 * this function reads only how much of it is due, never what it is.
 *
 * Honesty rules, both enforced here rather than hoped for:
 *   - a device hears from us at most once per ~day (last_notified_at)
 *   - nothing is sent below the threshold — "3 cards" is not slipping
 *
 * Push services answer 404/410 for subscriptions the browser has revoked;
 * those rows are deleted so the list converges to devices that exist.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const DUE_THRESHOLD = Number(Deno.env.get('DUE_THRESHOLD') ?? '5');
const QUIET_HOURS = 20; // minimum gap between nudges to one device

Deno.serve(async () => {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  webpush.setVapidDetails(
    'https://zuban-app.netlify.app',
    Deno.env.get('PUBLIC_VAPID_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  );

  const cutoff = new Date(Date.now() - QUIET_HOURS * 3600_000).toISOString();
  const { data: subs, error } = await sb
    .from('push_subscriptions')
    .select('user_id, endpoint, keys, last_notified_at')
    .or(`last_notified_at.is.null,last_notified_at.lt.${cutoff}`);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const nowIso = new Date().toISOString();
  // One due-count query per learner, however many devices they have.
  const dueByUser = new Map<string, number>();
  for (const uid of new Set((subs ?? []).map((s) => s.user_id))) {
    const { count } = await sb
      .from('review_items')
      .select('item_key', { count: 'exact', head: true })
      .eq('user_id', uid)
      .lte('card->>due', nowIso);
    dueByUser.set(uid, count ?? 0);
  }

  let sent = 0;
  let pruned = 0;
  for (const sub of subs ?? []) {
    const due = dueByUser.get(sub.user_id) ?? 0;
    if (due < DUE_THRESHOLD) continue;
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ due })
      );
      sent++;
      await sb
        .from('push_subscriptions')
        .update({ last_notified_at: nowIso })
        .eq('user_id', sub.user_id)
        .eq('endpoint', sub.endpoint);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        pruned++;
        await sb
          .from('push_subscriptions')
          .delete()
          .eq('user_id', sub.user_id)
          .eq('endpoint', sub.endpoint);
      }
      // Other failures (push service hiccup) just wait for the next tick.
    }
  }

  return Response.json({ checked: subs?.length ?? 0, sent, pruned, threshold: DUE_THRESHOLD });
});
