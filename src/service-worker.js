import { build, files, version } from '$service-worker';

const OPTIMIZED_ASSETS_REGEX = /_app\/immutable\/assets\/.+\.(webp|avif|png|jpg|jpeg)$/i
const self = globalThis.self;
const CACHE = `cache-${version}`;

const ASSETS = [...build, ...files].filter((path) => {
  return !OPTIMIZED_ASSETS_REGEX.test(path);
});

self.addEventListener('install', (event) => {
  const addFilesToCache = async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);

    // broadcast to all open tabs that a new version is downloaded and waiting
    const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clientsList) {
      client.postMessage({ type: 'UPDATE_AVAILABLE' });
    }
  };

  event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
  const deleteOldCaches = async () => {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
  };

  event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
  // ignore POST requests etc
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  const respond = async () => {
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE);

    // `build`/`files` can always be served from the cache
    if (ASSETS.includes(url.pathname)) {
      const response = await cache.match(url.pathname);

      if (response) {
        return response;
      }
    }

    try {
      const response = await fetch(event.request);
      if (!(response instanceof Response)) {
        throw new Error('invalid response from fetch');
      }

      const isSameOrigin = url.origin === self.location.origin;

      if (response.status === 200 && isSameOrigin) {
        cache.put(event.request, response.clone());
      }

      return response;
    } catch (err) {
      const response = await cache.match(event.request);

      if (response) {
        return response;
      }

      throw err;
    }
  };

  event.respondWith(respond());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
