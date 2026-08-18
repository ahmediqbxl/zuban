/**
 * i+1 sequencing over the content dependency graph.
 *
 * Krashen's comprehensible-input hypothesis says acquisition happens when
 * input sits just above current competence: understandable, but carrying
 * one new thing. Content that is too easy teaches nothing; content that is
 * too hard blocks acquisition entirely.
 *
 * The content graph (glyph -> lexeme -> sentence) lets us make that
 * concrete rather than aspirational: an item is *teachable* when exactly
 * one of its dependencies is unknown. That one unknown is the "+1".
 *
 * The second job here is ordering. Given many teachable candidates, we
 * prefer the one that unlocks the most downstream material per unit of
 * effort — which is why Bangla glyphs are taught in utility order and not
 * as the alphabet chart every other app opens with.
 */

import type { Course, Glyph, Lexeme, Sentence } from '$content/schema';
import type { ExerciseKind, TargetTier } from './scheduler';

/**
 * Which skills a learner is actively building.
 *
 * A heritage learner already understands spoken Bangla but cannot read it,
 * so drilling word-listen wastes their time and drilling glyphs is the
 * whole point. A cold beginner needs both. The placement test sets this.
 */
export interface TrackConfig {
  script: boolean;      // glyph work — literacy
  listening: boolean;   // audio comprehension
  production: boolean;  // spelling / recall
}

export const TRACKS: Record<'heritage' | 'beginner' | 'both', TrackConfig> = {
  heritage: { script: true, listening: false, production: true },
  beginner: { script: true, listening: true, production: false },
  both: { script: true, listening: true, production: true }
};

/** Ids the learner has demonstrably acquired, per tier. */
export interface Knowledge {
  glyphs: Set<string>;
  lexemes: Set<string>;
  sentences: Set<string>;
}

export function emptyKnowledge(): Knowledge {
  return { glyphs: new Set(), lexemes: new Set(), sentences: new Set() };
}

export interface Candidate {
  tier: TargetTier;
  id: string;
  /** The single unknown dependency this item introduces — the "+1". */
  introduces: { tier: TargetTier; id: string } | null;
  /** Higher is better. See rankCandidates. */
  score: number;
  /** Exercises to schedule when this item is taken up. */
  exercises: ExerciseKind[];
}

// ---------------------------------------------------------------------------
// Graph indexing
// ---------------------------------------------------------------------------

export class ContentGraph {
  readonly glyphs = new Map<string, Glyph>();
  readonly lexemes = new Map<string, Lexeme>();
  readonly sentences = new Map<string, Sentence>();

  /** glyph id -> lexeme ids that use it. */
  private readonly glyphUsers = new Map<string, Set<string>>();
  /** lexeme id -> sentence ids that use it. */
  private readonly lexemeUsers = new Map<string, Set<string>>();

  constructor(course: Course) {
    for (const g of course.glyphs) this.glyphs.set(g.id, g);
    for (const l of course.lexemes) this.lexemes.set(l.id, l);
    for (const s of course.sentences) this.sentences.set(s.id, s);

    for (const l of course.lexemes) {
      for (const gid of l.glyphs) {
        if (!this.glyphUsers.has(gid)) this.glyphUsers.set(gid, new Set());
        this.glyphUsers.get(gid)!.add(l.id);
      }
    }
    for (const s of course.sentences) {
      for (const lid of s.lexemes) {
        if (!this.lexemeUsers.has(lid)) this.lexemeUsers.set(lid, new Set());
        this.lexemeUsers.get(lid)!.add(s.id);
      }
    }
  }

  /** How much downstream content this glyph unlocks. */
  glyphReach(id: string): number {
    const words = this.glyphUsers.get(id);
    if (!words) return 0;
    let reach = words.size;
    for (const w of words) reach += this.lexemeUsers.get(w)?.size ?? 0;
    return reach;
  }

  lexemeReach(id: string): number {
    return this.lexemeUsers.get(id)?.size ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Candidate selection
// ---------------------------------------------------------------------------

/**
 * How hard the sequencer pushes letters ahead of words.
 *
 * Tuned so the course opens with the handful of letters that make the
 * first real words readable, then interleaves: mostly words, with a new
 * letter whenever one would open up several more. Raising this marches
 * through the alphabet; lowering it strands the script behind vocabulary.
 */
const GLYPH_UNLOCK_WEIGHT = 120;

function unknownDeps(deps: string[], known: Set<string>): string[] {
  return deps.filter((d) => !known.has(d));
}

function exercisesFor(tier: TargetTier, track: TrackConfig): ExerciseKind[] {
  const out: ExerciseKind[] = [];
  if (tier === 'glyph') {
    if (track.script) out.push('glyph-sound', 'glyph-find');
  } else if (tier === 'lexeme') {
    if (track.script) out.push('word-read');
    if (track.listening) out.push('word-listen');
    if (track.production) out.push('word-spell');
  } else {
    out.push('cloze');
    if (track.listening) out.push('sentence-listen');
  }
  return out;
}

/**
 * Everything the learner could take up next, ranked.
 *
 * `budget` is how many unknowns an item may contain. 1 is strict i+1 and
 * the default; raising it degrades gracefully when the graph is sparse
 * and nothing is perfectly i+1 — better to show slightly-hard material
 * than to stall.
 */
export function candidates(
  graph: ContentGraph,
  known: Knowledge,
  track: TrackConfig,
  budget = 1
): Candidate[] {
  const out: Candidate[] = [];

  // How many still-unlearnable words each unknown glyph would unlock on its
  // own. A glyph's value depends on the frontier, not on the whole corpus:
  // ক is worth little once every ক-word you can reach is already known, and
  // a rarer letter becomes the best move the moment it is the only thing
  // standing between the learner and a dozen new words.
  const unlockCount = new Map<string, number>();
  if (track.script) {
    for (const l of graph.lexemes.values()) {
      if (known.lexemes.has(l.id)) continue;
      const missing = unknownDeps(l.glyphs, known.glyphs);
      if (missing.length === 0) continue;
      // Fractional credit, not a binary "is this the last missing letter".
      // A word one letter away contributes a whole point; a word three
      // letters away contributes a third. This gives a smooth gradient:
      // early on, when nothing is readable yet, the highest-value letters
      // still rise to the top and bootstrap the course; later, letters
      // fade behind words until one of them is again worth the detour.
      // A binary measure deadlocks at the start and marches through the
      // alphabet chart once it unsticks.
      const share = 1 / missing.length;
      for (const gid of missing) unlockCount.set(gid, (unlockCount.get(gid) ?? 0) + share);
    }
  }

  // --- Glyphs: teachable when they appear in a word we can almost read.
  if (track.script) {
    for (const g of graph.glyphs.values()) {
      if (known.glyphs.has(g.id)) continue;
      // Conjuncts are deliberately NOT gated on their components. The
      // literature is explicit that they are learned as whole shapes
      // inside real words, and several are phonetically opaque anyway —
      // জ্ঞ is said "gg", so knowing জ and ঞ predicts nothing. Gating on
      // components also strands any conjunct whose parts never occur
      // standalone (ঞ appears only inside conjuncts, so জ্ঞ would be
      // unreachable forever). Ordering below still prefers parts first
      // where they exist; it just never blocks.
      // Scored on the same scale as lexemes so letters and words interleave
      // rather than one starving the other. A letter that unlocks several
      // otherwise-unreachable words outranks any single word; a letter that
      // unlocks nothing yet waits until it does. Static corpus reach and
      // the computed teaching order only break ties.
      const unlocks = unlockCount.get(g.id) ?? 0;
      out.push({
        tier: 'glyph',
        id: g.id,
        introduces: { tier: 'glyph', id: g.id },
        score: unlocks * GLYPH_UNLOCK_WEIGHT + graph.glyphReach(g.id) / 10 - g.order,
        exercises: exercisesFor('glyph', track)
      });
    }
  }

  // --- Lexemes: teachable when at most `budget` of their glyphs are unknown.
  for (const l of graph.lexemes.values()) {
    if (known.lexemes.has(l.id)) continue;
    const missing = track.script ? unknownDeps(l.glyphs, known.glyphs) : [];
    if (missing.length > budget) continue;
    // Common words first; a word that appears in many sentences is worth more.
    const freqScore = l.freqRank ? Math.max(0, 5000 - l.freqRank) : 0;
    out.push({
      tier: 'lexeme',
      id: l.id,
      introduces: missing.length === 1 ? { tier: 'glyph', id: missing[0] } : null,
      score: freqScore + graph.lexemeReach(l.id) * 10 - missing.length * 500,
      exercises: exercisesFor('lexeme', track)
    });
  }

  // --- Sentences: the real i+1 unit. Exactly one unknown word is ideal.
  for (const s of graph.sentences.values()) {
    if (known.sentences.has(s.id)) continue;
    const missing = unknownDeps(s.lexemes, known.lexemes);
    if (missing.length > budget) continue;
    out.push({
      tier: 'sentence',
      id: s.id,
      introduces: missing.length === 1 ? { tier: 'lexeme', id: missing[0] } : null,
      // Sentences are the goal, so they outrank isolated drilling, but a
      // sentence with an unknown word costs more than one fully understood.
      score: 2000 + (s.level ? (6 - s.level) * 100 : 0) - missing.length * 400,
      exercises: exercisesFor('sentence', track)
    });
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}

/**
 * The next thing to teach, or null when the learner has exhausted
 * available content. Widens the budget before giving up so a sparse
 * graph stalls the session rather than the course.
 */
export function nextItem(
  graph: ContentGraph,
  known: Knowledge,
  track: TrackConfig
): Candidate | null {
  for (const budget of [1, 2, 3]) {
    const c = candidates(graph, known, track, budget);
    if (c.length > 0) return c[0];
  }
  return null;
}
