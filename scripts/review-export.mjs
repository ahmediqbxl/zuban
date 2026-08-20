/**
 * Export the course for native-speaker review.
 *
 * Produces a CSV that opens in Excel, Numbers or Google Sheets, so review
 * needs no git, no editor, and no programming. That is the whole point:
 * the blocker on this course is a native Bangla speaker's time, and
 * requiring them to edit TypeScript rules out almost all of them.
 *
 *   node scripts/review-export.mjs                 # everything, commonest first
 *   node scripts/review-export.mjs --limit 100     # a manageable first batch
 *   node scripts/review-export.mjs --pending       # skip what's already reviewed
 *
 * Rows are ordered by frequency, so a partial review still covers the
 * words a learner meets most.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const COURSE = 'content/bn/course.json';
const REVIEW = 'content/bn/review.json';
const args = process.argv.slice(2);
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
const pendingOnly = args.includes('--pending');
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'content/bn/review.csv';

const sha1 = (s) => createHash('sha1').update(s).digest('hex');
const reviewId = (kind, bangla) =>
  `${kind === 'lexeme' ? 'L' : 'S'}-${sha1(`${kind}|${bangla.normalize('NFC')}`).slice(0, 10)}`;

/** RFC 4180 quoting. Glosses contain commas; notes may contain quotes. */
const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const course = JSON.parse(readFileSync(COURSE, 'utf-8'));
const existing = existsSync(REVIEW) ? JSON.parse(readFileSync(REVIEW, 'utf-8')) : { entries: [] };
const done = new Set(existing.entries.map((e) => e.id));

const rows = [
  ...course.lexemes.map((l) => ({
    kind: 'lexeme',
    rank: l.freqRank ?? 1e9,
    bangla: l.form,
    roman: l.roman,
    english: l.gloss.join(', ')
  })),
  ...course.sentences.map((s) => ({
    kind: 'sentence',
    // Sentences after words of similar utility: a reviewer checking words
    // first makes the sentences quicker to judge.
    rank: 1e6 + (s.level ?? 3) * 1000,
    bangla: s.form,
    roman: s.roman,
    english: s.gloss
  }))
]
  .map((r) => ({ ...r, id: reviewId(r.kind, r.bangla) }))
  .filter((r) => !pendingOnly || !done.has(r.id))
  .sort((a, b) => a.rank - b.rank)
  .slice(0, limit);

const HEADERS = [
  'id', 'type', 'bangla', 'romanization', 'english',
  'verdict', 'bangla_fixed', 'romanization_fixed', 'english_fixed', 'note'
];

const lines = [
  HEADERS.join(','),
  ...rows.map((r) =>
    [r.id, r.kind, r.bangla, r.roman, r.english, '', '', '', '', ''].map(cell).join(',')
  )
];

// A UTF-8 BOM. Without it Excel guesses the encoding and renders Bangla as
// mojibake — which makes the file useless to the exact person it is for.
writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n', 'utf-8');

/**
 * Write the instructions next to the sheet.
 *
 * They used to exist only as console output, which meant whoever ran the
 * export had to remember to relay them. A reviewer who receives the CSV on
 * its own has no way to know what the verdict column wants.
 */
const instructionsPath = out.replace(/\.csv$/, '-instructions.txt');
writeFileSync(instructionsPath, `Reviewing the Zuban Bangla course
==================================

Thank you — this is the one part of the project that cannot be automated.

WHAT THIS IS
Every Bangla word and phrase in the course was drafted by an AI and has
NOT been checked by a Bangla speaker. Until someone does, none of it is
shown to learners. That is deliberate: teaching mistakes is worse than
teaching nothing.

The course teaches BANGLADESHI colloquial Bangla (cholito bhasha, Dhaka)
- so পানি rather than জল. Please judge it by that standard.

WHAT TO DO
Open the .csv in Excel, Numbers or Google Sheets. For each row, fill in
the "verdict" column with one of:

  ok    - correct as written, nothing to change
  fix   - wrong; put the correction in the *_fixed columns
  drop  - wrong, unnatural, or not worth teaching; it gets removed

Only fill a *_fixed column if you are changing that field. If the Bangla
is right but the English is wrong, only fill english_fixed.

Use "note" for anything worth explaining - if a phrase is too formal, or
something you would only say to family, or a word that is regional.

IF YOU ARE UNSURE, LEAVE THE VERDICT BLANK. Blank means "not reviewed",
and unreviewed content stays hidden from learners. A blank row is far
more useful than a guess.

HOW MUCH
Rows are ordered by how common the word is, so the first ones matter
most. Stopping partway through is genuinely useful - the first 50 rows
reviewed beats 400 rows guessed at.

WHAT TO LOOK FOR
The drafting AI is most likely to be wrong about:
  - Verb endings, especially politeness (আছ / আছেন / আছে)
  - Register - writing sadhu (formal/literary) where cholito (spoken) belongs
  - Whether the romanization matches how it is actually pronounced
  - Phrases that are grammatically fine but nobody would actually say

When you are done, send the file back.
`, 'utf-8');


console.log(`wrote ${out}`);
console.log(`  ${rows.length} rows (${rows.filter((r) => r.kind === 'lexeme').length} words, ${rows.filter((r) => r.kind === 'sentence').length} sentences)`);
if (done.size) console.log(`  ${done.size} already reviewed${pendingOnly ? ' (excluded)' : ' (included — use --pending to skip)'}`);
console.log(`wrote ${instructionsPath}`);
console.log(`
Send BOTH files to a Bangla speaker — the instructions explain the verdict
column, which is not self-evident from the sheet alone.

When it comes back:
  node scripts/review-import.mjs ${out} --reviewer "Their Name"`);
