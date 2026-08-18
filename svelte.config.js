import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Subpath hosting (GitHub Pages serves from /<repo>/) needs the base path
 * baked in at build time. Root-hosted deploys — Netlify, Cloudflare Pages,
 * a custom domain — leave it empty.
 */
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Fully static output: the app is a PWA, there is no server runtime.
    adapter: adapter({ fallback: 'index.html', strict: false }),
    paths: { base },
    alias: {
      $engine: 'src/lib/engine',
      $content: 'src/lib/content',
      $db: 'src/lib/db',
      $ui: 'src/lib/ui',
      $course: 'content'
    }
  }
};
