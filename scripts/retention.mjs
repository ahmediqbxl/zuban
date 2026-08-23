/**
 * Read the retention ledger and print the numbers Phase 3 depends on.
 *
 *   npm run metrics
 *
 * Requires PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * (service role, because activity_days is deliberately unreadable to
 * clients). Prints daily actives, coverage percentiles, and D1/D7/D30 —
 * a device counts as retained at Dn if it studied again n days after its
 * first-seen day, the strict definition (same-day return doesn't count).
 */

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (run via `npm run metrics`).');
  process.exit(1);
}

const rows = [];
// PostgREST pages at 1000 by default; walk until a short page.
for (let from = 0; ; from += 1000) {
  const res = await fetch(
    `${url}/rest/v1/activity_days?select=device_id,day,coverage_pct&order=day.asc&offset=${from}&limit=1000`,
    { headers: { apikey: key, authorization: `Bearer ${key}` } }
  );
  if (!res.ok) {
    console.error(`Query failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const page = await res.json();
  rows.push(...page);
  if (page.length < 1000) break;
}

if (rows.length === 0) {
  console.log('Ledger is empty — no study days recorded yet.');
  process.exit(0);
}

const DAY = 86_400_000;
const at = (d) => new Date(`${d}T00:00:00Z`).getTime();

const byDevice = new Map();
for (const r of rows) {
  if (!byDevice.has(r.device_id)) byDevice.set(r.device_id, []);
  byDevice.get(r.device_id).push(r);
}

// --- daily actives ---------------------------------------------------------
const daily = new Map();
for (const r of rows) daily.set(r.day, (daily.get(r.day) ?? 0) + 1);
console.log('Daily active devices');
for (const [day, n] of [...daily.entries()].sort()) {
  console.log(`  ${day}  ${String(n).padStart(4)}  ${'█'.repeat(Math.min(n, 60))}`);
}

// --- retention -------------------------------------------------------------
// A cohort only counts toward Dn once n full days have passed since its
// first day; otherwise young cohorts drag the rate down for no reason.
const today = at(new Date().toISOString().slice(0, 10));
for (const n of [1, 7, 30]) {
  let eligible = 0;
  let retained = 0;
  for (const days of byDevice.values()) {
    const first = at(days[0].day);
    if (today - first < n * DAY) continue;
    eligible++;
    if (days.some((r) => at(r.day) - first >= n * DAY)) retained++;
  }
  const rate = eligible ? ((retained / eligible) * 100).toFixed(1) + '%' : '—';
  console.log(`D${n}: ${rate}  (${retained}/${eligible} devices old enough to count)`);
}

// --- coverage velocity -----------------------------------------------------
// Median latest coverage among devices seen in the last 7 days, plus the
// median per-device gain per active day — a crude but honest velocity.
const recent = [...byDevice.values()].filter((d) => today - at(d.at(-1).day) < 7 * DAY);
if (recent.length) {
  const med = (xs) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const latest = med(recent.map((d) => d.at(-1).coverage_pct));
  const gains = recent
    .filter((d) => d.length > 1)
    .map((d) => (d.at(-1).coverage_pct - d[0].coverage_pct) / (d.length - 1));
  console.log(`Coverage (devices active last 7d): median ${latest}%` +
    (gains.length ? `, median gain ${med(gains).toFixed(1)} pts per active day` : ''));
}
console.log(`\n${byDevice.size} devices, ${rows.length} study-day rows total.`);
