/**
 * Render app icons.
 *
 * Drawn in a browser rather than composed by hand so the mark is the real
 * Bengali letter জ — the first letter of জবান (zubān) — shaped by the same
 * vendored font the app ships. Approximating a Bengali glyph with paths
 * would be both wrong and unmaintainable.
 *
 *   node scripts/make-icons.mjs
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const FONT = readFileSync('static/fonts/NotoSansBengali-bengali-400.woff2').toString('base64');

const page = (size, maskable) => {
  // Maskable icons get cropped to a circle by the OS, so the glyph has to
  // sit inside the safe zone — 80% of the canvas.
  const pad = maskable ? size * 0.26 : size * 0.18;
  return `<!doctype html><meta charset="utf-8">
<style>
  @font-face {
    font-family: 'NB';
    src: url(data:font/woff2;base64,${FONT}) format('woff2');
  }
  html, body { margin: 0; padding: 0; }
  .icon {
    width: ${size}px; height: ${size}px;
    display: grid; place-items: center;
    /* Indigo, matching the app's accent — reads as study, not game. */
    background: linear-gradient(150deg, #2f3d7a 0%, #1b2340 100%);
    border-radius: ${maskable ? 0 : size * 0.22}px;
  }
  span {
    font-family: 'NB', sans-serif;
    font-size: ${size - pad * 2}px;
    line-height: 1;
    color: #eef0ff;
    /* Bengali sits low in its em box; nudge it optically centred. */
    transform: translateY(-${size * 0.02}px);
  }
</style>
<div class="icon"><span>জ</span></div>`;
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

for (const [size, maskable, name] of [
  [192, false, 'icon-192.png'],
  [512, false, 'icon-512.png'],
  [512, true, 'icon-512-maskable.png'],
  [180, false, 'apple-touch-icon.png'],
  // Browsers request /favicon.ico unprompted; a linked PNG stops that.
  [32, false, 'favicon-32.png'],
  [16, false, 'favicon-16.png']
]) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.setContent(page(size, maskable));
  await p.evaluate(() => document.fonts.ready);
  const buf = await p.locator('.icon').screenshot({ omitBackground: false });
  writeFileSync(`static/${name}`, buf);
  console.log(`static/${name}`.padEnd(34), buf.length, 'bytes');
  await p.close();
}

await browser.close();
