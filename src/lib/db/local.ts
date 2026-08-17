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
const DB_VERSION = 1;

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
      upgrade(d) {
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
      }
    });
  }
  return dbp;
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
  await (await db()).put('items', { ...item, updatedAt: new Date().toISOString() });
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
  await (await db()).put('profile', p);
}

/** Reviews not yet pushed upstream. Sync drains this. */
export async function pendingReviews() {
  return (await (await db()).getAll('reviews')).filter((r) => !r.synced);
}

export async function clearAll(): Promise<void> {
  const d = await db();
  await Promise.all([
    d.clear('items'),
    d.clear('known'),
    d.clear('profile'),
    d.clear('reviews')
  ]);
}
