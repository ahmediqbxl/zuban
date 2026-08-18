# Roadmap

## The messaging question: app first, SMS never (for content)

SMS is the wrong primary surface for Bangla. Not because of cost — I measured
that against the live course content and it's survivable — but for three
structural reasons.

**Cost, measured.** Bengali sits entirely outside GSM-7, so every message is
UCS-2 at 70 characters per segment instead of 160. But beginner sentences are
short: `আমি ভালো আছি।` + romanization + gloss is 41 characters, one segment.

| Channel | per learner/yr | at 10k learners | scales with |
|---|--:|--:|---|
| SMS, 1 lesson/day | $2.88 | $28,800 | users × engagement |
| SMS, 3 lessons/day | $8.65 | $86,505 | users × engagement |
| Web Push | $0 | $0 | nothing |
| PWA delivery | ~$0 | ~$0 | nothing |

So cost isn't disqualifying. These are:

1. **No audio.** A heritage learner's entire strength is listening; a beginner's
   entire need is pronunciation. SMS carries neither.
2. **No control over script rendering.** Noto Sans Bengali has open bugs that
   render `স্কুল` illegibly. In the app we ship the font. Over SMS, rendering
   belongs to the recipient's messaging app and is unfixable — see `/script`.
3. **No grading, so no FSRS.** FSRS needs recall quality per card; that's where
   the 20–30% efficiency gain lives. SMS is broadcast. Without grading it's a
   drip feed, not a course.

**Order of retention channels:** Web Push (free, service worker already exists;
iOS 16.4+ needs home-screen install, unavailable in the EU) → WhatsApp (~44M
users in Bangladesh, carries audio, free inside the learner-initiated 24-hour
window) → SMS only as a nudge fallback, never for content.

## Strategy: don't compete on Duolingo's axis

Duolingo's D30 retention is 12% against a ~2% education-app average, and they
convert ~9% of MAU to paid against a 2% market average. That comes from a decade
of tuning engagement mechanics. Out-gamifying them is a losing fight.

Zuban's advantage is that a learner who wants Bangla **has no serious
alternative** — 270M speakers, no Duolingo course for English speakers, nothing
in the incubator, and the existing apps are phrasebooks. Heritage learners
arrive with motivation you don't manufacture. They don't need streak flames;
they need the course to be correct and to have audio. Both are content problems.

---

## Phase 0 — Make it true `BLOCKER`

Native-speaker review of everything marked `draft`. **2–4 weeks, 2–3 reviewers.**

This is a hard gate, not a preference: `filterLearnerReady()` withholds drafts,
so a production build today ships an *empty course*. All 94 lexemes and 37
sentences are LLM-drafted, and GPT-4o showed ~20% error rates on a comparable
low-resource language. A heritage learner spots an error instantly.

- [ ] Recruit 2–3 paid bn-BD reviewers (Dhaka colloquial)
- [ ] Review 94 lexemes, 37 sentences, 6 grammar notes — verb conjugations
      first (person/politeness agreement is where drift concentrates), then
      register, then frequency ranks, which drive teaching order
- [x] Review workflow — `provenance.status` per record, promote and rebuild

**Exit:** a production build ships a non-empty course.

## Phase 1 — Make it teach

Audio on everything, and enough content that i+1 actually binds. **4–8 weeks.**

- [ ] Audio for all lexemes and sentences. Biggest gap. Web Speech API Bengali
      is absent on most iOS devices, so it must be pre-generated and shipped.
      Native recordings for the core few hundred; open Bangla VITS (~4.1 MOS)
      for the tail
- [ ] Grow 37 → ~400 sentences. At 37 the graph is too sparse for the +1
      constraint to bind; the sequencer widens its budget to avoid stalling
- [x] Placement test written and tested — needs a route
- [ ] Vendor and subset the font, then verify `/script` on real hardware

**Exit:** zero to ~20% coverage without hitting a wall or a silent letter.

## Phase 2 — Make it a service

Accounts, sync, first retention loop. **3–5 weeks.**

- [x] Supabase migration + `sync.ts` with RLS — needs auth UI and wiring
- [ ] Web Push on due reviews (not streaks — "six cards are slipping" is the
      honest signal)
- [ ] Install prompt. Load-bearing: iOS push only works for installed PWAs, so
      push adoption is capped by install rate
- [ ] Instrument D1/D7/D30 and coverage velocity — without this the Phase 3
      messaging decision is guesswork

**Exit:** measurable return rate; progress survives a lost phone.

## Phase 3 — Make it a business

**4–6 weeks.**

- [ ] Subscription priced for diaspora intent (US/UK/Gulf convert better than
      casual app users); regional pricing to stay reachable inside Bangladesh
- [ ] Free tier: script + first ~200 words. The script is the barrier; giving it
      away is the best demonstration the method works
- [ ] **Decision point** — WhatsApp practice bot, only if push proves
      insufficient. Free inside the 24-hour window, carries audio. Not SMS

**Exit:** a paying cohort with retention you can quote.

## Phase 4 — Prove the thesis

- [x] Engine is already language-agnostic — scheduler, sequencer, coverage and
      placement contain nothing Bangla-specific
- [ ] Language two. Sylheti is the sharpest test (huge UK diaspora, near-zero
      resources, its own barely-read script). Urdu reuses more. Amharic or
      Tigrinya would prove a genuinely different script
- [ ] Open the content pipeline so native speakers author directly — `reviewer`
      is already a field, not a hardcoded assumption

**Exit:** two courses, one engine, a repeatable path to the third.

---

## If you do one thing

**Find a native reviewer this week.** Everything downstream is effort spent on a
course that might be wrong. Phase 0 is cheap, unglamorous, and blocks all of it.
