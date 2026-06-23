// src/worker.js
import { build, files, version } from '$service-worker';

const CACHE_NAME = `cache-v${version}`;
const ASSETS_TO_CACHE = [...build, ...files];

// Install Event: Cache app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old versions of caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event: Intercept image requests and manage cache dynamically
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only intercept local requests (like your Lego images)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse; // Return instantly from offline cache
        }

        // If not cached, fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Modernized Filter: Intercept both SvelteKit immutable assets and general image formats
            const isOptimizedImage =
              /\.(webp|avif|jpg|jpeg|png|svg)$/i.test(url.pathname) ||
              url.pathname.includes('/_app/immutable/assets/');

            if (isOptimizedImage && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback if network fails completely and asset isn't cached
            return new Response('Offline image unavailable', { status: 503 });
          });
      })
    );
  }
});
