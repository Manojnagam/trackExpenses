const CACHE_NAME = 'nutrition-mgr-v1.9';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js?v=1.9',
    './inventory.js?v=1.9',
    './customers.js?v=1.9',
    './dashboard.js?v=1.9',
    './insights.js?v=1.9',
    './firebase-sync.js?v=1.9',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache');
                        return caches.delete(cache);
                    }
                })
            ).then(() => self.clients.claim());
        })
    );
});

// Fetch Strategy: Network-First for local scripts, Stale-While-Revalidate for others
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isLocalScript = url.pathname.endsWith('.js') || url.pathname.endsWith('.html') || url.pathname.endsWith('.css');

    if (isLocalScript) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                        });
                        return networkResponse;
                    });
                    return response || fetchPromise;
                })
        );
    }
});
