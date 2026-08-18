/**
 * Local-first persistence.
 *
 * Review state lives in IndexedDB and the app is fully functional with no
 * account and no network. Supabase sync (src/lib/db/sync.ts) is additive:
 * it copies local state up and merges remote state down, and its absence
 * degrades to "this device only" rather than to a broken app.
 *
 * That ordering matters for the audience. A lot of Bangla learners are
 * diaspora users on patchy mobile connections, and a course that needs a
 * round-trip per card is unusable on a train.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Card } from 'ts-fsrs';
import type { ItemKey, ReviewItem } from '$engine/scheduler';
import type { TrackConfig } from '$engine/sequencer';

const DB_NAME = 'zuban';
const DB_VERSION = 2;

export interface StoredProfile {
  id: 'me';
  course: string;
  track: TrackConfig;
  placement?: { listening: number; script: number; label: string };
  createdAt: string;
  /** Set once the learner signs in; null while purely local. */
  userId: string | null;
}

interface ZubanDB extends DBSchema {
  items: {
    key: string;
    value: ReviewItem & { updatedAt: string };
    indexes: { 'by-due': string };
  };
  known: {
    key: string; // `${tier}:${id}`
    value: { key: string; tier: string; id: string; at: string };
  };
  profile: { key: string; value: StoredProfile };
  /**
   * One row per calendar day the learner studied.
   *
   * Kept locally so return-rate and learning-velocity are measurable
   * without any third-party analytics — the app works signed-out and
   * offline, so anything server-side would miss most of the picture.
   */
  days: {
    key: string; // YYYY-MM-DD, local time
    value: { day: string; items: number; correct: number; coverage: number };
  };
  /** Append-only log so sync can replay rather than guess. */
  reviews: {
    key: number;
    value: { id?: number; item: ItemKey; grade: string; at: string; synced: boolean };
    indexes: { 'by-synced': string };
  };
}

let dbp: Promise<IDBPDatabase<ZubanDB>> | null = null;

function db() {
  if (!dbp) {
    dbp = openDB<ZubanDB>(DB_NAME, DB_VERSION, {
      upgrade(d, oldVersion) {
        if (oldVersion >= 1) {
          // Upgrading an existing install: add only what's new so a
          // learner's review history survives the migration.
          if (!d.objectStoreNames.contains('days')) {
            d.createObjectStore('days', { keyPath: 'day' });
          }
          return;
        }
        const items = d.createObjectStore('items', { keyPath: 'key' });
        // Due date is stored as an ISO string so it can be range-scanned.
        items.createIndex('by-due', 'dueIso');
        d.createObjectStore('known', { keyPath: 'key' });
        d.createObjectStore('profile', { keyPath: 'id' });
        const reviews = d.createObjectStore('reviews', {
          keyPath: 'id',
          autoIncrement: true
        });
        reviews.createIndex('by-synced', 'syncedFlag');
        d.createObjectStore('days', { keyPath: 'day' });
      }
    });
  }
  return dbp;
}

/**
 * Strip reactivity before writing.
 *
 * Svelte 5 `$state` deep-proxies objects, and IndexedDB cannot
 * structured-clone a Proxy — it throws "could not be cloned". Anything
 * read out of reactive state and handed straight to `put()` fails at
 * runtime, so this boundary rebuilds a plain object explicitly. Doing it
 * here rather than at each call site means no caller has to remember.
 */
function toPlainCard(c: Card): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? new Date(c.last_review) : undefined
  } as Card;
}

/** FSRS returns Date objects; IndexedDB round-trips them fine, but be explicit. */
function reviveCard(c: Card): Card {
  return {
    ...c,
    due: new Date(c.due),
    last_review: c.last_review ? new Date(c.last_review) : undefined
  } as Card;
}

export async function loadItems(): Promise<Map<ItemKey, ReviewItem>> {
  const all = await (await db()).getAll('items');
  const out = new Map<ItemKey, ReviewItem>();
  for (const r of all) {
    out.set(r.key as ItemKey, { key: r.key as ItemKey, card: reviveCard(r.card), rev: r.rev });
  }
  return out;
}

export async function saveItem(item: ReviewItem): Promise<void> {
  await (await db()).put('items', {
    key: item.key,
    card: toPlainCard(item.card),
    rev: item.rev,
    updatedAt: new Date().toISOString()
  });
}

export async function logReview(item: ItemKey, grade: string): Promise<void> {
  await (await db()).add('reviews', {
    item,
    grade,
    at: new Date().toISOString(),
    synced: false
  });
}

export async function loadKnown(): Promise<{
  glyphs: Set<string>;
  lexemes: Set<string>;
  sentences: Set<string>;
}> {
  const all = await (await db()).getAll('known');
  const out = { glyphs: new Set<string>(), lexemes: new Set<string>(), sentences: new Set<string>() };
  for (const r of all) {
    if (r.tier === 'glyph') out.glyphs.add(r.id);
    else if (r.tier === 'lexeme') out.lexemes.add(r.id);
    else out.sentences.add(r.id);
  }
  return out;
}

export async function markKnown(tier: string, id: string): Promise<void> {
  await (await db()).put('known', {
    key: `${tier}:${id}`,
    tier,
    id,
    at: new Date().toISOString()
  });
}

export async function loadProfile(): Promise<StoredProfile | undefined> {
  return (await db()).get('profile', 'me');
}

export async function saveProfile(p: StoredProfile): Promise<void> {
  // Rebuilt field by field for the same reason as cards: the track and
  // placement objects routinely arrive as reactive proxies.
  await (await db()).put('profile', {
    id: 'me',
    course: p.course,
    track: { script: p.track.script, listening: p.track.listening, production: p.track.production },
    placement: p.placement
      ? { listening: p.placement.listening, script: p.placement.script, label: p.placement.label }
      : undefined,
    createdAt: p.createdAt,
    userId: p.userId
  });
}

/** Reviews not yet pushed upstream. Sync drains this. */
export async function pendingReviews() {
  return (await (await db()).getAll('reviews')).filter((r) => !r.synced);
}

/** Local calendar date. Study days are a human notion, not a UTC one. */
export function today(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Fold one answered card into today's row. */
export async function recordActivity(correct: boolean, coverage: number): Promise<void> {
  const d = await db();
  const day = today();
  const prev = (await d.get('days', day)) ?? { day, items: 0, correct: 0, coverage: 0 };
  await d.put('days', {
    day,
    items: prev.items + 1,
    correct: prev.correct + (correct ? 1 : 0),
    // Store the latest reading rather than a sum — this is a level, not a count.
    coverage
  });
}

export async function loadDays() {
  return (await (await db()).getAll('days')).sort((a, b) => a.day.localeCompare(b.day));
}

export async function clearAll(): Promise<void> {
  const d = await db();
  await Promise.all([
    d.clear('items'),
    d.clear('known'),
    d.clear('profile'),
    d.clear('reviews'),
    d.clear('days')
  ]);
}
