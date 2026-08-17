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

export const glyphById = new Map(course.glyphs.map((g) => [g.id, g]));
export const lexemeById = new Map(course.lexemes.map((l) => [l.id, l]));
export const sentenceById = new Map(course.sentences.map((s) => [s.id, s]));

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
}

class SessionState {
  scheduler = new Scheduler();
  items = $state(new Map<ItemKey, ReviewItem>());
  known = $state<Knowledge>(emptyKnowledge());
  track = $state<TrackConfig>(TRACKS.both);
  ready = $state(false);
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
    if (profile) this.track = profile.track;
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
    const kind = next.exercises[0];
    if (!kind) {
      this.current = null;
      return;
    }
    this.current = this.buildTask(itemKey(next.tier, next.id, kind), true);
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
    // Seeded rotation keeps the answer off position 0 without randomness.
    const h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const k = h % all.length;
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
      const pool = course.lexemes.map((x) => x.gloss[0]);
      const opts = this.shuffleWithAnswer(l.gloss[0], this.distractors(pool, l.gloss[0]), id);
      return {
        kind, tier, id, isNew,
        prompt: l.form,
        answer: l.gloss[0],
        options: opts
      };
    }

    const s = sentenceById.get(id);
    if (!s) return null;
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
        note: lex ? `${lex.roman} — ${lex.gloss[0]}` : undefined
      };
    }
    return { kind, tier, id, isNew, prompt: s.form, answer: s.gloss };
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

  async setTrack(track: TrackConfig, placement?: { listening: number; script: number; label: string }) {
    this.track = track;
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
    this.advance();
  }
}

export const session = new SessionState();
