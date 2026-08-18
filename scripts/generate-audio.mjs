/**
 * Generate audio for the course.
 *
 * ⚠ Synthesis is the fallback, not the goal. Native recordings are
 * materially better for the core few hundred items, and pronunciation is
 * exactly where a heritage learner will notice a synthetic voice being
 * subtly wrong. Use this to cover the tail, and to have *something* while
 * recordings are being made.
 *
 * Dialect matters: this course teaches Dhaka colloquial, so bn-BD voices
 * are preferred over bn-IN where a provider offers both. Most do not, and
 * bn-IN is the usual fallback — flagged per file in the manifest so the
 * mismatch is visible rather than silent.
 *
 *   ZUBAN_TTS=google  GOOGLE_TTS_KEY=...  node scripts/generate-audio.mjs
 *   ZUBAN_TTS=openai  OPENAI_API_KEY=...  node scripts/generate-audio.mjs
 *   node scripts/generate-audio.mjs --dry-run     # plan only, no API calls
 *
 * Re-running only synthesises what is missing, so it is safe to interrupt.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const COURSE = 'content/bn/course.json';
const OUTDIR = 'static/audio';
const MANIFEST = 'content/bn/audio-manifest.json';

const DRY = process.argv.includes('--dry-run');
const PROVIDER = process.env.ZUBAN_TTS ?? (DRY ? 'none' : '');

/** Stable filename from the text, so identical text is never synthesised twice. */
const clipName = (text) => `${createHash('sha1').update(text).digest('hex').slice(0, 16)}.mp3`;

const providers = {
  async google(text) {
    const key = process.env.GOOGLE_TTS_KEY;
    if (!key) throw new Error('GOOGLE_TTS_KEY is not set');
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        // bn-IN is the only Bengali Google offers; the course is bn-BD, so
        // every clip from this provider is a dialect compromise.
        voice: { languageCode: 'bn-IN', ssmlGender: 'FEMALE' },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 }
      })
    });
    if (!res.ok) throw new Error(`google tts ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const { audioContent } = await res.json();
    return { buf: Buffer.from(audioContent, 'base64'), dialect: 'bn-IN' };
  },

  async openai(text) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set');
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1-hd', voice: 'nova', input: text, speed: 0.9 })
    });
    if (!res.ok) throw new Error(`openai tts ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return { buf: Buffer.from(await res.arrayBuffer()), dialect: 'unspecified' };
  }
};

// ---------------------------------------------------------------------------

const course = JSON.parse(readFileSync(COURSE, 'utf-8'));
mkdirSync(OUTDIR, { recursive: true });

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf-8')) : { clips: {} };

/** Everything that should have audio, commonest first so a partial run is useful. */
const targets = [
  ...course.lexemes.map((l) => ({ kind: 'lexeme', id: l.id, text: l.form, rank: l.freqRank ?? 1e6 })),
  ...course.sentences.map((s) => ({ kind: 'sentence', id: s.id, text: s.form, rank: 5000 + (s.level ?? 3) * 100 }))
].sort((a, b) => a.rank - b.rank);

const missing = targets.filter((t) => !existsSync(join(OUTDIR, clipName(t.text))));

console.log(`course:   ${course.lexemes.length} lexemes, ${course.sentences.length} sentences`);
console.log(`have:     ${targets.length - missing.length} clips`);
console.log(`missing:  ${missing.length} clips`);

if (DRY || !PROVIDER || PROVIDER === 'none') {
  console.log('\nDry run — nothing synthesised. Set ZUBAN_TTS=google|openai plus the');
  console.log('matching API key to generate. Native recordings are preferred for the');
  console.log('highest-frequency items; synthesis is for covering the tail.');
  console.log('\nFirst 10 that would be generated:');
  for (const t of missing.slice(0, 10)) console.log(`  ${t.kind.padEnd(9)} ${t.text}`);
  process.exit(0);
}

const synth = providers[PROVIDER];
if (!synth) {
  console.error(`unknown provider "${PROVIDER}" — expected one of: ${Object.keys(providers).join(', ')}`);
  process.exit(1);
}

let made = 0, failed = 0;
for (const t of missing) {
  const name = clipName(t.text);
  try {
    const { buf, dialect } = await synth(t.text);
    writeFileSync(join(OUTDIR, name), buf);
    manifest.clips[name] = {
      text: t.text,
      kind: t.kind,
      id: t.id,
      provider: PROVIDER,
      dialect,
      // Synthetic until a human replaces it. Mirrors the content review
      // model: nothing machine-made passes as verified.
      status: 'synthetic',
      bytes: buf.length
    };
    made++;
    if (made % 10 === 0) console.log(`  … ${made}/${missing.length}`);
  } catch (err) {
    failed++;
    console.error(`  failed: ${t.text} — ${err.message}`);
    if (failed > 5) { console.error('too many failures, stopping'); break; }
  }
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\ngenerated ${made} clips, ${failed} failed`);
console.log(`manifest: ${MANIFEST}`);
console.log('\nNow run: npm run build:content   (attaches clip paths to the course)');
