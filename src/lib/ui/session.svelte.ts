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
import { computeStats, type DayRow, type Stats } from './stats';
import * as local from '$db/local';
import { clusters } from '$content/scripts/bengali';
import { speech } from './speech.svelte';

/**
 * Drafts are shown in dev only, behind a visible banner. Without this the
 * app is empty until a native speaker reviews the seed content — correct
 * for production, useless for building.
 */
export const SHOW_DRAFTS = import.meta.env.DEV;

const raw = courseData as unknown as Course;
export const course: Course = SHOW_DRAFTS ? raw : filterLearnerReady(raw);
export const graph = new ContentGraph(course);

/**
 * True when the review gate has withheld everything.
 *
 * A production build ships only content a native speaker has approved, so
 * before review lands the course is legitimately empty. Saying so plainly
 * beats a silent 0% with nothing to tap, which reads as a broken app.
 */
export const awaitingReview =
  course.lexemes.length === 0 && raw.lexemes.length > 0;

/** Sizes of the unfiltered bundle, for the awaiting-review message. */
export const rawCounts = {
  lexemes: raw.lexemes.length,
  sentences: raw.sentences.length,
  glyphs: raw.glyphs.length
};
export const coverageModel = buildCoverageModel(course);

/**
 * Exercises that need sound are only offered once sound exists.
 *
 * The sequencer plans by track, not by asset availability, so without this
 * a learner on the listening track would be served a card with nothing to
 * listen to. Recording is incremental, so this flips on per item.
 */
/**
 * Exercises that cannot be posed without a voice.
 *
 * "A voice" means either a clip we ship or a Bengali speech synthesiser on
 * the device — so this is a runtime check, not a content check. Speaking
 * exercises are deliberately absent: saying a phrase from an English
 * prompt is useful practice even with no model to hear afterwards.
 */
const AUDIO_REQUIRED = new Set(['word-listen', 'sentence-listen', 'glyph-find']);

function hasVoice(clip?: string): boolean {
  return Boolean(clip) || speech.status === 'synth';
}

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
  /**
   * The Bangla script form, carried even for learners who never see it —
   * a speech synthesiser fed romanization reads it as English.
   */
  bangla?: string;
  /** Romanized answer, shown on reveal for speaking exercises. */
  roman?: string;
  /** Self-graded rather than multiple choice. */
  selfGraded?: boolean;
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
  days = $state<DayRow[]>([]);
  /** Exercise kinds the sequencer planned per item, pending seeding. */
  private plannedFor = new Map<string, ExerciseKind[]>();

  async load() {
    const [items, known, profile, days] = await Promise.all([
      local.loadItems(),
      local.loadKnown(),
      local.loadProfile(),
      local.loadDays()
    ]);
    this.items = items;
    this.known = known;
    this.days = days;
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

  get stats(): Stats {
    return computeStats(this.days);
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
    const due = dueQueue([...this.items.values()], this.scheduler, now, 8);
    for (const item of due) {
      const task = this.buildTask(item.key, false);
      if (task && this.isAnswerable(task)) {
        this.current = task;
        return;
      }
    }
    const next = nextItem(graph, this.known, this.track);
    if (!next) {
      this.current = null;
      return;
    }
    // Walk the planned exercises and take the first that can actually be
    // rendered — an audio card with no clip is worse than no card. The
    // rest are seeded once this one is answered, so a word gets drilled
    // from several angles rather than only the first that happened to fit.
    for (const kind of next.exercises) {
      const task = this.buildTask(itemKey(next.tier, next.id, kind), true);
      if (task && this.isAnswerable(task)) {
        this.current = task;
        this.plannedFor.set(`${next.tier}:${next.id}`, next.exercises);
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
      // glyph-sound shows the letter and asks for its sound; glyph-find
      // plays the sound and asks for the letter. Same pair, opposite
      // direction, so the options come from opposite columns.
      const opts =
        kind === 'glyph-find'
          ? this.shuffleWithAnswer(
              g.form,
              this.distractors(course.glyphs.map((x) => x.form), g.form),
              id
            )
          : this.shuffleWithAnswer(
              g.roman,
              this.distractors(course.glyphs.map((x) => x.roman), g.roman),
              id
            );

      // Always anchor a glyph to a real word that contains it. Prefer the
      // commonest introducing word so the example is one worth knowing.
      const example = g.introducedBy
        .map((lid) => lexemeById.get(lid))
        .filter((l): l is NonNullable<typeof l> => Boolean(l))
        .sort((a, b) => (a.freqRank ?? 1e9) - (b.freqRank ?? 1e9))[0];

      return {
        kind, tier, id, isNew,
        // A vowel sign cannot stand alone, so show it on a neutral base.
        // glyph-find shows nothing — the learner is answering from sound.
        prompt: kind === 'glyph-find' ? '' : g.kind === 'vowel-sign' ? `ক${g.form}` : g.form,
        answer: kind === 'glyph-find' ? g.form : g.roman,
        options: opts,
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
      if (AUDIO_REQUIRED.has(kind) && !hasVoice(l.audio)) return null;

      if (kind === 'say-word' || kind === 'say-sentence') {
        // Production: the learner is shown English and has to say the
        // Bangla before revealing. Self-graded — no recogniser is reliable
        // enough for Bengali to fail someone on.
        return {
          kind, tier, id, isNew,
          prompt: l.gloss[0],
          answer: l.roman,
          roman: l.roman,
          bangla: l.form,
          audio: l.audio,
          selfGraded: true,
          note: l.gloss.slice(1).join(', ') || undefined
        };
      }

      if (kind === 'word-recall') {
        // Same recognition test as word-read, but posed in romanization so
        // it works for a learner who is not studying the script.
        const pool = course.lexemes.map((x) => x.gloss[0]);
        return {
          kind, tier, id, isNew,
          prompt: l.roman,
          answer: l.gloss[0],
          bangla: l.form,
          audio: l.audio,
          options: this.shuffleWithAnswer(l.gloss[0], this.distractors(pool, l.gloss[0]), id)
        };
      }

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
        audio: l.audio,
        bangla: l.form
      };
    }

    const s = sentenceById.get(id);
    if (!s) return null;
    if (AUDIO_REQUIRED.has(kind) && !hasVoice(s.audio)) return null;

    if (kind === 'say-sentence') {
      return {
        kind, tier, id, isNew,
        prompt: s.gloss,
        answer: s.roman,
        roman: s.roman,
        bangla: s.form,
        audio: s.audio,
        selfGraded: true
      };
    }

    if (kind === 'cloze-roman' && s.spans.length > 0) {
      // Romanized cloze: tests sentence construction without the script.
      const target =
        s.spans.find((sp) => !this.known.lexemes.has(sp.lexeme)) ?? s.spans[s.spans.length - 1];
      const lex = lexemeById.get(target.lexeme);
      if (!lex) return null;
      // Romanization has no reliable span mapping back to the script
      // offsets, so blank the word by string replacement instead.
      const idx = s.roman.toLowerCase().indexOf(lex.roman.toLowerCase());
      if (idx < 0) return null;
      const pool = course.lexemes.map((x) => x.roman);
      return {
        kind, tier, id, isNew,
        prompt: s.roman,
        answer: lex.roman,
        bangla: s.form,
        audio: s.audio,
        blank: { start: idx, end: idx + lex.roman.length },
        options: this.shuffleWithAnswer(lex.roman, this.distractors(pool, lex.roman), id),
        note: `${s.gloss}`
      };
    }

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
      bangla: s.form,
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
      // Seed the item's other exercises so they enter the review rotation.
      // Reading a word and spelling it are different skills scheduled
      // independently — without this the first exercise that fit was the
      // only one a learner ever saw, and production was never practised.
      await this.seedSiblingExercises(task);
      await this.creditIntroduced(task);
    }

    await Promise.all([
      local.saveItem(updated),
      local.logReview(key, grade),
      // Recorded after the knowledge update so today's row carries the
      // coverage the learner actually ended the session with.
      local.recordActivity(grade !== 'again', this.coverage)
    ]);
    this.days = await local.loadDays();
    this.advance();
  }

  /**
   * Credit the letters a word just introduced, and queue them for drilling.
   *
   * This is the mechanism behind "letters are learned inside words". A word
   * is teachable when at most one of its letters is new, so meeting the
   * word *is* meeting the letter — but the letter also has to be marked
   * known, or the frontier never advances and unknown letters quietly
   * accumulate across words the learner supposedly knows. Letters credited
   * this way still get their own review cards, so they are practised
   * explicitly rather than assumed.
   *
   * Only applies when the learner is studying the script at all.
   */
  private async creditIntroduced(task: Task) {
    if (!this.track.script || task.tier !== 'lexeme') return;
    const lex = lexemeById.get(task.id);
    if (!lex) return;

    const fresh = lex.glyphs.filter((g) => !this.known.glyphs.has(g));
    if (fresh.length === 0) return;

    const now = new Date();
    const items = new Map(this.items);
    const writes: Promise<unknown>[] = [];

    for (const gid of fresh) {
      this.addKnown('glyph', gid);
      writes.push(local.markKnown('glyph', gid));
      // Queue the letter for explicit practice now that it has been met.
      for (const kind of ['glyph-sound', 'glyph-find'] as const) {
        const key = itemKey('glyph', gid, kind);
        if (items.has(key)) continue;
        const preview = this.buildTask(key, true);
        if (!preview || !this.isAnswerable(preview)) continue;
        const item = this.scheduler.create(key, now);
        items.set(key, item);
        writes.push(local.saveItem(item));
      }
    }

    this.items = items;
    await Promise.all(writes);
  }

  /**
   * Create cards for the item's remaining exercise kinds.
   *
   * They start due, so they surface as reviews shortly after the item is
   * introduced — read it, then spell it — rather than all at once much
   * later. Unrenderable kinds (audio with no clip) are skipped and will be
   * picked up whenever a recording lands.
   */
  private async seedSiblingExercises(task: Task) {
    const planned = this.plannedFor.get(`${task.tier}:${task.id}`) ?? [];
    const now = new Date();
    const next = new Map(this.items);
    const writes: Promise<unknown>[] = [];

    for (const kind of planned) {
      if (kind === task.kind) continue;
      const key = itemKey(task.tier, task.id, kind);
      if (next.has(key)) continue;
      const preview = this.buildTask(key, true);
      if (!preview || !this.isAnswerable(preview)) continue; // not renderable yet
      const item = this.scheduler.create(key, now);
      next.set(key, item);
      writes.push(local.saveItem(item));
    }

    if (writes.length > 0) {
      this.items = next;
      await Promise.all(writes);
    }
    this.plannedFor.delete(`${task.tier}:${task.id}`);
  }

  /**
   * A card the learner can actually act on.
   *
   * Cheap insurance: a multiple-choice card with no options, or a spelling
   * card with no tiles, is a dead end that strands the session. Better to
   * skip it than to render something unanswerable.
   */
  private isAnswerable(task: Task): boolean {
    if (task.selfGraded) return true;
    if (task.kind === 'word-spell') return (task.tiles?.length ?? 0) > 0;
    return (task.options?.length ?? 0) > 1;
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
    this.days = [];
    this.advance();
  }
}

export const session = new SessionState();
