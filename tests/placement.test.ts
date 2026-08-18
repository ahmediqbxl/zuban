import { describe, it, expect } from 'vitest';
import course from '../content/bn/course.json' with { type: 'json' };
import type { Course } from '../src/lib/content/schema';
import { buildProbes, scorePlacement, presentOptions } from '../src/lib/engine/placement';

const bn = course as unknown as Course;
const probes = buildProbes(bn);

/** Answer every probe on the named axes correctly, the rest wrongly. */
function respond(correctAxes: Array<'listening' | 'script'>) {
  const r: Record<string, number> = {};
  for (const p of probes) {
    r[p.id] = correctAxes.includes(p.axis) ? p.answer : (p.answer + 1) % p.options.length;
  }
  return r;
}

describe('probe construction', () => {
  it('produces probes on both axes even with no audio recorded', () => {
    // The course currently has no audio; the comprehension axis must fall
    // back to romanization rather than silently producing nothing.
    expect(bn.sentences.filter((s) => s.audio).length).toBe(0);
    expect(probes.filter((p) => p.axis === 'listening').length).toBeGreaterThan(0);
    expect(probes.filter((p) => p.axis === 'script').length).toBeGreaterThan(0);
  });

  it('never offers duplicate options', () => {
    // শ and ষ both romanize to "sh"; an exercise with two identical
    // options has no correct answer.
    for (const p of probes) {
      expect(new Set(p.options).size, `${p.id}: ${p.options.join('/')}`).toBe(p.options.length);
    }
  });

  it('gives every probe exactly four options', () => {
    for (const p of probes) expect(p.options.length, p.id).toBe(4);
  });

  it('shows script probes in Bangla and comprehension probes in romanization', () => {
    for (const p of probes) {
      if (p.axis === 'script') expect(p.prompt.text).toMatch(/[ঀ-৿]/);
      else if (p.prompt.text) expect(p.prompt.text).not.toMatch(/[ঀ-৿]/);
    }
  });
});

describe('option presentation', () => {
  it('moves the answer off position 0', () => {
    // Otherwise the first option is always correct and the test is free.
    for (const p of probes) {
      expect(presentOptions(p)[0].isAnswer, p.id).toBe(false);
    }
  });

  it('is stable across calls', () => {
    for (const p of probes) {
      expect(presentOptions(p).map((o) => o.text)).toEqual(presentOptions(p).map((o) => o.text));
    }
  });

  it('preserves every option exactly once', () => {
    for (const p of probes) {
      expect(presentOptions(p).map((o) => o.text).sort()).toEqual([...p.options].sort());
    }
  });
});

describe('scoring', () => {
  it('classifies a heritage learner: understands, cannot read', () => {
    const r = scorePlacement(bn, probes, respond(['listening']));
    expect(r.label).toBe('heritage');
    expect(r.track.listening).toBe(false); // don't waste their time
    expect(r.track.script).toBe(true);
  });

  it('classifies a cold beginner', () => {
    const r = scorePlacement(bn, probes, respond([]));
    expect(r.label).toBe('beginner');
    expect(r.track.script).toBe(true);
    expect(r.track.listening).toBe(true);
  });

  it('classifies a formally-taught learner: reads, does not understand', () => {
    const r = scorePlacement(bn, probes, respond(['script']));
    expect(r.label).toBe('literate');
    expect(r.track.script).toBe(false);
  });

  it('classifies someone with both', () => {
    expect(scorePlacement(bn, probes, respond(['listening', 'script'])).label).toBe('intermediate');
  });

  it('credits vocabulary but NOT letters when only comprehension is proven', () => {
    // Understanding a sentence by ear says nothing about spelling. Seeding
    // glyphs here would skip a heritage learner past the one thing they
    // actually need.
    const r = scorePlacement(bn, probes, respond(['listening']));
    expect(r.known.lexemes.size).toBeGreaterThan(0);
    expect(r.known.glyphs.size).toBe(0);
  });

  it('credits letters when reading is proven', () => {
    const r = scorePlacement(bn, probes, respond(['script']));
    expect(r.known.glyphs.size).toBeGreaterThan(0);
  });

  it('treats a skipped probe as unknown', () => {
    const skipped: Record<string, number> = {};
    for (const p of probes) skipped[p.id] = -1;
    const r = scorePlacement(bn, probes, skipped);
    expect(r.label).toBe('beginner');
    expect(r.known.lexemes.size).toBe(0);
  });

  it('seeds only content that exists in the course', () => {
    const r = scorePlacement(bn, probes, respond(['listening', 'script']));
    const lex = new Set(bn.lexemes.map((l) => l.id));
    const gly = new Set(bn.glyphs.map((g) => g.id));
    for (const id of r.known.lexemes) expect(lex).toContain(id);
    for (const id of r.known.glyphs) expect(gly).toContain(id);
  });
});

describe('answer position is not guessable', () => {
  it('the correct option is never first, across every probe', () => {
    // Regression: a zero rotation left the answer at index 0, making
    // "always tap the top option" a perfect strategy.
    for (const p of probes) expect(presentOptions(p)[0].isAnswer, p.id).toBe(false);
  });

  it('answers spread across more than one position', () => {
    const positions = new Set(
      probes.map((p) => presentOptions(p).findIndex((o) => o.isAnswer))
    );
    expect(positions.size).toBeGreaterThan(1);
  });
});
