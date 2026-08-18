import { describe, it, expect } from 'vitest';
import course from '../content/bn/course.json' with { type: 'json' };
import type { Course } from '../src/lib/content/schema';
import { ContentGraph, candidates, nextItem, emptyKnowledge, TRACKS } from '../src/lib/engine/sequencer';
import { Scheduler, dueQueue, itemKey } from '../src/lib/engine/scheduler';
import { buildCoverageModel, coverage, highestValueNext, readableSentences } from '../src/lib/engine/coverage';

const bn = course as unknown as Course;
const graph = new ContentGraph(bn);

describe('content graph integrity', () => {
  it('every lexeme glyph resolves', () => {
    const ids = new Set(bn.glyphs.map((g) => g.id));
    for (const l of bn.lexemes) {
      for (const g of l.glyphs) expect(ids, `${l.form} -> ${g}`).toContain(g);
    }
  });

  it('every sentence lexeme resolves', () => {
    const ids = new Set(bn.lexemes.map((l) => l.id));
    for (const s of bn.sentences) {
      for (const l of s.lexemes) expect(ids, `${s.form} -> ${l}`).toContain(l);
    }
  });

  it('conjuncts are ordered after their components', () => {
    const orderOf = new Map(bn.glyphs.map((g) => [g.id, g.order]));
    for (const g of bn.glyphs) {
      if (g.kind !== 'conjunct' || !g.components) continue;
      for (const c of g.components) {
        const co = orderOf.get(c);
        // A component may not be a standalone glyph in this corpus yet;
        // when it is, it must come first.
        if (co !== undefined) expect(co, `${g.form} before ${c}`).toBeLessThan(g.order);
      }
    }
  });

  it('spans point at the right substring', () => {
    const byId = new Map(bn.lexemes.map((l) => [l.id, l]));
    for (const s of bn.sentences) {
      for (const sp of s.spans) {
        const surface = s.form.slice(sp.start, sp.end);
        const lex = byId.get(sp.lexeme)!;
        // Surface form may carry an inflectional suffix, so it must
        // *start with* the lexeme, not equal it.
        expect(surface.startsWith(lex.form), `${s.form}: "${surface}" vs ${lex.form}`).toBe(true);
      }
    }
  });
});

describe('i+1 sequencing', () => {
  it('a blank-slate beginner is offered a glyph, not a sentence', () => {
    const next = nextItem(graph, emptyKnowledge(), TRACKS.beginner);
    expect(next).not.toBeNull();
    expect(next!.tier).toBe('glyph');
  });

  it('never offers a sentence with more unknowns than the budget', () => {
    const known = emptyKnowledge();
    // Seed a realistic partial state: the 20 commonest words.
    for (const l of [...bn.lexemes].sort((a, b) => (a.freqRank ?? 0) - (b.freqRank ?? 0)).slice(0, 20)) {
      known.lexemes.add(l.id);
      for (const g of l.glyphs) known.glyphs.add(g);
    }
    for (const c of candidates(graph, known, TRACKS.both, 1)) {
      if (c.tier !== 'sentence') continue;
      const s = graph.sentences.get(c.id)!;
      const unknown = s.lexemes.filter((l) => !known.lexemes.has(l));
      expect(unknown.length, s.form).toBeLessThanOrEqual(1);
    }
  });

  it('a heritage learner gets script exercises but not listening drills', () => {
    const next = nextItem(graph, emptyKnowledge(), TRACKS.heritage);
    expect(next!.exercises).toContain('glyph-sound');
    expect(next!.exercises).not.toContain('word-listen');
  });

  it('terminates: repeatedly taking the next item exhausts the course', () => {
    const known = emptyKnowledge();
    let steps = 0;
    const cap = bn.glyphs.length + bn.lexemes.length + bn.sentences.length + 10;
    for (;;) {
      const next = nextItem(graph, known, TRACKS.both);
      if (!next) break;
      if (++steps > cap) throw new Error('sequencer failed to terminate');
      if (next.tier === 'glyph') known.glyphs.add(next.id);
      else if (next.tier === 'lexeme') known.lexemes.add(next.id);
      else known.sentences.add(next.id);
    }
    // Everything reachable should have been taught.
    expect(known.glyphs.size + known.lexemes.size + known.sentences.size).toBe(
      bn.glyphs.length + bn.lexemes.length + bn.sentences.length
    );
  });
});

describe('coverage', () => {
  const model = buildCoverageModel(bn);

  it('is zero at the start and rises monotonically', () => {
    const known = new Set<string>();
    expect(coverage(model, known)).toBe(0);
    let prev = 0;
    for (const l of [...bn.lexemes].sort((a, b) => (a.freqRank ?? 0) - (b.freqRank ?? 0)).slice(0, 30)) {
      known.add(l.id);
      const c = coverage(model, known);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
    expect(prev).toBeGreaterThan(0);
  });

  it('never exceeds 1', () => {
    const all = new Set(bn.lexemes.map((l) => l.id));
    expect(coverage(model, all)).toBeLessThanOrEqual(1);
  });

  it('recommends the commonest unknown words first', () => {
    const top = highestValueNext(model, new Set(), 5);
    const ranks = top.map((t) => bn.lexemes.find((l) => l.id === t.id)!.freqRank!);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('readable-sentence share reaches 1 when everything is known', () => {
    expect(readableSentences(bn, new Set(bn.lexemes.map((l) => l.id)))).toBe(1);
  });
});

describe('scheduler', () => {
  const s = new Scheduler();
  const now = new Date('2026-03-01T09:00:00Z');

  it('a new card is immediately due', () => {
    expect(s.isDue(s.create(itemKey('glyph', 'bn-0995', 'glyph-sound'), now), now)).toBe(true);
  });

  it('"easy" schedules further out than "again"', () => {
    const item = s.create(itemKey('lexeme', 'x', 'word-read'), now);
    const easy = s.grade(item, 'easy', now).card.due.getTime();
    const again = s.grade(item, 'again', now).card.due.getTime();
    expect(easy).toBeGreaterThan(again);
  });

  it('surfaces the most-forgotten review first', () => {
    const mk = (id: string, days: number) => {
      let it = s.create(itemKey('lexeme', id, 'word-read'), now);
      it = s.grade(it, 'easy', now);
      // Fast-forward the due date to simulate an overdue card.
      it.card.due = new Date(now.getTime() - days * 864e5);
      it.card.last_review = new Date(now.getTime() - days * 864e5);
      return it;
    };
    const queue = dueQueue([mk('fresh', 1), mk('stale', 400)], s, now);
    expect(queue[0].key).toContain('stale');
  });
});

describe('teaching curve', () => {
  /**
   * Walk the whole course the way a learner would and assert the shape of
   * the trajectory. These guard a balance that is easy to break: weight
   * letters too heavily and the course becomes the alphabet chart it was
   * designed to avoid; too lightly and the script never gets taught.
   */
  function walk() {
    const known = emptyKnowledge();
    const trace: Array<{ step: number; glyphs: number; lexemes: number; sentences: number }> = [];
    let steps = 0;
    let strict = 0;
    for (;;) {
      const strictC = candidates(graph, known, TRACKS.both, 1);
      const next = strictC.length > 0 ? strictC[0] : nextItem(graph, known, TRACKS.both);
      if (!next) break;
      if (strictC.length > 0) strict++;
      steps++;
      if (steps > 2000) throw new Error('did not terminate');
      if (next.tier === 'glyph') known.glyphs.add(next.id);
      else if (next.tier === 'lexeme') known.lexemes.add(next.id);
      else known.sentences.add(next.id);
      trace.push({
        step: steps,
        glyphs: known.glyphs.size,
        lexemes: known.lexemes.size,
        sentences: known.sentences.size
      });
    }
    return { known, trace, steps, strict };
  }

  const { known, trace, steps, strict } = walk();
  const at = (n: number) => trace[Math.min(n, trace.length) - 1];

  it('never teaches a word containing an untaught letter', () => {
    // The core invariant. If this breaks, learners meet script they were
    // never shown and the whole i+1 claim is false.
    for (const id of known.lexemes) {
      const lex = graph.lexemes.get(id)!;
      for (const g of lex.glyphs) expect(known.glyphs, lex.form).toContain(g);
    }
  });

  it('offers a strict i+1 item at every step', () => {
    // Needing to widen the budget means the graph is too sparse.
    expect(strict).toBe(steps);
  });

  it('reaches real words within the first handful of items', () => {
    expect(at(10).lexemes).toBeGreaterThan(0);
  });

  it('reaches real sentences early, not after the alphabet', () => {
    // The failure this guards: letters scored too heavily, so the learner
    // grinds the script before ever seeing a sentence.
    expect(at(30).sentences).toBeGreaterThan(0);
  });

  it('interleaves rather than front-loading letters', () => {
    // At 50 items a learner should have far more words than letters.
    const p = at(50);
    expect(p.lexemes).toBeGreaterThan(p.glyphs * 3);
  });

  it('still teaches the whole script by the end', () => {
    expect(known.glyphs.size).toBe(bn.glyphs.length);
  });

  it('coverage climbs fast early, as word frequency implies', () => {
    const model = buildCoverageModel(bn);
    const first50 = new Set(
      [...bn.lexemes].sort((a, b) => (a.freqRank ?? 0) - (b.freqRank ?? 0)).slice(0, 50).map((l) => l.id)
    );
    expect(coverage(model, first50)).toBeGreaterThan(0.3);
  });
});
