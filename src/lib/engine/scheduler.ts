/**
 * Review scheduling, built on FSRS.
 *
 * We do not write our own scheduler. FSRS predicts recall better than
 * SM-2 for 99.5% of users in the open benchmark and reaches the same
 * retention with 20-30% fewer reviews across 500M+ logged reviews.
 * This module is a thin, typed wrapper plus Zuban's notion of what a
 * reviewable "item" is.
 */

import {
  fsrs,
  createEmptyCard,
  generatorParameters,
  Rating,
  State,
  type Card,
  type FSRS
} from 'ts-fsrs';

/**
 * What the learner is being asked to do. The same underlying word can be
 * scheduled independently as several exercises — reading a word and
 * understanding it by ear are genuinely different skills, and heritage
 * learners are strong at one and weak at the other.
 */
export type ExerciseKind =
  // --- script ------------------------------------------------------------
  | 'glyph-sound'      // see a glyph  -> produce its sound
  | 'glyph-find'       // hear a sound -> pick the glyph
  | 'word-read'        // see a word in script -> meaning
  | 'word-spell'       // assemble the script  -> written production
  | 'cloze'            // sentence in script, one word removed
  // --- script-free -------------------------------------------------------
  | 'word-recall'      // see romanization -> meaning
  | 'cloze-roman'      // romanized sentence, one word removed
  /**
   * Assemble the whole sentence from shuffled word tiles.
   *
   * The one exercise that trains word order. Bangla is subject-object-verb
   * — আমি ভাত খাই is "I rice eat" — and an English speaker gets that wrong
   * by default. Recall of a memorised phrase never surfaces the error, and
   * a single-blank cloze hands the learner the frame for free, so neither
   * teaches the thing that lets you say a sentence you have not met.
   */
  | 'build-sentence'
  // --- listening ---------------------------------------------------------
  | 'word-listen'      // hear a word     -> pick meaning
  | 'sentence-listen'  // hear a sentence -> pick meaning
  // --- speaking ----------------------------------------------------------
  // The learner is shown English and has to produce the Bangla out loud,
  // then hears the model and grades themselves. Recognition and production
  // are scheduled separately because knowing a phrase when you hear it and
  // being able to say it are very different states.
  | 'say-word'
  | 'say-sentence';

export type TargetTier = 'glyph' | 'lexeme' | 'sentence';

/** Stable id for a scheduled item: one card per (target, exercise). */
export type ItemKey = `${TargetTier}:${string}:${ExerciseKind}`;

export function itemKey(tier: TargetTier, id: string, kind: ExerciseKind): ItemKey {
  return `${tier}:${id}:${kind}`;
}

export function parseItemKey(key: ItemKey): {
  tier: TargetTier;
  id: string;
  kind: ExerciseKind;
} {
  const [tier, id, kind] = key.split(':');
  return { tier: tier as TargetTier, id, kind: kind as ExerciseKind };
}

export interface ReviewItem {
  key: ItemKey;
  card: Card;
  /** Bumped every time the item is answered; used for sync conflict resolution. */
  rev: number;
}

/** How the learner rated their own recall. Maps onto FSRS grades. */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

/**
 * Rating.Manual is not a grade a learner can give — it exists in ts-fsrs
 * for programmatic rescheduling — so it is excluded here. Without the
 * exclusion the preview lookup below is not type-safe.
 */
type Gradeable = Exclude<Rating, Rating.Manual>;

const GRADE_TO_RATING: Record<Grade, Gradeable> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy
};

export interface SchedulerOptions {
  /** Target probability of recall at review time. 0.9 is the FSRS default. */
  requestRetention?: number;
  maximumInterval?: number;
  /** Spread due dates slightly so reviews don't clump. */
  enableFuzz?: boolean;
}

export class Scheduler {
  private readonly f: FSRS;

  constructor(opts: SchedulerOptions = {}) {
    this.f = fsrs(
      generatorParameters({
        request_retention: opts.requestRetention ?? 0.9,
        maximum_interval: opts.maximumInterval ?? 36500,
        enable_fuzz: opts.enableFuzz ?? true
      })
    );
  }

  /** A brand new item, never seen. */
  create(key: ItemKey, now: Date): ReviewItem {
    return { key, card: createEmptyCard(now), rev: 0 };
  }

  /** Apply a grade and return the updated item. Pure — no mutation. */
  grade(item: ReviewItem, grade: Grade, now: Date): ReviewItem {
    const scheduled = this.f.repeat(item.card, now);
    const next = scheduled[GRADE_TO_RATING[grade]];
    return { key: item.key, card: next.card, rev: item.rev + 1 };
  }

  /** Probability the learner still remembers this, right now. */
  retrievability(item: ReviewItem, now: Date): number {
    if (item.card.state === State.New) return 0;
    return this.f.get_retrievability(item.card, now, false) as number;
  }

  isDue(item: ReviewItem, now: Date): boolean {
    return item.card.due.getTime() <= now.getTime();
  }
}

/**
 * Items due now, hardest-hit first.
 *
 * Ordering rule: genuinely lapsed material (relearning) comes before
 * ordinary reviews, and among reviews the most-forgotten go first, so a
 * short session spends its time where forgetting is actually happening.
 */
export function dueQueue(
  items: ReviewItem[],
  scheduler: Scheduler,
  now: Date,
  limit?: number
): ReviewItem[] {
  const due = items.filter((i) => scheduler.isDue(i, now));

  const priority = (i: ReviewItem) =>
    i.card.state === State.Relearning ? 0 : i.card.state === State.Learning ? 1 : 2;

  due.sort((a, b) => {
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;
    return scheduler.retrievability(a, now) - scheduler.retrievability(b, now);
  });

  return limit ? due.slice(0, limit) : due;
}

export { State, Rating };
