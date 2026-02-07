// Service Worker for GeoTools Suite
const CACHE_NAME = 'geotools-v1';
const urlsToCache = [
  '/',
  '/docs/',
  '/docs/index.html',
  '/docs/styles.css',
  // Theme.js removed: No dark mode or theme switching
  '/docs/DLTM.html',
  '/docs/Service2.html',
  '/docs/Converter.html',
  '/docs/Transform.html',
  '/docs/MAP_DEBUG.js',
  '/docs/vendor/leaflet/leaflet.css',
  '/docs/vendor/leaflet/leaflet.js'
];

// Install event - cache essential resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Service Worker: Caching essential assets');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('❌ Cache installation failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;

  // تجاهل الطلبات غير GET
  if (request.method !== 'GET') {
    return;
  }

  // استراتيجية Cache First للأصول الثابتة
  if (request.url.includes('/vendor/') || request.url.endsWith('.css') || request.url.endsWith('.js')) {
    event.respondWith(
      caches.match(request)
        .then(response => response || fetch(request))
        .catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }

  // استراتيجية Network First للـ HTML و API calls
  event.respondWith(
    fetch(request)
      .then(response => {
        // احفظ الاستجابة الناجحة في الـ cache
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // إذا فشل الطلب، استخدم النسخة المخزنة
        return caches.match(request)
          .then(response => response || new Response('Offline', { status: 503 }));
      })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('🗑️ Service Worker: Cache cleared');
      event.ports[0].postMessage({ success: true });
    });
  }
});
