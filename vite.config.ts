import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/**
 * Ship unreviewed content?
 *
 * Off by default, so a public build cannot accidentally teach material no
 * native speaker has checked. Set ZUBAN_SHOW_DRAFTS=1 to build a personal
 * or preview copy that actually has content in it — which is the only way
 * the app is usable before review is done.
 *
 * The app shows a standing warning banner whenever this is on.
 */
const SHOW_DRAFTS = process.env.ZUBAN_SHOW_DRAFTS === '1';

export default defineConfig({
  plugins: [sveltekit()],
  define: {
    __ZUBAN_SHOW_DRAFTS__: JSON.stringify(SHOW_DRAFTS)
  },
  // course.json is ~280KB and growing with every content addition. Emitted
  // as a JS object literal it cost ~430KB and had to be parsed as code;
  // stringify makes it a JSON.parse("...") call — native parsing, smaller
  // output. The manual chunk keeps it out of the app-code chunks entirely,
  // so a content update doesn't re-download the app and an app update
  // doesn't re-download the course.
  json: { stringify: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.endsWith('course.json')) return 'course';
        }
      }
    }
  },
  server: {
    fs: {
      // Course bundles live in content/, deliberately outside src/ so they
      // read as data under review rather than as application code.
      allow: [fileURLToPath(new URL('./content', import.meta.url))]
    }
  },
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node'
  }
});
