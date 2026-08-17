/**
 * Corpus coverage — Zuban's progress metric.
 *
 * Streaks and XP measure app usage, not competence, and the documented
 * failure of gamified apps is that learners feel productive while
 * plateauing. Coverage instead answers a question the learner actually
 * cares about: "how much of what I hear and read can I follow?"
 *
 * It works because word frequency is brutally top-heavy. In most
 * languages a few hundred words cover half of everyday running text, so
 * early progress is real and fast — and the curve flattening later is
 * honest information, not a failure of the app.
 */

import type { Course, Lexeme } from '$content/schema';

export interface CoverageModel {
  /** lexeme id -> share of running text, summing to <= 1 across the course. */
  weights: Map<string, number>;
  /** Share of running text the course's whole lexicon accounts for. */
  ceiling: number;
}

/**
 * Zipf-style weights derived from frequency rank.
 *
 * A true model would come from token counts over a reference corpus; rank
 * is what we reliably have per-lexeme, and 1/rank reproduces the shape of
 * the distribution closely enough to keep the number honest.
 */
export function buildCoverageModel(course: Course, corpusCeiling = 0.95): CoverageModel {
  const ranked = course.lexemes.filter(
    (l): l is Lexeme & { freqRank: number } => typeof l.freqRank === 'number' && l.freqRank > 0
  );

  const raw = new Map<string, number>();
  let total = 0;
  for (const l of ranked) {
    const w = 1 / l.freqRank;
    raw.set(l.id, w);
    total += w;
  }

  const weights = new Map<string, number>();
  if (total > 0) {
    for (const [id, w] of raw) weights.set(id, (w / total) * corpusCeiling);
  }
  return { weights, ceiling: corpusCeiling };
}

/** Share of running text the learner can follow, in [0, 1]. */
export function coverage(model: CoverageModel, knownLexemes: Set<string>): number {
  let sum = 0;
  for (const id of knownLexemes) sum += model.weights.get(id) ?? 0;
  return Math.min(sum, 1);
}

/**
 * The most valuable words not yet known — "learn these 10 next and you
 * gain N% comprehension". Concrete and motivating in a way XP is not.
 */
export function highestValueNext(
  model: CoverageModel,
  knownLexemes: Set<string>,
  n = 10
): Array<{ id: string; gain: number }> {
  const out: Array<{ id: string; gain: number }> = [];
  for (const [id, w] of model.weights) {
    if (!knownLexemes.has(id)) out.push({ id, gain: w });
  }
  out.sort((a, b) => b.gain - a.gain);
  return out.slice(0, n);
}

/** Script literacy, tracked separately — the thing heritage learners lack. */
export function scriptCoverage(course: Course, knownGlyphs: Set<string>): number {
  const teachable = course.glyphs.filter((g) => g.kind !== 'punctuation');
  if (teachable.length === 0) return 0;
  const known = teachable.filter((g) => knownGlyphs.has(g.id)).length;
  return known / teachable.length;
}

/**
 * Share of the course's sentences that are fully understandable — every
 * word known. This is the number that tracks "can I actually read".
 */
export function readableSentences(course: Course, knownLexemes: Set<string>): number {
  if (course.sentences.length === 0) return 0;
  const readable = course.sentences.filter((s) =>
    s.lexemes.every((l) => knownLexemes.has(l))
  ).length;
  return readable / course.sentences.length;
}
