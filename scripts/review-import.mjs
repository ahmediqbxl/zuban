/**
 * Import a reviewed CSV back into the review overlay.
 *
 * Writes `content/bn/review.json`, never `source.ts` — the hand-authored
 * draft stays hand-authored, and a malformed import cannot damage it.
 *
 *   node scripts/review-import.mjs content/bn/review.csv --reviewer "Name"
 *   node scripts/review-import.mjs reviewed.csv --reviewer "Name" --dry-run
 *
 * Merges with any existing overlay, so several reviewers or several
 * batches accumulate rather than overwrite. Re-importing a row replaces
 * that reviewer's earlier verdict for it.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const REVIEW = 'content/bn/review.json';
const COURSE = 'content/bn/course.json';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const reviewer = args.includes('--reviewer') ? args[args.indexOf('--reviewer') + 1] : null;
const dryRun = args.includes('--dry-run');

if (!file || !reviewer) {
  console.error('usage: node scripts/review-import.mjs <file.csv> --reviewer "Name" [--dry-run]');
  console.error('\nThe reviewer name is required — provenance has to be attributable,');
  console.error('otherwise "reviewed" means nothing.');
  process.exit(1);
}

/**
 * RFC 4180 parser.
 *
 * Hand-rolled rather than split(',') because every gloss with a comma, and
 * any note a reviewer types with a quote in it, would otherwise shift the
 * columns and silently corrupt the import.
 */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false, i = 0;
  // Strip the BOM we wrote on export.
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  for (; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

const rows = parseCsv(readFileSync(file, 'utf-8'));
const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
const col = (name) => header.indexOf(name);

for (const required of ['id', 'type', 'bangla', 'verdict']) {
  if (col(required) < 0) {
    console.error(`missing required column: ${required}`);
    console.error(`found: ${header.join(', ')}`);
    process.exit(1);
  }
}

const course = JSON.parse(readFileSync(COURSE, 'utf-8'));
const knownForms = new Set([
  ...course.lexemes.map((l) => l.form),
  ...course.sentences.map((s) => s.form)
]);

const existing = existsSync(REVIEW)
  ? JSON.parse(readFileSync(REVIEW, 'utf-8'))
  : { course: 'bn-BD', entries: [] };
const byId = new Map(existing.entries.map((e) => [e.id, e]));

const now = new Date().toISOString();
const problems = [];
let added = 0, updated = 0, skipped = 0;
const counts = { ok: 0, fix: 0, drop: 0 };

rows.forEach((r, n) => {
  const line = n + 2; // 1-indexed, plus header
  const get = (name) => (col(name) >= 0 ? (r[col(name)] ?? '').trim() : '');
  const id = get('id');
  const verdict = get('verdict').toLowerCase();

  if (!verdict) { skipped++; return; } // blank means unreviewed, which is fine

  if (!['ok', 'fix', 'drop'].includes(verdict)) {
    problems.push(`line ${line}: verdict "${verdict}" is not ok/fix/drop`);
    return;
  }
  const kind = get('type') === 'sentence' ? 'sentence' : 'lexeme';
  const bangla = get('bangla');

  if (!knownForms.has(bangla.normalize('NFC'))) {
    // Usually a stale export, or the reviewer edited the wrong column.
    problems.push(`line ${line}: "${bangla}" is not in the current course — stale export?`);
    return;
  }

  const fixed = {};
  for (const [csvName, key] of [['bangla_fixed', 'bangla'], ['romanization_fixed', 'roman'], ['english_fixed', 'english']]) {
    const v = get(csvName);
    if (v) fixed[key] = v;
  }

  if (verdict === 'fix' && Object.keys(fixed).length === 0) {
    problems.push(`line ${line}: marked "fix" but no correction given — did a *_fixed column get missed?`);
    return;
  }
  if (verdict === 'ok' && Object.keys(fixed).length > 0) {
    problems.push(`line ${line}: marked "ok" but a correction was supplied — should this be "fix"?`);
    return;
  }

  const entry = {
    id,
    kind,
    original: { bangla, roman: get('romanization'), english: get('english') },
    verdict,
    ...(Object.keys(fixed).length ? { fixed } : {}),
    ...(get('note') ? { note: get('note') } : {}),
    reviewer,
    reviewedAt: now
  };
  if (byId.has(id)) updated++; else added++;
  counts[verdict]++;
  byId.set(id, entry);
});

console.log(`parsed ${rows.length} rows from ${file}`);
console.log(`  ${added} new, ${updated} updated, ${skipped} left blank (unreviewed)`);
console.log(`  verdicts: ${counts.ok} ok, ${counts.fix} corrected, ${counts.drop} dropped`);

if (problems.length) {
  console.log(`\n⚠ ${problems.length} row(s) rejected:`);
  for (const p of problems.slice(0, 20)) console.log(`  ${p}`);
  if (problems.length > 20) console.log(`  … and ${problems.length - 20} more`);
  console.log('\nRejected rows were NOT imported. Fix them and re-run — importing');
  console.log('again is safe, it merges rather than replaces.');
}

if (dryRun) {
  console.log('\n--dry-run: nothing written.');
  process.exit(problems.length ? 1 : 0);
}

const out = { course: existing.course ?? 'bn-BD', entries: [...byId.values()] };
writeFileSync(REVIEW, JSON.stringify(out, null, 2) + '\n', 'utf-8');

const total = course.lexemes.length + course.sentences.length;
console.log(`\nwrote ${REVIEW} — ${out.entries.length}/${total} records reviewed (${Math.round(out.entries.length / total * 100)}%)`);
console.log('Now run: npm run build:content');
process.exit(problems.length ? 1 : 0);
