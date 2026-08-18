/**
 * End-to-end smoke test.
 *
 * The unit suite covers the engine; this covers the things only a real
 * browser can tell you. Every bug it has caught so far was invisible to
 * unit tests and to reading the code:
 *
 *   - Svelte 5 `$state` deep-proxies objects and IndexedDB cannot clone a
 *     Proxy, so every write silently threw
 *   - glyph-find was planned by the sequencer but built with no options,
 *     producing an unanswerable card that stranded the session
 *   - word-spell existed but was unreachable, because only the first
 *     planned exercise per item was ever created
 *   - the seeded option rotation could land on zero, leaving the correct
 *     answer always in first position
 *
 * Usage:
 *   npm run dev -- --port 5190          # then, in another shell:
 *   node tests/e2e/smoke.mjs                    # dev: content visible
 *   npx vite preview --port 5192
 *   node tests/e2e/smoke.mjs --prod --port 5192 # prod: review gate + offline
 */

import { chromium } from 'playwright';

const args = process.argv.slice(2);
const PROD = args.includes('--prod');
const SPEAKING = args.includes('--speaking');
const PORT = args.includes('--port') ? args[args.indexOf('--port') + 1] : PROD ? '5192' : '5190';
const URL = `http://127.0.0.1:${PORT}`;
const SHOTS = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
// Chromium ships with the image; Playwright's own download is skipped.
const EXE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

let failures = 0;
const step = async (label, fn) => {
  try { await fn(); console.log('  ✓', label); }
  catch (e) { failures++; console.log('  ✗', label, '—', String(e.message).split('\n')[0]); }
};
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}.png` }); };

/**
 * Answer whichever card is on screen, whatever kind it is.
 *
 * Shared by both flows: the script track also serves speaking cards, so
 * duplicating this per-flow meant one loop silently stalled the moment it
 * met a card type it did not know about.
 *
 * Returns what kind of card it handled, or null when there is nothing left.
 */
async function answerCard(page) {
  const holder = page.locator('[data-answer]');
  const isSay = (await page.locator('button', { hasText: 'Show me' }).count()) > 0;
  const isSpell = (await page.locator('button', { hasText: 'Check' }).count()) > 0;

  if (isSay) {
    // Spoken production: reveal, then self-grade.
    await page.locator('button', { hasText: 'Show me' }).click();
    await page.waitForTimeout(220);
  } else if (isSpell) {
    if ((await holder.count()) === 0) return null;
    const answer = await holder.getAttribute('data-answer');
    let rest = answer;
    for (let guard = 0; guard < 12 && rest.length; guard++) {
      const tiles = page.locator('[data-answer] button.bn');
      const texts = (await tiles.allTextContents()).map((t) => t.trim());
      const hit = texts.findIndex((t) => t && rest.startsWith(t));
      if (hit < 0) break;
      rest = rest.slice(texts[hit].length);
      await tiles.nth(hit).click();
      await page.waitForTimeout(60);
    }
    const check = page.locator('button', { hasText: 'Check' });
    if ((await check.count()) && (await check.isEnabled())) await check.click();
    await page.waitForTimeout(180);
  } else {
    if ((await holder.count()) === 0) return null;
    const answer = await holder.getAttribute('data-answer');
    const esc = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exact = page.locator('button.choice').filter({ hasText: new RegExp(`^\\s*${esc}\\s*$`) }).first();
    const target = (await exact.count()) ? exact : page.locator('button.choice').first();
    if ((await target.count()) === 0) return null;
    // A disabled choice means the previous card never advanced — bail out
    // rather than retrying a dead button until the suite times out.
    if (!(await target.isEnabled())) return null;
    await target.click();
    await page.waitForTimeout(150);
  }

  const grade = page.locator('button.btn-primary', { hasText: 'Got it' });
  const graded = (await grade.count()) > 0;
  if (graded) await grade.click();
  await page.waitForTimeout(150);
  return { kind: isSay ? 'say' : isSpell ? 'spell' : 'choice', graded };
}

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404') && !m.text().includes('favicon')) {
    errors.push('CONSOLE: ' + m.text());
  }
});

console.log(`\n${PROD ? 'PRODUCTION' : SPEAKING ? 'SPEAKING-ONLY' : 'DEV (script track)'} smoke test against ${URL}\n`);

if (PROD) {
  // ── Production: the review gate and offline support ───────────────
  await page.goto(URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await shot(page, 'prod-home');

  await step('unreviewed drafts are withheld', async () => {
    const t = await page.locator('body').innerText();
    if (/Unreviewed content/.test(t)) throw new Error('draft banner shipped to production');
  });

  await step('the empty course explains itself', async () => {
    const t = await page.locator('body').innerText();
    if (!/being checked/i.test(t)) throw new Error('no explanation for the empty course');
  });

  await step('dev-only test hooks are absent', async () => {
    await page.goto(URL + '/learn', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    if ((await page.locator('[data-answer]').count()) > 0) throw new Error('data-answer leaked');
  });

  await page.goto(URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    const reg = await navigator.serviceWorker.getRegistration();
    return reg?.active ? 'active' : reg ? 'registered' : 'none';
  });
  await step(`service worker is active (${sw})`, () => { if (sw !== 'active') throw new Error(sw); });

  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(2000);
  await shot(page, 'prod-offline');
  await step('renders with the network cut', async () => {
    const t = await page.locator('body').innerText();
    if (!/zuban|Bangla|Today/i.test(t)) throw new Error('blank offline');
  });
  await step('navigates offline', async () => {
    await page.locator('nav.tabs a', { hasText: 'Script' }).click();
    await page.waitForTimeout(1200);
    if (!/rendering|Script check/i.test(await page.locator('body').innerText())) {
      throw new Error('script page blank offline');
    }
  });
  await ctx.setOffline(false);

} else if (SPEAKING) {
  // ── Speaking-only: no script anywhere ─────────────────────────────
  await page.goto(URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('a.btn-primary').first().click(); // Get started
  await page.waitForTimeout(900);
  await shot(page, 'speak-goal');

  await step('the goal choice is offered before anything else', async () => {
    const t = await page.locator('body').innerText();
    if (!/want to speak it/i.test(t)) throw new Error('no speaking option');
  });

  await page.locator('button', { hasText: 'I want to speak it' }).click();
  await page.waitForTimeout(1600);
  await shot(page, 'speak-learn');

  const kinds = new Set();
  let answered = 0, sayCards = 0, scriptSeen = 0;
  for (let i = 0; i < 60; i++) {
    const q = await page.locator('.card .muted.small').first().textContent().catch(() => null);
    if (!q) break;
    kinds.add(q.trim());
    // Any Bangla script in the card body is a failure for this track.
    const body = await page.locator('.card').first().innerText();
    if (/[\u0980-\u09FF]/.test(body)) scriptSeen++;
    const r = await answerCard(page);
    if (!r) break;
    if (r.kind === 'say') sayCards++;
    if (r.graded) answered++;
  }
  console.log(`    ${answered} cards answered, ${sayCards} speaking cards`);
  console.log(`    exercise types: ${[...kinds].join(' | ')}`);
  await shot(page, 'speak-progress');

  await step('a speaking session runs without stalling', () => { if (answered < 25) throw new Error(`only ${answered}`); });
  await step('spoken-production cards appear', () => { if (sayCards === 0) throw new Error('no say-it cards'); });
  await step('NO Bangla script is ever shown', () => {
    if (scriptSeen > 0) throw new Error(`${scriptSeen} cards showed script`);
  });

  await page.goto(URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shot(page, 'speak-today');
  await step('progress is recorded', async () => {
    const vals = await page.locator('.card strong').allTextContents();
    if (!vals.some((v) => v !== '0%' && v !== '0')) throw new Error('nothing recorded: ' + vals);
    console.log(`    progress: ${vals.join(' / ')}`);
  });
  await step('script progress and the Script tab are both hidden', async () => {
    // Checked structurally rather than by text: the bottom nav used to
    // carry a "Script" tab that matched a naive text search.
    const cards = await page.locator('.card').allInnerTexts();
    if (cards.some((c) => /^Script\b/m.test(c))) throw new Error('script progress card shown');
    const tabs = await page.locator('nav.tabs a').allTextContents();
    if (tabs.some((t) => /Script/.test(t))) throw new Error('Script tab shown: ' + tabs.join(','));
  });

} else {
  // ── Dev: the full learning flow ───────────────────────────────────
  await page.goto(URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, 'today');

  await step('first run offers the goal choice', async () => {
    const cta = await page.locator('a.btn-primary').first().textContent();
    if (!/Get started/.test(cta)) throw new Error('got: ' + cta);
  });

  await page.locator('a.btn-primary').first().click();
  await page.waitForTimeout(900);
  await page.locator('button', { hasText: 'read and write' }).click();
  await page.waitForTimeout(1200);
  await page.locator('button.btn-primary', { hasText: 'Start' }).click();
  await page.waitForTimeout(600);
  await shot(page, 'placement');

  // Simulate a heritage learner: understands the language, cannot read it.
  let probes = 0;
  for (let i = 0; i < 14; i++) {
    const tag = await page.locator('.tag').first().textContent().catch(() => null);
    if (!tag) break;
    const holder = page.locator('[data-answer]');
    if ((await holder.count()) === 0) break;
    const answer = (await holder.getAttribute('data-answer')).trim();
    const choices = page.locator('button.choice');
    const texts = (await choices.allTextContents()).map((t) => t.trim());
    probes++;
    let idx = texts.indexOf(answer);
    if (/Reading/.test(tag) || idx < 0) idx = texts.findIndex((t) => t !== answer);
    await choices.nth(Math.max(0, idx)).click();
    await page.waitForTimeout(160);
  }
  await page.waitForTimeout(400);
  await shot(page, 'placement-result');
  await step(`placement completes (${probes} probes)`, () => { if (probes < 4) throw new Error('too few probes'); });
  await step('classifies the heritage learner', async () => {
    if (!/don.t read it/i.test(await page.locator('body').innerText())) throw new Error('wrong label');
  });

  await page.locator('button.btn-primary').first().click();
  await page.waitForTimeout(1400);
  await shot(page, 'learn');

  const kinds = new Set();
  let answered = 0, spelled = 0, said = 0;
  for (let i = 0; i < 80; i++) {
    const q = await page.locator('.card .muted.small').first().textContent().catch(() => null);
    if (!q) break;
    kinds.add(q.trim());
    const r = await answerCard(page);
    if (!r) break;
    if (r.kind === 'spell') spelled++;
    if (r.kind === 'say') said++;
    if (r.graded) answered++;
  }
  console.log(`    ${answered} cards answered, ${spelled} spelling, ${said} speaking`);
  console.log(`    exercise types: ${[...kinds].join(' | ')}`);
  await shot(page, 'learn-progress');

  await step('a full session runs without stalling', () => { if (answered < 30) throw new Error(`only ${answered}`); });
  await step('reaches multiple exercise types', () => { if (kinds.size < 3) throw new Error(`only ${kinds.size}`); });
  await step('reaches the spelling exercise', () => { if (spelled === 0) throw new Error('word-spell never surfaced'); });

  await page.goto(URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const before = await page.locator('.card strong').allTextContents();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const after = await page.locator('.card strong').allTextContents();
  await step('progress survives a reload', () => {
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`${before} vs ${after}`);
  });
  await step('progress is non-zero', () => {
    if (!after.some((v) => v !== '0%' && v !== '0')) throw new Error('nothing recorded: ' + after);
  });
  console.log(`    progress: ${after.join(' / ')}`);

  for (const route of ['/script', '/you']) {
    await page.goto(URL + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await shot(page, route.slice(1));
    await step(`${route} renders`, async () => {
      if ((await page.locator('body').innerText()).trim().length < 60) throw new Error('empty');
    });
  }

  await step('the vendored Bengali font loaded', async () => {
    await page.goto(URL + '/script', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const states = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].filter((f) => f.family.includes('Bengali')).map((f) => f.status);
    });
    if (!states.includes('loaded')) throw new Error('faces: ' + JSON.stringify(states));
  });
}

if (errors.length) {
  failures++;
  console.log('\n  ✗ console/page errors:');
  for (const e of errors.slice(0, 8)) console.log('     ', e);
} else {
  console.log('  ✓ no console or page errors');
}

await browser.close();
console.log(failures === 0 ? '\nPASS\n' : `\nFAIL — ${failures} problem(s)\n`);
process.exit(failures === 0 ? 1 - 1 : 1);
