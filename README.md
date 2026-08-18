# zuban

**জবান** · *zubān* — Urdu/Persian for "tongue", in both senses: the organ and the language.

Learn a language with Zuban — a mobile-first web app for the languages the
big platforms ignore. First course: **Bangla (bn-BD)**.

Bangla has ~270 million speakers — 6th or 7th most spoken language on
earth — and no Duolingo course for English speakers. Duolingo's April 2025
expansion added Bengali as an *interface* language, so Bengali speakers can
learn Spanish; the other direction is still empty. What exists elsewhere is
phrasebook-grade.

## Status

Early. The engine and content pipeline work end to end and are tested. The
Bangla content is **unreviewed draft** — see "Content review" below.

## What makes it different

**Script is taught in utility order, not alphabet order.** Teaching order
is *computed* from the corpus: each glyph is scored by how many real words
it unlocks, weighted by their frequency. The Bangla course currently opens
with া, ি, ে — vowel signs — because they appear in more words than any
consonant. No alphabet chart anywhere.

**Conjuncts are taught as whole shapes inside words.** Bangla has 200+
যুক্তাক্ষর, and the literature is consistent that they are acquired in
context rather than drilled in isolation. Several are phonetically opaque
(জ্ঞ = জ + ঞ but is pronounced "gg"), so decomposing them actively misleads.

**Scheduling is FSRS, not homegrown.** FSRS predicts recall better than
SM-2 for 99.5% of users in the open benchmark and reaches equal retention
with 20–30% fewer reviews.

**Sequencing is real i+1.** Content forms a dependency graph
(glyph → lexeme → sentence) and the sequencer only offers items with
exactly one unknown dependency. Comprehensible input, made mechanical.

**Progress is corpus coverage, not streaks.** "You can follow 34% of
everyday Bangla" is honest and checkable. Streaks measure app usage.

**One course, two learners.** Placement measures *listening* and *script*
as independent axes. A diaspora learner who understands spoken Bangla but
can't read scores high/zero and skips comprehension drills; a cold beginner
scores zero/zero. Same content graph, different entry point.

## Layout

```
content/bn/          Bangla course — authored source + built course.json
  glyphs.ts            romanization table (bn-BD pronunciation)
  source.ts            lexemes, sentences, grammar notes
  course.json          built artifact; do not edit by hand
src/lib/
  content/schema.ts    language-agnostic content types
  content/scripts/     per-script analysis (bengali.ts)
  engine/scheduler.ts  FSRS wrapper
  engine/sequencer.ts  i+1 selection over the dependency graph
  engine/coverage.ts   corpus-coverage progress metric
  engine/placement.ts  two-axis placement test
scripts/build-content.ts   source → validated course.json
tests/                     analyzer + engine tests
```

## Develop

```bash
npm install
npm run build:content   # rebuild content/bn/course.json from source
npm test                # analyzer + engine tests
npm run dev             # app at localhost:5173
```

## Content review

Every content record carries a `provenance.status`:

| status     | meaning                                        | shown to learners |
|------------|------------------------------------------------|-------------------|
| `draft`    | LLM-drafted, unverified                        | no                |
| `reviewed` | a native speaker corrected and approved it     | yes               |
| `native`   | authored by a native speaker from scratch      | yes               |

**All current Bangla content is `draft`.** This is deliberate and the
reason the field exists. Research on low-resource generation is blunt:
GPT-4o showed ~20% error rates generating Sundanese, and LLM-generating
data for a low-resource language is quality-equivalent to machine
translation. `filterLearnerReady()` withholds drafts by default.

To review: correct the entry in `content/bn/source.ts`, set its status to
`reviewed`, add your name, rebuild.

## Adding a language

Nothing about Bangla lives in the engine. A new language needs a script
analyzer in `src/lib/content/scripts/`, a romanization table, and authored
source. The scheduler, sequencer, coverage model, and placement test are
language-agnostic.
