import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [sveltekit()],
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
