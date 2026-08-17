import { describe, it, expect } from 'vitest';
import {
  analyze,
  clusters,
  glyphsOf,
  glyphId,
  isPrebase,
  VIRAMA
} from '../src/lib/content/scripts/bengali';

/**
 * The analyzer is load-bearing: every lexeme's glyph dependencies are
 * derived from it, so a silent bug here corrupts the whole course graph.
 */

describe('lossless decomposition', () => {
  // Round-tripping is the strongest invariant available — if clusters
  // rejoin to the original NFC string, nothing was dropped or invented.
  const words = [
    'আমি', 'তুমি', 'বাংলা', 'ক্ষমা', 'শিখছি', 'স্কুল',
    'বিদ্যালয়', 'বড়', 'পড়ি', 'হয়েছে', 'ধন্যবাদ', 'ভালো',
    'বিশ্ববিদ্যালয়', 'সংস্কৃত', 'উচ্চারণ'
  ];

  it.each(words)('rejoins %s without loss', (w) => {
    expect(clusters(w).join('')).toBe(w.normalize('NFC'));
  });
});

describe('nukta handling', () => {
  // ড় ঢ় য় sit on Unicode's composition-exclusion list, so NFC leaves
  // them decomposed. They must read as one consonant, not letter+mark.
  it('treats য় as a single consonant', () => {
    const units = analyze('য়');
    expect(units).toHaveLength(1);
    expect(units[0].kind).toBe('consonant');
    expect(units[0].text).toBe('য়'.normalize('NFC'));
  });

  it('keeps the nukta attached inside a word', () => {
    expect(analyze('বড়').map((u) => u.text)).toEqual(['ব', 'ড়'.normalize('NFC')]);
  });

  it('does not emit a bare nukta as its own unit', () => {
    for (const w of ['বড়', 'পড়ি', 'হয়েছে']) {
      expect(analyze(w).some((u) => u.text === '়')).toBe(false);
    }
  });
});

describe('conjuncts', () => {
  it('detects ক্ষ and reports its components', () => {
    const u = analyze('ক্ষমা')[0];
    expect(u.kind).toBe('conjunct');
    expect(u.kind === 'conjunct' && u.components).toEqual(['ক', 'ষ']);
  });

  it('handles three-consonant clusters', () => {
    // স্ত্র  =  স + ্ + ত + ্ + র
    const u = analyze('স্ত্রী')[0];
    expect(u.kind).toBe('conjunct');
    expect(u.kind === 'conjunct' && u.components).toEqual(['স', 'ত', 'র']);
  });

  it('does not treat a trailing virama as a conjunct', () => {
    const units = analyze('উৎ' + VIRAMA);
    expect(units.some((u) => u.kind === 'conjunct')).toBe(false);
  });
});

describe('pre-base vowel signs', () => {
  // ি ে ৈ are written to the LEFT of the consonant they follow in
  // speech. The UI has to flag this or learners mis-decode words.
  it.each(['ি', 'ে', 'ৈ', 'ো', 'ৌ'])('flags %s as pre-base', (sign) => {
    expect(isPrebase(sign)).toBe(true);
  });

  it.each(['া', 'ু', 'ূ', 'ী'])('does not flag %s', (sign) => {
    expect(isPrebase(sign)).toBe(false);
  });

  it('marks the sign in মি as pre-base', () => {
    const sign = analyze('মি').find((u) => u.kind === 'vowel-sign');
    expect(sign && sign.kind === 'vowel-sign' && sign.prebase).toBe(true);
  });
});

describe('glyph ids', () => {
  it('is stable and derived from code points', () => {
    expect(glyphId({ kind: 'consonant', text: 'ক' })).toBe('bn-0995');
  });

  it('gives conjuncts an id distinct from their components', () => {
    const [conj] = analyze('ক্ষ');
    const ids = new Set([glyphId(conj), 'bn-0995', 'bn-09b7']);
    expect(ids.size).toBe(3);
  });

  it('deduplicates repeated glyphs within a word', () => {
    // মামা repeats ম and া; each should appear once as a dependency.
    expect(glyphsOf('মামা')).toEqual(['bn-09ae', 'bn-09be']);
  });
});
