import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Fully static output: the app is a PWA, there is no server runtime.
    adapter: adapter({ fallback: 'index.html', strict: false }),
    alias: {
      $engine: 'src/lib/engine',
      $content: 'src/lib/content',
      $db: 'src/lib/db',
      $ui: 'src/lib/ui'
    }
  }
};
