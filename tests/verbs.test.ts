import { describe, it, expect } from 'vitest';
import course from '../content/bn/course.json' with { type: 'json' };
import type { Course, Lemma } from '../src/lib/content/schema';

const bn = course as unknown as Course;
const lemmas: Lemma[] = bn.lemmas ?? [];
const lexById = new Map(bn.lexemes.map((l) => [l.id, l]));

describe('verb paradigms', () => {
  it('exist', () => {
    expect(lemmas.length).toBeGreaterThan(20);
  });

  it('reference only lexemes that are actually in the course', () => {
    // A paradigm naming a form the course does not teach would leave a
    // verb looking regular when a form is simply missing.
    for (const lemma of lemmas) {
      for (const f of lemma.forms) {
        expect(lexById.has(f.lexeme), `${lemma.roman} -> ${f.lexeme}`).toBe(true);
      }
    }
  });

  it('cover every verb in the lexicon', () => {
    // The point of the exercise: no verb form should be stranded as an
    // unrelated vocabulary item.
    const verbs = bn.lexemes.filter((l) => l.pos === 'verb');
    const orphans = verbs.filter((l) => !l.lemma).map((l) => l.roman);
    expect(orphans, `not in any paradigm: ${orphans.join(', ')}`).toEqual([]);
  });

  it('link each lexeme back to the lemma that claims it', () => {
    for (const lemma of lemmas) {
      for (const f of lemma.forms) {
        expect(lexById.get(f.lexeme)!.lemma).toBe(lemma.id);
      }
    }
  });

  it('never assign one form to two verbs', () => {
    const seen = new Map<string, string>();
    for (const lemma of lemmas) {
      for (const f of lemma.forms) {
        expect(seen.has(f.lexeme), `${f.lexeme} claimed by ${seen.get(f.lexeme)} and ${lemma.roman}`).toBe(false);
        seen.set(f.lexeme, lemma.roman);
      }
    }
  });

  it('give finite forms a person and non-finite forms none', () => {
    const nonFinite = new Set(['infinitive', 'verbal-noun', 'perfective-participle']);
    for (const lemma of lemmas) {
      for (const f of lemma.forms) {
        if (nonFinite.has(f.tense)) {
          expect(f.person, `${lemma.roman} ${f.tense}`).toBeUndefined();
        } else {
          expect(f.person, `${lemma.roman} ${f.tense}`).toBeDefined();
        }
      }
    }
  });

  it('never duplicate a person+tense slot within one verb', () => {
    for (const lemma of lemmas) {
      const slots = lemma.forms
        .filter((f) => f.person)
        // A negative occupies the same slot as its positive, legitimately.
        .filter((f) => !f.negative)
        .map((f) => `${f.person}/${f.tense}`);
      expect(new Set(slots).size, `${lemma.roman}: ${slots.join(', ')}`).toBe(slots.length);
    }
  });

  it('flags irregular forms rather than letting a pattern be inferred', () => {
    // যাওয়া's perfect is গেছি, not *যাছি — a learner shown that without a
    // flag would generalise a rule that does not hold.
    const ja = lemmas.find((l) => l.roman === 'jaoya');
    expect(ja).toBeDefined();
    const perfect = ja!.forms.find((f) => f.tense === 'present-perfect');
    expect(perfect?.irregular).toBe(true);
  });

  it('models the suppletive negative of আছ-', () => {
    // Bangla negates আছে with নেই, never *আছে না, so it belongs in the
    // paradigm rather than being derivable.
    const achh = lemmas.find((l) => l.roman === 'achh');
    const nei = achh?.forms.find((f) => f.negative);
    expect(nei).toBeDefined();
    expect(lexById.get(nei!.lexeme)!.roman).toBe('nei');
  });

  it('has enough forms in the big verbs to make a real drill', () => {
    // conjugate needs 3+ distinct forms to offer a meaningful choice.
    const drillable = lemmas.filter((l) => l.forms.length >= 3);
    expect(drillable.length).toBeGreaterThan(5);
  });

  it('is all still draft, pending native review', () => {
    // Conjugation is the likeliest place for drafting to be subtly wrong.
    for (const l of lemmas) expect(l.provenance.status).toBe('draft');
  });
});
