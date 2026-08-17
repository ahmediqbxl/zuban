/**
 * Bengali script analysis.
 *
 * Bangla is an abugida, so "letters" in the learner's sense do not map to
 * Unicode code points. A single perceived unit may be a consonant, a
 * consonant plus a vowel sign, or a conjunct built from two or more
 * consonants joined by an invisible virama (হসন্ত, U+09CD).
 *
 * Decomposing text mechanically — rather than hand-maintaining a glyph
 * list per word — is what keeps the content pipeline honest as the course
 * grows. It is also how conjuncts get detected: the literature is clear
 * that they must be taught as whole shapes inside real words, so we need
 * to know exactly which ones a given word contains.
 */

export const VIRAMA = '্'; // হসন্ত

const CONSONANTS = new Set([...'কখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহ', 'ৎ']);

/**
 * U+09BC NUKTA. Bengali ড় ঢ় য় have canonical decompositions and sit on
 * Unicode's composition-exclusion list, so NFC leaves them as consonant +
 * nukta. They must be absorbed back into a single consonant unit or the
 * learner is shown a combining mark as though it were a letter.
 */
const NUKTA = '\u09BC';

const INDEPENDENT_VOWELS = new Set([...'অআইঈউঊঋএঐওঔ']);

/** কার — attach to a consonant and never stand alone. */
const VOWEL_SIGNS = new Set([...'ািীুূৃেৈোৌ']);

/**
 * Vowel signs rendered to the LEFT of the consonant they phonetically
 * follow. This reordering is one of the steepest early hurdles in
 * learning the script and the UI calls it out explicitly.
 *
 * ো and ৌ are two-part signs that wrap around the consonant; they
 * include a left-side component, so they belong here too.
 */
const PREBASE = new Set(['ি', 'ে', 'ৈ', 'ো', 'ৌ']);

const DIACRITICS = new Set(['ঁ', 'ং', 'ঃ']); // ঁ ং ঃ

const DIGITS = new Set([...'০১২৩৪৫৬৭৮৯']);

export type Unit =
  | { kind: 'consonant'; text: string }
  | { kind: 'conjunct'; text: string; components: string[] }
  | { kind: 'independent-vowel'; text: string }
  | { kind: 'vowel-sign'; text: string; prebase: boolean }
  | { kind: 'diacritic'; text: string }
  | { kind: 'numeral'; text: string }
  | { kind: 'punctuation'; text: string };

export function isConsonant(ch: string): boolean {
  return CONSONANTS.has(ch);
}

export function isVowelSign(ch: string): boolean {
  return VOWEL_SIGNS.has(ch);
}

export function isPrebase(ch: string): boolean {
  return PREBASE.has(ch);
}

/**
 * Split Bangla text into the units a learner actually perceives.
 *
 * Conjuncts are emitted as single units carrying their components, which
 * is what lets the sequencer require the parts before teaching the whole.
 */
export function analyze(text: string): Unit[] {
  const chars = [...text.normalize('NFC')];
  const units: Unit[] = [];
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];

    if (isConsonant(ch)) {
      // Absorb a following nukta, then greedily absorb  (virama C)+  into
      // one conjunct. Both steps may repeat for each member of a cluster.
      let j = i;
      const take = (): string => {
        let c = chars[j++];
        if (chars[j] === NUKTA) c += chars[j++];
        return c;
      };
      const first = take();
      const components = [first];
      let text = first;
      while (j + 1 < chars.length && chars[j] === VIRAMA && isConsonant(chars[j + 1])) {
        const virama = chars[j++];
        const next = take();
        text += virama + next;
        components.push(next);
      }
      if (components.length > 1) {
        units.push({ kind: 'conjunct', text, components });
      } else {
        units.push({ kind: 'consonant', text });
      }
      i = j;
      continue;
    }

    if (INDEPENDENT_VOWELS.has(ch)) {
      units.push({ kind: 'independent-vowel', text: ch });
    } else if (VOWEL_SIGNS.has(ch)) {
      units.push({ kind: 'vowel-sign', text: ch, prebase: PREBASE.has(ch) });
    } else if (DIACRITICS.has(ch)) {
      units.push({ kind: 'diacritic', text: ch });
    } else if (DIGITS.has(ch)) {
      units.push({ kind: 'numeral', text: ch });
    } else if (ch === NUKTA) {
      // Only reachable on malformed text (nukta with no base consonant).
      units.push({ kind: 'diacritic', text: ch });
    } else if (ch === VIRAMA) {
      // A trailing virama with no following consonant is a visible হসন্ত.
      units.push({ kind: 'diacritic', text: ch });
    } else if (ch.trim() !== '') {
      units.push({ kind: 'punctuation', text: ch });
    }
    i++;
  }

  return units;
}

/** Stable glyph id for a unit — the code points, dot-separated. */
export function glyphId(unit: Unit): string {
  const cps = [...unit.text].map((c) => c.codePointAt(0)!.toString(16).padStart(4, '0'));
  return `bn-${cps.join('.')}`;
}

/** Distinct glyph ids a string depends on, in order of first appearance. */
export function glyphsOf(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of analyze(text)) {
    if (u.kind === 'punctuation') continue;
    const id = glyphId(u);
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/**
 * Grapheme clusters for display: a consonant or conjunct plus whatever
 * vowel sign and diacritics hang off it. This is the unit the UI
 * highlights and animates, and it is NOT the same as a glyph dependency.
 */
export function clusters(text: string): string[] {
  const units = analyze(text);
  const out: string[] = [];
  for (const u of units) {
    const attaches = u.kind === 'vowel-sign' || u.kind === 'diacritic';
    if (attaches && out.length > 0) {
      out[out.length - 1] += u.text;
    } else {
      out.push(u.text);
    }
  }
  return out;
}
