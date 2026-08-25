/**
 * Build a course bundle from hand-authored source.
 *
 * The point of this step is that no dependency is ever maintained by
 * hand. Glyph lists are derived from the actual Unicode, sentence
 * tokenisation is checked against the lexicon, and teaching order is
 * *computed from corpus reach* rather than assigned.
 *
 * That last part is the pedagogical claim made mechanical: Bangla letters
 * are introduced in the order that unlocks the most real words, not in
 * the order of the আ-আ-ই chart, because the research says conjuncts and
 * letters are learned inside words rather than off a table.
 *
 *   npx tsx scripts/build-content.ts
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyze, glyphId, glyphsOf, isPrebase } from '../src/lib/content/scripts/bengali.ts';
import { lookup } from '../content/bn/glyphs.ts';
import { LEXEMES, SENTENCES, NOTES } from '../content/bn/source.ts';
import { VERBS } from '../content/bn/verbs.ts';
import type {
  Course, Glyph, Lexeme, Sentence, GrammarNote, Lemma, Provenance
} from '../src/lib/content/schema.ts';
import {
  applyReview, indexReview, reviewId, reviewStats, type ReviewFile
} from '../src/lib/content/review.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../content/bn/course.json');
const AUDIO_DIR = resolve(HERE, '../static/audio');

/**
 * Clip filenames are derived from the text itself, so a word and a
 * sentence containing only that word share one recording, and re-running
 * synthesis never duplicates a file.
 */
const clipName = (text: string) =>
  `${createHash('sha1').update(text).digest('hex').slice(0, 16)}.mp3`;

/** Attach a clip only if the file is actually on disk. */
function audioFor(text: string): string | undefined {
  const name = clipName(text);
  return existsSync(resolve(AUDIO_DIR, name)) ? name : undefined;
}

/** Nothing here has been through native review yet. Say so, in the data. */
const DRAFT: Provenance = { status: 'draft', source: 'llm:claude' };

// --- Review overlay ---------------------------------------------------------
//
// Corrections from a native speaker live in review.json, keyed by a hash of
// the original text. They are applied to the source rows *before* glyphs
// and spans are derived — a corrected spelling has different letters, so
// deriving first and correcting after would leave a word carrying the old
// word's dependencies.
const REVIEW_PATH = resolve(HERE, '../content/bn/review.json');
const review: ReviewFile | null = existsSync(REVIEW_PATH)
  ? (JSON.parse(readFileSync(REVIEW_PATH, 'utf-8')) as ReviewFile)
  : null;
const reviewIndex = indexReview(review);
const sha1 = (x: string) => createHash('sha1').update(x).digest('hex');

/**
 * Resolve one drafted record against the overlay.
 *
 * Returns null when a reviewer marked it `drop` — wrong or not worth
 * teaching — so it never reaches the course at all.
 */
function resolveReview(
  kind: 'lexeme' | 'sentence',
  bangla: string,
  roman: string,
  english: string
): { bangla: string; roman: string; english: string; provenance: Provenance } | null {
  const entry = reviewIndex.get(reviewId(kind, bangla, sha1));
  const applied = applyReview({ bangla: bangla.normalize('NFC'), roman, english }, entry);
  if (applied.dropped) return null;
  return {
    ...applied.record,
    provenance:
      applied.status === 'reviewed'
        ? { status: 'reviewed', reviewer: applied.reviewer, source: 'llm:claude' }
        : DRAFT
  };
}

/**
 * Bangla inflectional suffixes, longest first.
 *
 * A learner meeting রাতে should be credited with knowing রাত — the case
 * ending is a separate thing to learn, not a different word. Stripping
 * these is what lets the sentence tokeniser map surface forms onto
 * lexemes without a full morphological analyser.
 */
const SUFFIXES = [
  'দেরকে', 'গুলোকে', 'গুলোর', 'দের', 'গুলো', 'গুলি',
  'টাকে', 'টিকে', 'টার', 'টির', 'কে', 'তে', 'ের', 'রা',
  'টা', 'টি', 'খানা', 'এর', 'য়ে', 'য়', 'ে', 'র'
];

function stripSuffix(word: string): string[] {
  const out = [word];
  for (const s of SUFFIXES) {
    if (word.length > s.length + 1 && word.endsWith(s)) {
      out.push(word.slice(0, -s.length));
    }
  }
  return out;
}

const PUNCT = /[।?!,;:"'()—–-]/g;

function tokenize(sentence: string): string[] {
  return sentence.replace(PUNCT, ' ').split(/\s+/).filter(Boolean);
}

// ---------------------------------------------------------------------------

function build(): {
  course: Course;
  gaps: string[];
  dropped: number;
  lemmaProblems: string[];
} {
  // --- Lexemes -------------------------------------------------------------
  let droppedLexemes = 0;
  const lexemes: Lexeme[] = LEXEMES.flatMap(([form, roman, gloss, pos, freqRank]) => {
    const r = resolveReview('lexeme', form, roman, gloss);
    if (!r) { droppedLexemes++; return []; }
    return [{
      // The id stays keyed to the *original* romanization so a correction
      // does not orphan a learner's existing review history for the word.
      id: `bn-lex-${roman.replace(/[^a-z]/gi, '')}-${freqRank}`,
      form: r.bangla,
      roman: r.roman,
      gloss: r.english.split(/,\s*/),
      pos: pos as Lexeme['pos'],
      freqRank,
      glyphs: glyphsOf(r.bangla),
      register: 'cholito' as const,
      audio: audioFor(r.bangla),
      provenance: r.provenance
    }];
  });

  const byForm = new Map<string, Lexeme>();
  for (const l of lexemes) byForm.set(l.form, l);

  // --- Glyphs: every unit that actually occurs in the lexicon --------------
  const glyphMap = new Map<string, Glyph>();
  const introducedBy = new Map<string, string[]>();

  for (const lex of lexemes) {
    for (const unit of analyze(lex.form)) {
      if (unit.kind === 'punctuation') continue;
      const id = glyphId(unit);
      if (!introducedBy.has(id)) introducedBy.set(id, []);
      introducedBy.get(id)!.push(lex.id);

      if (glyphMap.has(id)) continue;
      const spec = lookup(unit.text);
      glyphMap.set(id, {
        id,
        form: unit.text,
        kind: unit.kind === 'conjunct' ? 'conjunct' : unit.kind,
        roman: spec?.roman ?? '?',
        ipa: spec?.ipa,
        prebase: unit.kind === 'vowel-sign' ? isPrebase(unit.text) : undefined,
        components:
          unit.kind === 'conjunct'
            ? unit.components.map((c) => glyphId({ kind: 'consonant', text: c }))
            : undefined,
        order: 0, // computed below
        introducedBy: [],
        mnemonic: spec?.note,
        provenance: DRAFT
      });
    }
  }

  // --- Sentences: tokenise against the lexicon -----------------------------
  const gaps = new Set<string>();
  const sentences: Sentence[] = [];

  let droppedSentences = 0;
  SENTENCES.forEach(([form, roman, gloss, level], i) => {
    const r = resolveReview('sentence', form, roman, gloss);
    if (!r) { droppedSentences++; return; }
    const nf = r.bangla;
    const ids: string[] = [];
    const spans: Sentence['spans'] = [];
    let cursor = 0;

    for (const token of tokenize(nf)) {
      const at = nf.indexOf(token, cursor);
      if (at >= 0) cursor = at + token.length;

      const match = stripSuffix(token).map((c) => byForm.get(c)).find(Boolean);
      if (match) {
        ids.push(match.id);
        if (at >= 0) spans.push({ lexeme: match.id, start: at, end: at + token.length });
      } else {
        gaps.add(token);
      }
    }

    sentences.push({
      id: `bn-sent-${String(i + 1).padStart(3, '0')}`,
      form: nf,
      roman: r.roman,
      gloss: r.english,
      lexemes: [...new Set(ids)],
      spans,
      level,
      audio: audioFor(nf),
      provenance: r.provenance
    });
  });

  // --- Teaching order: reach, computed from the content itself -------------
  // A glyph's value is how many words it unlocks, weighted by how common
  // those words are. This is what replaces the alphabet chart.
  const reach = new Map<string, number>();
  for (const lex of lexemes) {
    const weight = lex.freqRank ? 1 / Math.log2(lex.freqRank + 2) : 0.1;
    for (const g of lex.glyphs) reach.set(g, (reach.get(g) ?? 0) + weight);
  }

  const ordered = [...glyphMap.values()].sort((a, b) => {
    // Conjuncts always come after their components, whatever their reach.
    const depth = (g: Glyph) => (g.kind === 'conjunct' ? 1 : 0);
    if (depth(a) !== depth(b)) return depth(a) - depth(b);
    return (reach.get(b.id) ?? 0) - (reach.get(a.id) ?? 0);
  });
  ordered.forEach((g, i) => {
    g.order = i + 1;
    g.introducedBy = [...new Set(introducedBy.get(g.id) ?? [])].slice(0, 5);
  });

  // --- Notes ---------------------------------------------------------------
  const sentByForm = new Map(sentences.map((s) => [s.form, s.id]));
  const notes: GrammarNote[] = NOTES.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    examples: n.examples
      .map((e) => sentByForm.get(e.normalize('NFC')))
      .filter((x): x is string => Boolean(x)),
    provenance: DRAFT
  }));

  // Link notes back onto their example sentences so the UI can offer them.
  const noteFor = new Map<string, string[]>();
  for (const n of notes) {
    for (const sid of n.examples) {
      if (!noteFor.has(sid)) noteFor.set(sid, []);
      noteFor.get(sid)!.push(n.id);
    }
  }
  for (const s of sentences) {
    const ns = noteFor.get(s.id);
    if (ns) s.notes = ns;
  }

  // --- Verb paradigms ------------------------------------------------------
  //
  // Resolved against the lexicon rather than trusted: a paradigm naming a
  // form the course does not teach is a content bug, and silently dropping
  // it would leave a verb looking regular when a form is simply missing.
  const byRoman = new Map<string, Lexeme>();
  for (const l of lexemes) byRoman.set(l.roman, l);

  const lemmaProblems: string[] = [];
  const lemmas: Lemma[] = VERBS.map((v) => {
    const forms = v.forms.flatMap(([roman, person, tense, flag]) => {
      const lex = byRoman.get(roman);
      if (!lex) {
        lemmaProblems.push(`${v.roman}: form "${roman}" is not in the lexicon`);
        return [];
      }
      // Point the lexeme back at its verb.
      lex.lemma = `bn-verb-${v.roman}`;
      return [{
        lexeme: lex.id,
        ...(person ? { person } : {}),
        tense,
        ...(flag === 'irregular' ? { irregular: true } : {}),
        ...(flag === 'negative' ? { negative: true } : {})
      }];
    });
    return {
      id: `bn-verb-${v.roman}`,
      form: v.form.normalize('NFC'),
      roman: v.roman,
      gloss: v.gloss,
      stem: v.stem,
      forms,
      note: v.note,
      provenance: DRAFT
    };
  });

  const course: Course = {
    meta: {
      code: 'bn-BD',
      name: 'Bangla',
      nativeName: 'বাংলা',
      dir: 'ltr',
      font: 'Noto Sans Bengali',
      romanizationScheme: 'zuban-bd-practical',
      description: 'Bangladeshi colloquial Bangla (চলিত ভাষা), Dhaka standard.'
    },
    glyphs: ordered,
    lexemes,
    sentences,
    notes,
    lemmas
  };

  return {
    course,
    gaps: [...gaps].sort(),
    dropped: droppedLexemes + droppedSentences,
    lemmaProblems
  };
}

// ---------------------------------------------------------------------------

const { course, gaps, dropped, lemmaProblems } = build();
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(course, null, 2) + '\n', 'utf-8');

const conjuncts = course.glyphs.filter((g) => g.kind === 'conjunct');
const unknownRoman = course.glyphs.filter((g) => g.roman === '?');

console.log(`built ${OUT}`);
console.log(`  glyphs    ${course.glyphs.length}  (${conjuncts.length} conjuncts)`);
console.log(`  lexemes   ${course.lexemes.length}`);
console.log(`  sentences ${course.sentences.length}`);
console.log(`  notes     ${course.notes.length}`);

const verbLexemes = course.lexemes.filter((l) => l.pos === 'verb');
const inParadigm = verbLexemes.filter((l) => l.lemma).length;
console.log(
  `  verbs     ${course.lemmas.length} paradigms covering ${inParadigm}/${verbLexemes.length} verb forms`
);
if (inParadigm < verbLexemes.length) {
  const orphans = verbLexemes.filter((l) => !l.lemma).map((l) => l.roman);
  console.log(`            → ${orphans.length} not in any paradigm: ${orphans.slice(0, 8).join(', ')}${orphans.length > 8 ? '…' : ''}`);
}

// --- Review progress --------------------------------------------------------
const reviewable = course.lexemes.length + course.sentences.length + dropped;
const stats = reviewStats(reviewable, reviewIndex);
const shippable =
  course.lexemes.filter((l) => l.provenance.status !== 'draft').length +
  course.sentences.filter((s) => s.provenance.status !== 'draft').length;

console.log(`  review    ${stats.reviewed}/${reviewable} checked ` +
  `(${stats.ok} ok, ${stats.fixed} corrected, ${stats.dropped} dropped)`);
if (shippable === 0) {
  console.log('            → nothing is native-reviewed, so a production build');
  console.log('              ships an empty course. Run: npm run review:export');
} else {
  console.log(`            → ${shippable} record(s) would reach learners in production`);
}

const withAudio =
  course.lexemes.filter((l) => l.audio).length + course.sentences.filter((s) => s.audio).length;
const totalItems = course.lexemes.length + course.sentences.length;
console.log(`  audio     ${withAudio}/${totalItems} items have a clip`);
if (withAudio === 0) {
  console.log('            → listening exercises stay disabled until clips exist.');
  console.log('            → run: npm run audio:plan');
}

console.log('\nfirst 12 glyphs by computed teaching order:');
console.log('  ' + course.glyphs.slice(0, 12).map((g) => `${g.form}(${g.roman})`).join('  '));

if (unknownRoman.length) {
  console.log(`\n⚠ ${unknownRoman.length} glyph(s) missing a romanization entry:`);
  console.log('  ' + unknownRoman.map((g) => `${g.form} [${g.id}]`).join('  '));
}

if (lemmaProblems.length) {
  console.log(`\n⚠ ${lemmaProblems.length} verb paradigm problem(s):`);
  for (const p of lemmaProblems) console.log(`  ${p}`);
}

if (gaps.length) {
  console.log(`\n⚠ ${gaps.length} sentence token(s) not in the lexicon:`);
  for (const g of gaps) console.log(`  ${g}`);
  console.log('  → add these to content/bn/source.ts, or they stay unteachable.');
}
