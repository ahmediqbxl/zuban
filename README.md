# zuban

**জবান** · *zubān* — Urdu/Persian for "tongue", in both senses: the organ and the language.

Learn a language with Zuban — a mobile-first web app for the languages the
big platforms ignore. First course: **Bangla (bn-BD)**.

Bangla has ~270 million speakers — 6th or 7th most spoken language on
earth — and no Duolingo course for English speakers. Duolingo's April 2025
expansion added Bengali as an *interface* language, so Bengali speakers can
learn Spanish; the other direction is still empty. What exists elsewhere is
phrasebook-grade.

## Two ways to use it

The first thing the app asks is what you actually want:

**Speak it.** No script, ever. Everything is written the way it sounds —
*ami bhalo achhi* — and the exercises are understanding people and saying
things back. This is the right choice if your goal is talking to family.

**Read and write too.** Adds the script, learned inside real words rather
than off an alphabet chart.

Both use the same content and the same scheduler; they differ in which
exercises you get and how the language is shown to you. Switching later
keeps everything you have learned.

## Status

The app works end to end for both paths: goal choice, placement, seven
exercise types, spaced review, offline, installable. 91 unit tests plus a
browser smoke test covering each path.

**There is no audio yet**, which matters more for speaking than for
reading — you can practise recall, but there is no model to imitate unless
your device happens to have a Bangla voice installed. See "Audio" below.

The Bangla content is **unreviewed draft**, so a production build ships an
empty course by design and says so on screen. Native-speaker review is the
one thing standing between this and something usable — see "Content
review" below.

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

## What's built

| | |
|---|---|
| **Placement** | Measures comprehension and script as independent axes, so a heritage learner and a beginner share one content graph with different entry points. Falls back to romanized prompts until audio is recorded. |
| **Exercises** | Speaking: say-it from an English prompt, with record-and-compare. Recognition: word→meaning, romanized cloze, listening. Script (optional): letter→sound, sound→letter, spelling by tile assembly, script cloze. Each is scheduled independently, because saying a phrase and recognising it are different skills. |
| **Review** | FSRS, with reviews served before new material so forgetting is caught first. |
| **Script** | Vendored, subsetted Noto Sans Bengali plus a rendering self-test at `/script` carrying the words that break Bengali shaping in practice. |
| **Progress** | Corpus coverage, script coverage, readable-sentence share, and a pace projection. No streaks. |
| **Offline** | Static build, IndexedDB state, service worker precache. Nothing touches the network to answer a card. |
| **Account** | Optional Supabase sync with RLS. Signed-out is a fully supported state, not a degraded one. |
| **Reminders** | Web Push on due reviews. Install prompt included because iOS only allows push for home-screen web apps. |
| **Audio** | Three layers, degrading in order: a recorded clip we ship, the device's own Bangla voice, then nothing. Exercises needing sound are withheld rather than served empty, and the app says when a device has no voice rather than failing silently. |
| **Pronunciation** | Record yourself and play it straight back against the model. Works in any browser with a microphone — no recogniser, no server, no per-language support. |

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
  db/local.ts          IndexedDB; strips reactive proxies before writing
  db/sync.ts           optional Supabase sync
  db/auth.svelte.ts    optional accounts
  ui/session.svelte.ts glue between engine and screen
  ui/install.svelte.ts install + notification prompts
  ui/stats.ts          retention and learning velocity
scripts/build-content.ts   source → validated course.json
scripts/fetch-fonts.mjs    vendor the Bengali font
scripts/generate-audio.mjs TTS fallback for the audio tail
scripts/make-icons.mjs     render app icons using the real জ glyph
tests/                     unit tests
tests/e2e/smoke.mjs        browser smoke test
```

## Develop

```bash
npm install
npm run dev             # app at localhost:5173

npm test                # unit: analyzer, engine, placement, stats
npm run build:content   # rebuild content/bn/course.json from source
npm run fonts:fetch     # re-vendor the Bengali font
npm run audio:plan      # what audio is missing (no API calls)
```

Browser smoke test — catches what unit tests structurally cannot, and has
found most of the real bugs in this project:

```bash
npm run dev -- --port 5190
npm run test:e2e                 # full learning flow

npm run build && npx vite preview --port 5192
npm run test:e2e:prod            # review gate, service worker, offline
```

In dev, unreviewed drafts are shown behind a warning banner so the app is
buildable before review is done. In production they are withheld.

## Audio

A speaking course needs a voice. In order of preference:

1. **Native recordings.** Best, and the only option that is reliably bn-BD
   rather than bn-IN. Drop MP3s into `static/audio/` named by the SHA-1 of
   the phrase (see `scripts/generate-audio.mjs`), then `npm run build:content`.
2. **Synthesis**, to cover the tail:
   ```bash
   npm run audio:plan                                   # what's missing
   ZUBAN_TTS=google GOOGLE_TTS_KEY=... npm run audio:generate
   ```
   Every generated clip is marked `synthetic` in the manifest, and Google
   only offers bn-IN, so each one is a recorded dialect compromise.
3. **The device's own voice.** Free and automatic where it exists — common
   on Android, frequently absent on iOS. Nothing to configure.

## Getting it on your phone

The app is a static site, so it will run on any static host. Two things
matter before you deploy:

**Set `ZUBAN_SHOW_DRAFTS=1`.** Without it the review gate withholds all
unreviewed content and the deployed app has nothing to teach — it will
show "the course is being checked" and no cards. The provided
`netlify.toml` and Pages workflow already set it. Remove it once the
content has been through native review.

**Set `BASE_PATH` only for subpath hosting.** GitHub Pages serves from
`/<repo>/`; Netlify, Cloudflare Pages and custom domains serve from the
root and need it left unset.

### Netlify

Connect the repository. `netlify.toml` supplies the build command, the SPA
redirect, and the cache headers — nothing to configure. If you are
deploying a branch rather than `main`, set that branch as the production
branch in Netlify's settings.

### GitHub Pages

`.github/workflows/pages.yml` builds and deploys on push to `main`. Enable
Pages in the repository settings with **Source: GitHub Actions**. Note that
Pages on a *private* repository needs a paid GitHub plan.

### On your own network, no deploy

Fastest way to look at it on a phone on the same wifi:

```bash
ZUBAN_SHOW_DRAFTS=1 npm run build
npx vite preview --host          # prints a LAN address like 192.168.1.x:4173
```

Open that address on the phone. Everything works except installing to the
Home Screen and notifications, which browsers restrict to HTTPS.

### Installing it

Once it is on HTTPS, install it so it behaves like an app and works
offline:

- **iPhone** — open in Safari, then Share → *Add to Home Screen*. This is
  required for notifications on iOS; the Push API is unavailable to a web
  app that has not been installed.
- **Android** — Chrome offers an install prompt, or use ⋮ → *Install app*.
  The app also shows an install button under **You**.

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
