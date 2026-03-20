// Service Worker for GeoTools Suite
const CACHE_NAME = "geotools-v18";
const urlsToCache = [
  "/",
  "/docs/",
  "/docs/index.html",
  "/docs/styles.css",
  "/docs/pages/orthometric-height.html",
  "/docs/pages/coordinate-z-check.html",
  "/docs/pages/coordinate-tools.html",
  "/docs/pages/coordinate-tools-batch.html",
  "/docs/pages/coordinate-tools-reverse.html",
  "/docs/pages/dltm-converter.html",
  "/docs/pages/area-calculator.html",
  "/docs/pages/file-converter.html",
  "/docs/pages/coordinate-transform.html",
  "/docs/pages/css/coordinate-tools.css",
  "/docs/pages/css/orthometric-height.css",
  "/docs/pages/css/coordinate-z-check.css",
  "/docs/pages/css/dltm-converter.css",
  "/docs/pages/css/area-calculator.css",
  "/docs/pages/css/file-converter.css",
  "/docs/pages/css/coordinate-transform.css",
  "/docs/shared/css/navbar.css",
  "/docs/shared/css/footer.css",
  "/docs/shared/navbar.html",
  "/docs/shared/footer.html",
  "/docs/shared/data/crs-defs.json",
  "/docs/pages/js/converter-export.js",
  "/docs/pages/js/file-converter.js",
  "/docs/pages/js/dltm-converter.js",
  "/docs/pages/js/coordinate-transform.js",
  "/docs/pages/js/orthometric-height.js",
  "/docs/pages/js/coordinate-z-check.js",
  "/docs/pages/js/area-calculator.js",
  "/docs/shared/js/navbar-loader.js",
  "/docs/shared/js/footer-loader.js",
  "/docs/shared/js/keyboard-navigation.js",
  "/docs/shared/js/notification-system.js",
  "/docs/shared/js/app-shell.js",
  "/docs/shared/js/service-worker.js",
  "/docs/shared/data/crs-defs.json",
  "/docs/service-worker.js",
  "/docs/vendor/leaflet/leaflet.css",
  "/docs/vendor/leaflet/leaflet.js",
  "/docs/vendor/proj4.js",
  "/docs/vendor/xlsx.full.min.js",
  "/docs/vendor/pdf.mjs",
  "/docs/vendor/pdf.worker.mjs",
];

// Install event - cache essential resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: caching essential assets");
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error("Cache installation failed:", error);
      }),
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Service Worker: deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (
    request.url.includes("/vendor/") ||
    request.url.endsWith(".css") ||
    request.url.endsWith(".js")
  ) {
    event.respondWith(
      caches
        .match(request)
        .then((response) => response || fetch(request))
        .catch(() => new Response("Offline", { status: 503 })),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches
          .match(request)
          .then((response) => response || new Response("Offline", { status: 503 }));
      }),
  );
});

// Handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data.type === "CLEAR_CACHE") {
    caches.delete(CACHE_NAME).then(() => {
      console.log("Service Worker: cache cleared");
      event.ports[0].postMessage({ success: true });
    });
  }
});
