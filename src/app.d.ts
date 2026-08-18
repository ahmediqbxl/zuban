/// <reference types="@sveltejs/kit" />

declare global {
  /**
   * Injected at build time by vite.config.ts from ZUBAN_SHOW_DRAFTS.
   * True in a build that deliberately ships unreviewed content.
   */
  const __ZUBAN_SHOW_DRAFTS__: boolean;

  namespace App {}
}

export {};
