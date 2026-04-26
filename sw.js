// Service Worker for Connect4 PWA
// Goal: app shell works offline after installation.

const CACHE_NAME = 'connect4-v2';

// Cache the minimal “app shell”. Keep paths absolute and consistent with scope (/conn4/)
const APP_SHELL = [
  '/conn4/',
  '/conn4/index.html',
  '/conn4/game.js',
  '/conn4/manifest.json',
  '/conn4/icons/icon-192.png',
  '/conn4/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Ensure new SW becomes active immediately after install.
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Remove old caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only deal with GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Navigation requests: serve cached index.html (app shell)
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('/conn4/index.html');
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          // Keep a copy for next time
          cache.put('/conn4/index.html', fresh.clone());
          return fresh;
        } catch (e) {
          // Last resort: try /conn4/ entry if index.html not found
          return (await cache.match('/conn4/')) || Response.error();
        }
      })()
    );
    return;
  }

  // Static assets: cache-first, then network + populate cache
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        // Cache successful basic responses
        if (fresh && fresh.status === 200 && fresh.type === 'basic') {
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (e) {
        // No fallback asset here; browser will show missing resource.
        return cached || Response.error();
      }
    })()
  );
});
