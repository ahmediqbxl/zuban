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

### Handing it to a native speaker

Review needs no git, no editor and no programming — a spreadsheet is
enough. That is deliberate: the blocker on this course is a Bangla
speaker's time, and requiring them to edit TypeScript rules out nearly all
of them.

```bash
npm run review:export -- --limit 100     # commonest words first
```

That writes `content/bn/review.csv`, which opens in Excel, Numbers or
Google Sheets. Rows are ordered by frequency, so a partial review still
covers the words a learner meets most. Send it to the reviewer with these
instructions:

> Fill in the **verdict** column for each row:
> - `ok` — correct as written
> - `fix` — wrong; put the correction in the `*_fixed` columns
> - `drop` — wrong or not worth teaching; it will be removed
>
> Only fill a `*_fixed` column if you are changing that field. Use **note**
> for anything worth explaining — register, dialect, when you'd actually
> say it. Leave the verdict blank if you are unsure; blank means unreviewed,
> and unreviewed content is withheld from learners.

When it comes back:

```bash
npm run review:import -- reviewed.csv --reviewer "Their Name"
npm run build:content
```

The importer validates before writing and reports anything it rejected —
a `fix` with no correction, an `ok` with one, a row whose word is no longer
in the course. Rejected rows are not imported; fix and re-run, since import
merges rather than replaces.

### How it fits together

Corrections land in `content/bn/review.json`, **not** in `source.ts`. The
hand-authored draft stays hand-authored, so a bad import cannot damage it,
several reviewers merge without conflict, and provenance is derived from
who actually signed off rather than asserted by a literal in the build
script.

`build:content` applies the overlay *before* deriving glyphs and spans — a
corrected spelling has different letters, so correcting afterwards would
leave a word carrying the old word's dependencies. It then prints progress:

```
  review    7/420 checked (4 ok, 2 corrected, 1 dropped)
            → 6 record(s) would reach learners in production
```

Things most likely to be wrong, in rough order:

- **Verb conjugations.** Person and politeness agreement is where an LLM
  drifts most. Check আছ / আছেন / আছে especially.
- **Register mismatch.** Sentences may read as সাধু (literary) where
  চলিত (colloquial) is intended.
- **Romanization vs actual pronunciation.** The scheme favours how a Dhaka
  speaker says a word over reversibility; entries drafted at different
  times may disagree.
- **Frequency ranks.** Estimates, not corpus-derived. They drive teaching
  order, so bad ranks mean a bad course sequence.

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
