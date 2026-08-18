/**
 * Session state — the glue between the engine and the screen.
 *
 * Holds the course graph, the learner's knowledge and review cards, and
 * decides what to show next. Everything persists to IndexedDB as it goes,
 * so closing the tab mid-session loses nothing.
 */

import courseData from '$course/bn/course.json';
import type { Course, Glyph, Lexeme, Sentence } from '$content/schema';
import { filterLearnerReady } from '$content/schema';
import {
  Scheduler, dueQueue, itemKey,
  type ExerciseKind, type Grade, type ItemKey, type ReviewItem, type TargetTier
} from '$engine/scheduler';
import {
  ContentGraph, TRACKS, emptyKnowledge, nextItem,
  type Knowledge, type TrackConfig
} from '$engine/sequencer';
import { buildCoverageModel, coverage, scriptCoverage, readableSentences } from '$engine/coverage';
import * as local from '$db/local';
import { clusters } from '$content/scripts/bengali';

/**
 * Drafts are shown in dev only, behind a visible banner. Without this the
 * app is empty until a native speaker reviews the seed content — correct
 * for production, useless for building.
 */
export const SHOW_DRAFTS = import.meta.env.DEV;

const raw = courseData as unknown as Course;
export const course: Course = SHOW_DRAFTS ? raw : filterLearnerReady(raw);
export const graph = new ContentGraph(course);
export const coverageModel = buildCoverageModel(course);

/**
 * Exercises that need sound are only offered once sound exists.
 *
 * The sequencer plans by track, not by asset availability, so without this
 * a learner on the listening track would be served a card with nothing to
 * listen to. Recording is incremental, so this flips on per item.
 */
const AUDIO_REQUIRED = new Set(['word-listen', 'sentence-listen']);

export const glyphById = new Map(course.glyphs.map((g) => [g.id, g]));
export const lexemeById = new Map(course.lexemes.map((l) => [l.id, l]));
export const sentenceById = new Map(course.sentences.map((s) => [s.id, s]));
export const noteById = new Map(course.notes.map((n) => [n.id, n]));

/** One thing to show the learner. */
export interface Task {
  kind: ExerciseKind;
  tier: TargetTier;
  id: string;
  /** True when this is the learner's first meeting with the item. */
  isNew: boolean;
  prompt: string;
  answer: string;
  options?: string[];
  /** For cloze: index of the blanked lexeme within the sentence. */
  blank?: { start: number; end: number };
  note?: string;
  /**
   * A real word containing this item. Glyphs are never shown bare: a
   * vowel sign like া has no standalone pronunciation, and the whole
   * premise is that script is learned inside words.
   */
  context?: { form: string; roman: string; gloss: string };
  /** Vowel signs shown attached to a neutral base consonant (কা, কি, …). */
  demo?: string;
  /** For word-spell: tappable script pieces, correct ones plus decoys. */
  tiles?: string[];
  /** Clip path, when the item has a recording. */
  audio?: string;
}

class SessionState {
  scheduler = new Scheduler();
  items = $state(new Map<ItemKey, ReviewItem>());
  known = $state<Knowledge>(emptyKnowledge());
  track = $state<TrackConfig>(TRACKS.both);
  ready = $state(false);
  placed = $state(false);
  placementLabel = $state<string | null>(null);
  current = $state<Task | null>(null);
  /** Counts for the session summary. */
  done = $state(0);
  correct = $state(0);

  async load() {
    const [items, known, profile] = await Promise.all([
      local.loadItems(),
      local.loadKnown(),
      local.loadProfile()
    ]);
    this.items = items;
    this.known = known;
    if (profile) {
      this.track = profile.track;
      this.placed = true;
      this.placementLabel = profile.placement?.label ?? null;
    }
    this.ready = true;
    this.advance();
  }

  get coverage() {
    return coverage(coverageModel, this.known.lexemes);
  }
  get scriptProgress() {
    return scriptCoverage(course, this.known.glyphs);
  }
  get readable() {
    return readableSentences(course, this.known.lexemes);
  }
  /**
   * Grammar notes attached to a sentence.
   *
   * Surfaced on demand beside the card rather than as a lesson preamble.
   * Thin grammar is one of the documented reasons gamified courses
   * plateau, but a wall of text before every sentence is why people skip
   * it — so these are collapsed until asked for.
   */
  notesFor(sentenceId: string) {
    const s = sentenceById.get(sentenceId);
    if (!s?.notes) return [];
    return s.notes.map((id) => noteById.get(id)).filter((n): n is NonNullable<typeof n> => Boolean(n));
  }

  get dueCount() {
    return dueQueue([...this.items.values()], this.scheduler, new Date()).length;
  }

  /**
   * Reviews first, then new material.
   *
   * Order matters: forgetting is time-sensitive and new material is not,
   * so a short session should spend itself on what is slipping away. This
   * is also what stops the course front-loading novelty and leaving a
   * review debt the learner never clears.
   */
  advance() {
    const now = new Date();
    const due = dueQueue([...this.items.values()], this.scheduler, now, 1);
    if (due.length > 0) {
      this.current = this.buildTask(due[0].key, false);
      if (this.current) return;
    }
    const next = nextItem(graph, this.known, this.track);
    if (!next) {
      this.current = null;
      return;
    }
    // Walk the planned exercises and take the first that can actually be
    // rendered — an audio card with no clip is worse than no card.
    for (const kind of next.exercises) {
      const task = this.buildTask(itemKey(next.tier, next.id, kind), true);
      if (task) {
        this.current = task;
        return;
      }
    }
    // Nothing servable for this item: mark it seen so the sequencer moves
    // on instead of offering the same unrenderable item forever.
    this.addKnown(next.tier, next.id);
    void local.markKnown(next.tier, next.id);
    this.advance();
  }

  private distractors(pool: string[], answer: string, n = 3): string[] {
    // Dedupe, or an exercise can offer the same text twice and be
    // unanswerable — ি and ী both romanize to "i", as do শ and ষ to "sh".
    const others = [...new Set(pool)].filter((p) => p !== answer);
    // Deterministic spread rather than random: stable across reloads, and
    // avoids the same two options pairing every time.
    const picked: string[] = [];
    const stride = Math.max(1, Math.floor(others.length / (n + 1)));
    for (let i = 0; picked.length < n && i < others.length; i += stride) picked.push(others[i]);
    return picked;
  }

  private shuffleWithAnswer(answer: string, wrong: string[], seed: string): string[] {
    const all = [answer, ...wrong];
    if (all.length < 2) return all;
    // Rotate by 1..len-1, never 0. A zero rotation leaves the answer first,
    // and the answer is always constructed at index 0 — so "always tap the
    // top option" would be a winning strategy. Seeded rather than random so
    // the order is stable across reloads.
    const h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const k = 1 + (h % (all.length - 1));
    return [...all.slice(k), ...all.slice(0, k)];
  }

  buildTask(key: ItemKey, isNew: boolean): Task | null {
    const [tier, id, kind] = key.split(':') as [TargetTier, string, ExerciseKind];

    if (tier === 'glyph') {
      const g = glyphById.get(id);
      if (!g) return null;
      const pool = course.glyphs.map((x) => x.roman);
      const opts = this.shuffleWithAnswer(g.roman, this.distractors(pool, g.roman), id);

      // Always anchor a glyph to a real word that contains it. Prefer the
      // commonest introducing word so the example is one worth knowing.
      const example = g.introducedBy
        .map((lid) => lexemeById.get(lid))
        .filter((l): l is NonNullable<typeof l> => Boolean(l))
        .sort((a, b) => (a.freqRank ?? 1e9) - (b.freqRank ?? 1e9))[0];

      return {
        kind, tier, id, isNew,
        // A vowel sign cannot stand alone, so show it on a neutral base.
        prompt: g.kind === 'vowel-sign' ? `ক${g.form}` : g.form,
        answer: g.roman,
        options: kind === 'glyph-sound' ? opts : undefined,
        note: g.mnemonic,
        demo: g.kind === 'vowel-sign' ? g.form : undefined,
        context: example
          ? { form: example.form, roman: example.roman, gloss: example.gloss[0] }
          : undefined
      };
    }

    if (tier === 'lexeme') {
      const l = lexemeById.get(id);
      if (!l) return null;
      if (AUDIO_REQUIRED.has(kind) && !l.audio) return null;

      if (kind === 'word-spell') {
        // Production, not recognition: build the word from its script
        // pieces. Prompted in romanization so it tests spelling rather
        // than reading, which is precisely what a heritage learner lacks.
        const correct = clusters(l.form);
        const decoyPool = course.lexemes
          .filter((x) => x.id !== l.id)
          .flatMap((x) => clusters(x.form));
        const decoys = [...new Set(decoyPool)]
          .filter((c) => !correct.includes(c))
          .slice(0, Math.max(2, Math.min(4, correct.length)));
        // Deterministic interleave so tiles don't reshuffle on rerender.
        const tiles = [...correct, ...decoys];
        const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
        tiles.sort((a, b) => {
          const ha = ([...a].reduce((x, c) => (x * 31 + c.charCodeAt(0)) >>> 0, h)) % 997;
          const hb = ([...b].reduce((x, c) => (x * 31 + c.charCodeAt(0)) >>> 0, h)) % 997;
          return ha - hb;
        });
        return {
          kind, tier, id, isNew,
          prompt: l.roman,
          answer: l.form,
          tiles,
          note: l.gloss[0],
          audio: l.audio
        };
      }

      const pool = course.lexemes.map((x) => x.gloss[0]);
      const opts = this.shuffleWithAnswer(l.gloss[0], this.distractors(pool, l.gloss[0]), id);
      return {
        kind, tier, id, isNew,
        // A listening card must not show the word, or there is nothing to test.
        prompt: kind === 'word-listen' ? '' : l.form,
        answer: l.gloss[0],
        options: opts,
        audio: l.audio
      };
    }

    const s = sentenceById.get(id);
    if (!s) return null;
    if (AUDIO_REQUIRED.has(kind) && !s.audio) return null;
    if (kind === 'cloze' && s.spans.length > 0) {
      // Blank the least-familiar word so the cloze tests something real.
      const target =
        s.spans.find((sp) => !this.known.lexemes.has(sp.lexeme)) ??
        s.spans[s.spans.length - 1];
      const lex = lexemeById.get(target.lexeme);
      const surface = s.form.slice(target.start, target.end);
      const pool = course.lexemes.map((x) => x.form);
      return {
        kind, tier, id, isNew,
        prompt: s.form,
        answer: surface,
        options: this.shuffleWithAnswer(surface, this.distractors(pool, surface), id),
        blank: { start: target.start, end: target.end },
        note: lex ? `${lex.roman} — ${lex.gloss[0]}` : undefined,
        audio: s.audio
      };
    }
    return {
      kind, tier, id, isNew,
      prompt: kind === 'sentence-listen' ? '' : s.form,
      answer: s.gloss,
      audio: s.audio,
      options: this.shuffleWithAnswer(
        s.gloss,
        this.distractors(course.sentences.map((x) => x.gloss), s.gloss),
        id
      )
    };
  }

  /** Record an answer, schedule the next review, persist, move on. */
  async answer(grade: Grade) {
    const task = this.current;
    if (!task) return;
    const key = itemKey(task.tier, task.id, task.kind);
    const existing = this.items.get(key) ?? this.scheduler.create(key, new Date());
    const updated = this.scheduler.grade(existing, grade, new Date());

    const next = new Map(this.items);
    next.set(key, updated);
    this.items = next;

    this.done += 1;
    if (grade !== 'again') this.correct += 1;

    // "Known" is a low bar deliberately: it means "introduced and not
    // actively failing", which is what the sequencer needs to widen the
    // frontier. Mastery is tracked by FSRS, separately.
    if (grade !== 'again' && !this.isKnown(task.tier, task.id)) {
      this.addKnown(task.tier, task.id);
      await local.markKnown(task.tier, task.id);
    }

    await Promise.all([local.saveItem(updated), local.logReview(key, grade)]);
    this.advance();
  }

  private isKnown(tier: TargetTier, id: string) {
    return tier === 'glyph'
      ? this.known.glyphs.has(id)
      : tier === 'lexeme'
        ? this.known.lexemes.has(id)
        : this.known.sentences.has(id);
  }

  private addKnown(tier: TargetTier, id: string) {
    const k: Knowledge = {
      glyphs: new Set(this.known.glyphs),
      lexemes: new Set(this.known.lexemes),
      sentences: new Set(this.known.sentences)
    };
    if (tier === 'glyph') k.glyphs.add(id);
    else if (tier === 'lexeme') k.lexemes.add(id);
    else k.sentences.add(id);
    this.known = k;
  }

  /**
   * Credit everything the placement test proved the learner already knows.
   *
   * Merges rather than replaces, so retaking placement can only ever widen
   * what the sequencer considers known — a worse second attempt should not
   * silently revoke material.
   */
  async seedKnown(seed: Knowledge) {
    const k: Knowledge = {
      glyphs: new Set([...this.known.glyphs, ...seed.glyphs]),
      lexemes: new Set([...this.known.lexemes, ...seed.lexemes]),
      sentences: new Set([...this.known.sentences, ...seed.sentences])
    };
    this.known = k;
    await Promise.all([
      ...[...seed.glyphs].map((id) => local.markKnown('glyph', id)),
      ...[...seed.lexemes].map((id) => local.markKnown('lexeme', id)),
      ...[...seed.sentences].map((id) => local.markKnown('sentence', id))
    ]);
    this.advance();
  }

  /** True until the learner has been placed — drives the first-run prompt. */
  get needsPlacement() {
    return this.ready && !this.placed;
  }

  async setTrack(track: TrackConfig, placement?: { listening: number; script: number; label: string }) {
    this.placed = true;
    this.track = track;
    this.placementLabel = placement?.label ?? null;
    await local.saveProfile({
      id: 'me',
      course: course.meta.code,
      track,
      placement,
      createdAt: new Date().toISOString(),
      userId: null
    });
    this.advance();
  }

  async reset() {
    await local.clearAll();
    this.items = new Map();
    this.known = emptyKnowledge();
    this.done = 0;
    this.correct = 0;
    this.placed = false;
    this.placementLabel = null;
    this.advance();
  }
}

export const session = new SessionState();
