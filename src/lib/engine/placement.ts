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

  // ---- Comprehension axis ------------------------------------------------
  // Ideally this is audio: hear a sentence, pick its meaning. Until the
  // course has recordings we fall back to romanization — show `ami bhalo
  // achhi`, ask what it means. That still isolates the variable we care
  // about, because romanization is readable by anyone: a heritage learner
  // recognises the words instantly, a cold beginner cannot. Testing
  // comprehension without requiring the script is the entire point of
  // keeping this axis separate.
  const withAudio = course.sentences.filter((s) => s.audio);
  const usingAudio = withAudio.length >= perAxis;
  const pool = usingAudio ? withAudio : course.sentences;

  const byLevel = (lvl: number) => pool.filter((s) => (s.level ?? 3) === lvl);

  for (let lvl = 1; lvl <= 5 && probes.length < perAxis; lvl++) {
    const atLevel = byLevel(lvl);
    if (atLevel.length === 0) continue;
    const target = atLevel[0];
    const distractors = pool
      .filter((s) => s.id !== target.id && s.gloss !== target.gloss)
      .slice(0, 3)
      .map((s) => s.gloss);
    if (distractors.length < 3) continue;

    probes.push({
      id: `listen-${lvl}`,
      axis: 'listening',
      level: lvl as 1 | 2 | 3 | 4 | 5,
      target: target.id,
      prompt: usingAudio ? { audio: target.audio } : { text: target.roman },
      options: [target.gloss, ...distractors],
      answer: 0
    });
  }

  // ---- Script axis -------------------------------------------------------
  // See the word in Bangla script, pick its romanization. This isolates
  // decoding from vocabulary: a heritage learner knows the word perfectly
  // well and simply cannot read it.
  const ranked = course.lexemes
    .filter((l) => typeof l.freqRank === 'number')
    .sort((a, b) => (a.freqRank ?? 0) - (b.freqRank ?? 0));

  const stride = Math.max(1, Math.floor(ranked.length / perAxis));
  for (let i = 0; i < perAxis; i++) {
    const target = ranked[i * stride];
    if (!target) break;
    // Distinct romanizations only — শ and ষ both give "sh", and an
    // exercise offering the same answer twice is unanswerable.
    const distractors = [
      ...new Set(ranked.filter((l) => l.roman !== target.roman).map((l) => l.roman))
    ].slice(i * 3, i * 3 + 3);
    if (distractors.length < 3) continue;

    probes.push({
      id: `script-${i + 1}`,
      axis: 'script',
      level: Math.min(5, i + 1) as 1 | 2 | 3 | 4 | 5,
      target: target.id,
      prompt: { text: target.form },
      options: [target.roman, ...distractors],
      answer: 0
    });
  }

  return probes;
}

/**
 * Options in presentation order, with the correct answer moved off
 * position 0. Deterministic per probe so a reload does not reshuffle.
 */
export function presentOptions(probe: PlacementProbe): { text: string; isAnswer: boolean }[] {
  const tagged = probe.options.map((text, i) => ({ text, isAnswer: i === probe.answer }));
  if (tagged.length < 2) return tagged;
  // Rotate by 1..len-1, never 0: a zero rotation would leave the answer in
  // first position, and since buildProbes always emits the answer at index
  // 0, "always pick the top option" would score full marks.
  const h = [...probe.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const k = 1 + (h % (tagged.length - 1));
  const rotated = [...tagged.slice(k), ...tagged.slice(0, k)];
  return rotated;
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
