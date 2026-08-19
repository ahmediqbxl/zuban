import { describe, it, expect } from 'vitest';
import course from '../content/bn/course.json' with { type: 'json' };
import type { Course } from '../src/lib/content/schema';
import { SOUND_GROUPS, TRICKY } from '../content/bn/sounds';

const bn = course as unknown as Course;
const allSounds = SOUND_GROUPS.flatMap((g) => g.sounds);

describe('pronunciation guide', () => {
  it('covers every sound flagged as tricky', () => {
    // A romanization flagged as tricky but absent from the guide produces a
    // card that promises a hint and shows nothing.
    const documented = new Set(allSounds.map((s) => s.roman));
    for (const roman of TRICKY) {
      expect(documented, `"${roman}" is flagged tricky but has no entry`).toContain(roman);
    }
  });

  it('gives every sound a tip and an IPA transcription', () => {
    for (const s of allSounds) {
      expect(s.tip.length, s.roman).toBeGreaterThan(20);
      expect(s.ipa.length, s.roman).toBeGreaterThan(0);
    }
  });

  it('documents the dental/retroflex pairs, which is the point', () => {
    // English t sits closest to the retroflex, so reading `t` with an
    // English t produces the wrong letter. Both halves must be explained.
    for (const roman of ['t', 'ṭ', 'd', 'ḍ']) {
      const s = allSounds.find((x) => x.roman === roman);
      expect(s, `missing ${roman}`).toBeDefined();
    }
    expect(allSounds.find((s) => s.roman === 't')?.pitfall).toBeTruthy();
    expect(allSounds.find((s) => s.roman === 'ṭ')?.pitfall).toBeTruthy();
  });

  it('warns that th is not the English th', () => {
    const th = allSounds.find((s) => s.roman === 'th');
    expect(th?.tip).toMatch(/NOT|not/);
  });

  it('orders groups so the highest-impact ones come first', () => {
    const priorities = SOUND_GROUPS.map((g) => g.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
    expect(priorities[0]).toBe(1);
  });

  it('every documented sound actually occurs in the course', () => {
    // A guide entry for a sound no word uses is dead weight, and suggests
    // the romanization scheme drifted from the content.
    const inCourse = new Set(bn.glyphs.map((g) => g.roman));
    const skip = new Set(['(final o)', 's']); // described in prose, not a single glyph
    for (const s of allSounds) {
      if (skip.has(s.roman)) continue;
      const covered = inCourse.has(s.roman) || s.script.split(' / ').some((f) =>
        bn.glyphs.some((g) => g.form === f)
      );
      expect(covered, `"${s.roman}" (${s.script}) is documented but unused`).toBe(true);
    }
  });

  it('flags sounds that genuinely differ, not mere spelling variants', () => {
    // ি vs ই are the same sound spelled differently — not worth a hint.
    // ত vs ট are different sounds — worth one.
    expect(TRICKY.has('t')).toBe(true);
    expect(TRICKY.has('ṭ')).toBe(true);
    expect(TRICKY.has('i')).toBe(false);
    expect(TRICKY.has('e')).toBe(false);
  });
});
