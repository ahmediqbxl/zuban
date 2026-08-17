# Bangla (bn-BD)

Bangladeshi colloquial Bangla — চলিত ভাষা, Dhaka standard.

## Files

| file | role |
|---|---|
| `source.ts` | Hand-authored lexemes, sentences, grammar notes. **Edit this.** |
| `glyphs.ts` | Romanization table for the script, tuned to bn-BD pronunciation. |
| `course.json` | Built artifact. **Never edit** — regenerate with `npm run build:content`. |

## Dialect policy

Where Dhaka and Kolkata differ, the Dhaka form wins and the difference is
noted rather than hidden:

| Bangladesh | West Bengal | meaning |
|---|---|---|
| পানি | জল | water |
| নুন | লবণ | salt |

The `pani-vs-jol` grammar note explains this to learners directly. A
bn-IN variant is a separate course bundle, not a fork of this one — the
schema carries dialect at the course level for exactly that reason.

## Review workflow

**All content here is currently `draft` — machine-generated, unverified.**

This is not an oversight, it is the design. Research on low-resource
generation is unambiguous: GPT-4o showed ~20% error rates generating
Sundanese, and generating training data for a low-resource language with an
LLM is quality-equivalent to machine translation. Native-speaker review is
the only thing that makes this content trustworthy.

`filterLearnerReady()` withholds drafts from production builds. In dev,
drafts are shown behind a visible warning banner so the app is buildable
before review is complete.

To review an entry:

1. Read it against your own usage. Check the Bangla, the romanization,
   the gloss, and the register (is this how someone actually says it?).
2. Correct it in `source.ts`.
3. Change its `provenance.status` from `draft` to `reviewed` and add your
   name as `reviewer`.
4. `npm run build:content && npm test`

Things most likely to be wrong, in rough order:

- **Verb conjugations.** Person and politeness agreement is where an LLM
  drifts most. Check আছ / আছেন / আছে especially.
- **Register mismatch.** Sentences may read as সাধু (literary) where
  চলিত (colloquial) is intended.
- **Frequency ranks.** These are estimates, not corpus-derived. They drive
  teaching order, so bad ranks mean a bad course sequence.
- **Romanization consistency.** The scheme favours bn-BD pronunciation
  over reversibility; entries drafted at different times may disagree.

## Teaching order

Order is **computed, not assigned**. `build-content.ts` scores each glyph
by how many words it unlocks, weighted by frequency, and sorts by that.

The course currently opens with া, ি, ে — vowel signs, before any
consonant — because they appear in more high-frequency words than any
single letter. This is intentional and is the whole point: an alphabet
chart teaches ঙ and ঞ early despite them being nearly unusable alone.

Rebuilding after editing `source.ts` recomputes the order automatically.

## Known gaps

- **No audio.** Every lexeme and sentence needs a recording. Web Speech API
  Bengali coverage is unreliable (absent on most iOS devices), so audio must
  be pre-generated and shipped. Open Bangla VITS models reach ~4.1 MOS;
  native recordings would be better for the core few hundred items.
- **No conjunct handwriting practice.** Reading is covered; production is not.
- **Sentence count is small** (37). The i+1 sequencer degrades gracefully by
  widening its budget, but the course needs several hundred sentences before
  the graph is dense enough for the +1 constraint to bind properly.
