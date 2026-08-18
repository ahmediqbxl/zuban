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

// ---------------------------------------------------------------------------
// Push
//
// The payload is deliberately thin — a count, not content. Review state is
// the learner's and lives on their device; a push server has no business
// knowing which words someone is struggling with.
// ---------------------------------------------------------------------------

sw.addEventListener('push', (event) => {
  let due = 0;
  try {
    due = (event.data?.json() as { due?: number } | undefined)?.due ?? 0;
  } catch {
    // A malformed or empty payload should still produce a usable nudge:
    // userVisibleOnly means we are obliged to show something.
  }

  event.waitUntil(
    sw.registration.showNotification('Zuban', {
      body: due > 0
        ? `${due} ${due === 1 ? 'card is' : 'cards are'} ready for review.`
        : 'Time for a few minutes of Bangla.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // One review reminder at a time — a stack of them is nagging.
      tag: 'zuban-due',
      renotify: false
    })
  );
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Focus an existing window rather than opening a duplicate.
  event.waitUntil(
    (async () => {
      const clients = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of clients) {
        if ('focus' in c) {
          await c.focus();
          if ('navigate' in c) await (c as WindowClient).navigate('/learn');
          return;
        }
      }
      await sw.clients.openWindow('/learn');
    })()
  );
});
