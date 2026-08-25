/**
 * Zuban content schema — deliberately language-agnostic.
 *
 * Bangla is instance #1, not a special case. Everything specific to a
 * language lives in `content/<code>/` as reviewed data; nothing about
 * Bangla is encoded in the engine.
 *
 * The three content tiers form a dependency graph:
 *
 *     Glyph  ──▶ Lexeme ──▶ Sentence
 *   (script)     (word)     (usage)
 *
 * That graph is what makes i+1 sequencing possible: an item is
 * *teachable* when exactly one of its dependencies is still unknown.
 */

/** BCP-47-ish tag. We care about the region: bn-BD and bn-IN diverge. */
export type LangTag = string;

/** Every content record carries its review state. Nothing ships unreviewed. */
export type ReviewStatus =
  | 'draft'      // machine-generated, never shown to learners
  | 'reviewed'   // a native speaker corrected and approved it
  | 'native';    // authored by a native speaker from scratch

export interface Provenance {
  status: ReviewStatus;
  /** Who approved it. Free-form so we can credit contributors. */
  reviewer?: string;
  /** Where a draft came from, e.g. "llm:claude", "tatoeba:6531893". */
  source?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Tier 1 — Glyphs (script atoms)
// ---------------------------------------------------------------------------

export type GlyphKind =
  | 'consonant'
  | 'independent-vowel' // স্বরবর্ণ standing alone, e.g. অ
  | 'vowel-sign'        // কার / matra, attaches to a consonant, e.g. ি
  | 'conjunct'          // যুক্তাক্ষর ligature, e.g. ক্ষ
  | 'diacritic'         // ঁ ং ঃ
  | 'numeral'
  | 'punctuation';

export interface Glyph {
  id: string;
  /** The grapheme as it should be rendered, in NFC. */
  form: string;
  kind: GlyphKind;
  /** Transliteration in the project's romanization scheme. */
  roman: string;
  ipa?: string;
  /**
   * Vowel signs that render to the LEFT of their consonant despite
   * following it phonetically (Bangla ি, ে, ৈ). One of the steepest
   * early hurdles — the UI flags these explicitly.
   */
  prebase?: boolean;
  /**
   * For conjuncts: glyph *ids* of the composing consonants — ids, not
   * raw characters, so it matches every other dependency field.
   * Informational: conjuncts are taught as whole shapes, so this is used
   * for display and ordering, never as a gate.
   */
  components?: string[];
  /**
   * Teaching order. NOT alphabetical — ordered by how much of the
   * corpus the glyph unlocks. See content/bn/README.md.
   */
  order: number;
  /** Lexeme ids that introduce this glyph in context. */
  introducedBy: string[];
  mnemonic?: string;
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Tier 2 — Lexemes (words)
// ---------------------------------------------------------------------------

export interface Lexeme {
  id: string;
  form: string;
  roman: string;
  ipa?: string;
  /** English gloss(es). First is primary. */
  gloss: string[];
  pos?: 'noun' | 'verb' | 'adj' | 'adv' | 'pron' | 'postp' | 'conj' | 'num' | 'part' | 'interj';
  /** Rank in a frequency list; lower is more common. Drives sequencing. */
  freqRank?: number;
  /** Glyph ids this word is built from — its dependencies. */
  glyphs: string[];
  /** Path to pre-generated audio, relative to /audio. */
  audio?: string;
  /** Register matters in Bangla: সাধু (literary) vs চলিত (colloquial). */
  register?: 'cholito' | 'sadhu' | 'neutral';
  /**
   * For an inflected form, the verb it belongs to. Lets the UI show করেন
   * as "করা, said politely" rather than as a word in its own right.
   */
  lemma?: string;
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Verb paradigms
// ---------------------------------------------------------------------------

/**
 * Who the verb ending agrees with.
 *
 * Bangla encodes politeness in the verb itself, not just the pronoun, and
 * the distinction is socially load-bearing rather than stylistic — using
 * the familiar form with someone senior is rude. `2pol` and `3pol` share
 * endings (আপনি করেন / তিনি করেন), which is why they are separate values
 * rather than one "polite".
 */
export type Person = '1' | '2int' | '2fam' | '2pol' | '3' | '3pol';

export type TenseAspect =
  | 'present'
  | 'present-cont'
  | 'present-perfect'
  | 'past'
  | 'future'
  | 'infinitive'
  | 'imperative'
  | 'verbal-noun'
  | 'perfective-participle';

export interface VerbForm {
  /** Lexeme id this form corresponds to. */
  lexeme: string;
  /** Absent for non-finite forms — an infinitive agrees with nobody. */
  person?: Person;
  tense: TenseAspect;
  /**
   * True when the form cannot be derived from the stem by regular rule —
   * যাওয়া's perfect is গেছি, not *যাছি. Flagged so the UI can say so
   * instead of letting a learner infer a pattern that does not hold.
   */
  irregular?: boolean;
  /**
   * A negative form. Bangla usually negates with a following না, but আছে
   * is suppletive — নেই, never *আছে না — so the negative belongs in the
   * paradigm rather than being derivable.
   */
  negative?: boolean;
}

/**
 * A verb as one thing rather than several unrelated words.
 *
 * Without this, করি / করে / করেন / করছি are four vocabulary items that
 * happen to look similar, and a learner memorises each without ever seeing
 * that they are one verb agreeing with different people. That is the
 * difference between reciting phrases and conjugating a verb you have not
 * been drilled on.
 */
export interface Lemma {
  id: string;
  /** Dictionary form, e.g. করা. */
  form: string;
  roman: string;
  /** English infinitive, e.g. "to do". */
  gloss: string;
  /** Shared romanized stem, e.g. "kor". Display only. */
  stem: string;
  forms: VerbForm[];
  /** Anything a learner should know about this verb specifically. */
  note?: string;
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Tier 3 — Sentences (usage)
// ---------------------------------------------------------------------------

export interface Sentence {
  id: string;
  form: string;
  roman: string;
  gloss: string;
  /** Lexeme ids in order of appearance — the dependency list. */
  lexemes: string[];
  /**
   * Character offsets of each lexeme in `form`, so the UI can highlight
   * and cloze without re-tokenizing at runtime. Bangla can't be split on
   * whitespace reliably enough to do this client-side.
   */
  spans: Array<{ lexeme: string; start: number; end: number }>;
  audio?: string;
  /** Grammar note ids this sentence illustrates. */
  notes?: string[];
  /** Rough CEFR-ish band, used only for the placement test. */
  level?: 1 | 2 | 3 | 4 | 5;
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Grammar notes — short and contextual, surfaced on demand.
// Duolingo's documented gap; we treat these as first-class content.
// ---------------------------------------------------------------------------

export interface GrammarNote {
  id: string;
  title: string;
  /** Markdown. Kept to a few sentences — this is a note, not a chapter. */
  body: string;
  /** Sentence ids that demonstrate it. */
  examples: string[];
  provenance: Provenance;
}

// ---------------------------------------------------------------------------
// Course bundle
// ---------------------------------------------------------------------------

export interface CourseMeta {
  code: LangTag;
  name: string;
  nativeName: string;
  /** Script direction; Bangla is ltr but the engine shouldn't assume. */
  dir: 'ltr' | 'rtl';
  /** Font family that must be bundled — never rely on system fonts. */
  font: string;
  romanizationScheme: string;
  description: string;
}

export interface Course {
  meta: CourseMeta;
  glyphs: Glyph[];
  lexemes: Lexeme[];
  sentences: Sentence[];
  notes: GrammarNote[];
  /** Verb paradigms. Empty for languages without meaningful inflection. */
  lemmas: Lemma[];
}

/** Only content a native speaker has signed off on reaches a learner. */
export function isLearnerReady(p: Provenance): boolean {
  return p.status === 'reviewed' || p.status === 'native';
}

export function filterLearnerReady(course: Course): Course {
  const ok = <T extends { provenance: Provenance }>(xs: T[]) =>
    xs.filter((x) => isLearnerReady(x.provenance));
  return {
    meta: course.meta,
    glyphs: ok(course.glyphs),
    lexemes: ok(course.lexemes),
    sentences: ok(course.sentences),
    notes: ok(course.notes),
    lemmas: ok(course.lemmas ?? [])
  };
}
