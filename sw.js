const CACHE_NAME = 'connect4-v1';
const urlsToCache = [
    '/conn4/',
    '/conn4/index.html',
    '/conn4/game.js',
    '/conn4/manifest.json'
    '/conn4/icons/icon-192.png',
    '/conn4/icons/icon-512.png'
];

// Установка SW и кэширование файлов
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Перехват запросов и ответ из кэша
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

// Обновление кэша
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(name => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        })
    );
});