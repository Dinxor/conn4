// Service Worker for Connect4 PWA
// Goal: app shell works offline after installation with максимально сильное кэширование.
// Strategy (aggressive offline-first):
// - Precache core app-shell on install.
// - Install must be resilient: one failed asset must NOT break SW install.
// - Navigations: app-shell (cached index.html) with offline.html fallback.
// - Same-origin GET assets: cache-first + runtime caching.
// - Optionally refresh cached assets in background when online.

const CACHE_VERSION = 'v4';
const PRECACHE = `connect4-precache-${CACHE_VERSION}`;
const RUNTIME = `connect4-runtime-${CACHE_VERSION}`;

const SCOPE_BASE = '/conn4';
const INDEX_URL = `${SCOPE_BASE}/index.html`;
const OFFLINE_URL = `${SCOPE_BASE}/offline.html`;

// IMPORTANT: project is hosted under /conn4/ scope.
// Keep these URLs EXACTLY as they are requested by the app.
const PRECACHE_URLS = [
  `${SCOPE_BASE}/`,
  INDEX_URL,
  OFFLINE_URL,
  `${SCOPE_BASE}/game.js`,
  `${SCOPE_BASE}/manifest.json`,
  `${SCOPE_BASE}/sw.js`,
  `${SCOPE_BASE}/icons/icon-192.png`,
  `${SCOPE_BASE}/icons/icon-512.png`
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);

      // Resilient precache: do not fail install if one asset can't be fetched.
      // Also bypass HTTP cache during install.
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' }))
        )
      );

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

async function cacheFirst(req, cacheName, fallbackUrl = null, matchOptions = undefined) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req, matchOptions);
  if (cached) return cached;

  try {
    const fresh = await fetch(req);
    if (isCacheableResponse(fresh)) {
      await cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (e) {
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    // Prefer a controlled offline response over a network error.
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

function isInScope(pathname) {
  return pathname === SCOPE_BASE || pathname.startsWith(`${SCOPE_BASE}/`);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const pathname = url.pathname;
  if (!isInScope(pathname)) return;

  // Navigation requests: return cached app-shell first.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Aggressive: always try app-shell from precache.
        const precache = await caches.open(PRECACHE);
        const cachedIndex = await precache.match(INDEX_URL, { ignoreSearch: true });
        if (cachedIndex) return cachedIndex;

        // Fallback: runtime cache / network, and finally offline page.
        return cacheFirst(req, RUNTIME, OFFLINE_URL);
      })()
    );
    return;
  }

  // Known precached assets: strict cache-first.
  if (PRECACHE_URLS.includes(pathname)) {
    event.respondWith(cacheFirst(req, PRECACHE));
    return;
  }

  // Other same-origin assets in /conn4: cache-first runtime (max caching).
  event.respondWith(cacheFirst(req, RUNTIME));
});
