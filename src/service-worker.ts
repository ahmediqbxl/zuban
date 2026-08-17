/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

/**
 * Offline shell.
 *
 * The whole course is static data, so once cached the app works with no
 * network at all. That is the point rather than a nicety: a large share of
 * the audience is on patchy mobile data, and a lesson that stalls waiting
 * on a round-trip is a lesson that doesn't happen.
 *
 * Review state never touches the network — it lives in IndexedDB.
 */

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `zuban-${version}`;
const PRECACHE = [...build, ...files];

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => sw.skipWaiting())
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim())
  );
});

sw.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      // Build artifacts are content-hashed, so cache wins outright.
      const url = new URL(req.url);
      if (PRECACHE.includes(url.pathname)) {
        const hit = await cache.match(url.pathname);
        if (hit) return hit;
      }

      try {
        const res = await fetch(req);
        if (res.ok && res.status === 200 && url.origin === location.origin) {
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        const hit = await cache.match(req);
        if (hit) return hit;
        // Navigation offline with nothing cached: fall back to the shell.
        if (req.mode === 'navigate') {
          const shell = await cache.match('/index.html');
          if (shell) return shell;
        }
        throw new Error('offline and uncached');
      }
    })()
  );
});
