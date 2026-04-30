// Service Worker for Connect4 PWA
// Goal: app shell works offline after installation with максимально сильное кэширование.
// Strategy:
// - Precache all core assets on install (cache-first offline).
// - Serve navigations with cached index.html (offline app-shell).
// - For same-origin static assets: cache-first with network fallback + runtime caching.
// - Avoid caching Flask debug/no-store responses by checking status.
// - Use a versioned cache name to control updates.

const CACHE_VERSION = 'v3';
const PRECACHE = `connect4-precache-${CACHE_VERSION}`;
const RUNTIME = `connect4-runtime-${CACHE_VERSION}`;

// IMPORTANT: project is hosted under /conn4/ scope.
// Keep these URLs EXACTLY as they are requested by the app.
const PRECACHE_URLS = [
  '/conn4/',
  '/conn4/index.html',
  '/conn4/game.js',
  '/conn4/manifest.json',
  '/conn4/sw.js',
  '/conn4/icons/icon-192.png',
  '/conn4/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // Use Request with cache: 'reload' to bypass the HTTP cache during SW install.
      await cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' })));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![PRECACHE, RUNTIME].includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isCacheableResponse(res) {
  // Only cache successful, same-origin, non-opaque responses.
  return !!res && res.status === 200 && (res.type === 'basic' || res.type === 'cors');
}

async function cacheFirst(req, cacheName, fallbackUrl = null) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req, { ignoreSearch: false });
  if (cached) return cached;

  try {
    const fresh = await fetch(req);
    if (isCacheableResponse(fresh)) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (e) {
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Always ignore query params when determining app-shell fallback.
  const pathname = url.pathname;

  // Navigation: app-shell
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Try precached index.html first.
        const precache = await caches.open(PRECACHE);
        const cachedIndex = await precache.match('/conn4/index.html');
        if (cachedIndex) return cachedIndex;

        // If for some reason it is not in precache, try network and store.
        return cacheFirst(req, RUNTIME, '/conn4/index.html');
      })()
    );
    return;
  }

  // For known precached URLs: strict cache-first from PRECACHE.
  if (PRECACHE_URLS.includes(pathname)) {
    event.respondWith(cacheFirst(req, PRECACHE));
    return;
  }

  // Other same-origin assets: cache-first runtime.
  // This includes additional icons or future assets.
  event.respondWith(cacheFirst(req, RUNTIME));
});
