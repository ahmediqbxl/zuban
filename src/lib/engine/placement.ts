/**
 * Placement.
 *
 * Zuban runs one course for two very different learners, and the trick is
 * that "heritage speaker" and "beginner" are not two courses — they are
 * two positions on two independent axes:
 *
 *      listening ──────────────▶  can follow spoken Bangla
 *      script    ──────────────▶  can read Bangla text
 *
 * A diaspora learner is typically high-listening / zero-script. A cold
 * beginner is zero on both. Someone who studied formally can be the
 * reverse. Measuring the axes separately means one content graph serves
 * everyone: placement just decides where in it you start and which
 * exercise types are worth your time.
 */

import type { Course } from '$content/schema';
import { TRACKS, type Knowledge, type TrackConfig, emptyKnowledge } from './sequencer';

export type Axis = 'listening' | 'script';

export interface PlacementProbe {
  id: string;
  axis: Axis;
  /** Difficulty band 1-5; we bisect rather than walk. */
  level: 1 | 2 | 3 | 4 | 5;
  /** Sentence or lexeme id the probe is drawn from. */
  target: string;
  prompt: { audio?: string; text?: string };
  options: string[];
  answer: number;
}

export interface PlacementResult {
  listening: number; // 0-5, fractional
  script: number;    // 0-5, fractional
  track: TrackConfig;
  /** Content the learner demonstrably already knows — seeds the graph. */
  known: Knowledge;
  label: 'heritage' | 'beginner' | 'literate' | 'intermediate';
}

/**
 * Build a probe set: a handful of items per axis, spread across levels.
 *
 * Deliberately short. A placement test that feels like an exam is a
 * drop-off point, and being slightly wrong is cheap — the sequencer
 * corrects within a session or two.
 */
export function buildProbes(course: Course, perAxis = 5): PlacementProbe[] {
  const probes: PlacementProbe[] = [];

  // Listening probes come from sentences with audio: hear it, pick the gloss.
  const withAudio = course.sentences.filter((s) => s.audio);
  const byLevel = (lvl: number) => withAudio.filter((s) => (s.level ?? 3) === lvl);

  for (let lvl = 1 as 1 | 2 | 3 | 4 | 5; lvl <= perAxis; lvl++) {
    const pool = byLevel(lvl);
    if (pool.length === 0) continue;
    const target = pool[0];
    const distractors = withAudio
      .filter((s) => s.id !== target.id)
      .slice(0, 3)
      .map((s) => s.gloss);
    probes.push({
      id: `listen-${lvl}`,
      axis: 'listening',
      level: lvl as 1 | 2 | 3 | 4 | 5,
      target: target.id,
      prompt: { audio: target.audio },
      options: [target.gloss, ...distractors],
      answer: 0
    });
  }

  // Script probes: see the word in Bangla script, pick its romanization.
  // This isolates decoding from vocabulary — a heritage learner knows the
  // word perfectly well and simply cannot read it.
  const ranked = course.lexemes
    .filter((l) => typeof l.freqRank === 'number')
    .sort((a, b) => (a.freqRank ?? 0) - (b.freqRank ?? 0));

  const stride = Math.max(1, Math.floor(ranked.length / perAxis));
  for (let i = 0; i < perAxis; i++) {
    const target = ranked[i * stride];
    if (!target) break;
    const distractors = ranked
      .filter((l) => l.id !== target.id)
      .slice(i * stride + 1, i * stride + 4)
      .map((l) => l.roman);
    if (distractors.length < 3) continue;
    probes.push({
      id: `script-${i + 1}`,
      axis: 'script',
      level: (Math.min(5, i + 1) as 1 | 2 | 3 | 4 | 5),
      target: target.id,
      prompt: { text: target.form },
      options: [target.roman, ...distractors],
      answer: 0
    });
  }

  return probes;
}

/** Score the probes and decide where the learner starts. */
export function scorePlacement(
  course: Course,
  probes: PlacementProbe[],
  responses: Record<string, number>
): PlacementResult {
  const axisScore = (axis: Axis): number => {
    const set = probes.filter((p) => p.axis === axis);
    if (set.length === 0) return 0;
    // Credit the level of each probe answered correctly; the highest
    // consistently-passed band is the placement.
    let passed = 0;
    for (const p of set) if (responses[p.id] === p.answer) passed += p.level;
    const maxPossible = set.reduce((n, p) => n + p.level, 0);
    return maxPossible === 0 ? 0 : (passed / maxPossible) * 5;
  };

  const listening = axisScore('listening');
  const script = axisScore('script');

  // Only skip exercise types the learner has clearly outgrown. Being
  // wrong here wastes their time, so the thresholds are conservative.
  const strongListening = listening >= 3.5;
  const strongScript = script >= 3.5;

  let label: PlacementResult['label'];
  let track: TrackConfig;
  if (strongListening && !strongScript) {
    label = 'heritage';
    track = TRACKS.heritage;
  } else if (!strongListening && strongScript) {
    label = 'literate';
    track = { script: false, listening: true, production: true };
  } else if (strongListening && strongScript) {
    label = 'intermediate';
    track = TRACKS.both;
  } else {
    label = 'beginner';
    track = TRACKS.beginner;
  }

  // Seed the graph with what the probes proved they know. Anything a
  // learner answered correctly is credited, along with its dependencies.
  const known = emptyKnowledge();
  const lexById = new Map(course.lexemes.map((l) => [l.id, l]));
  for (const p of probes) {
    if (responses[p.id] !== p.answer) continue;
    if (p.axis === 'script') {
      const lex = lexById.get(p.target);
      if (lex) {
        known.lexemes.add(lex.id);
        for (const g of lex.glyphs) known.glyphs.add(g);
      }
    } else {
      const sent = course.sentences.find((s) => s.id === p.target);
      // Understanding a sentence by ear proves the vocabulary, not the
      // script — so credit lexemes but deliberately not their glyphs.
      if (sent) for (const l of sent.lexemes) known.lexemes.add(l);
    }
  }

  return { listening, script, track, known, label };
}
