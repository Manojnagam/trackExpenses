const CACHE_NAME = 'nutrition-mgr-v4.6';
const ASSETS = [
    './',
    './index.html',
    './styles.css?v=4.6',
    './app.js?v=4.6',
    './inventory.js?v=4.6',
    './customers.js?v=4.6',
    './coaches.js?v=4.6',
    './dashboard.js?v=4.6',
    './insights.js?v=4.6',
    './firebase-sync.js?v=4.6',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// Force skip waiting
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

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
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    
    // Skip Firebase, Firestore, and other Google API requests
    if (url.hostname.includes('firebase') || 
        url.hostname.includes('googleapis') || 
        url.hostname.includes('firestore')) {
        return;
    }

    // Only handle http/https requests (skip chrome-extension, etc.)
    if (!url.protocol.startsWith('http')) return;

    const isLocalAsset = url.pathname.endsWith('.js') || 
                         url.pathname.endsWith('.html') || 
                         url.pathname.endsWith('.css') ||
                         url.pathname.endsWith('.json') ||
                         url.pathname.endsWith('.png') ||
                         url.pathname.endsWith('.jpg') ||
                         url.pathname.endsWith('.svg');

    if (isLocalAsset) {
        // Network-First strategy
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        // Stale-While-Revalidate strategy
        event.respondWith(
            caches.match(event.request)
                .then((cachedResponse) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                        return networkResponse;
                    });
                    return cachedResponse || fetchPromise;
                })
        );
    }
});
