import { build, files, prerendered, version } from '$service-worker';
import { updateImageMetadata } from '$lib/utils/worker/images_metadata_db.js';

const PREGENERATED_ASSETS_PREFIX = '_app/immutable/';
const OPTIMIZED_ASSETS_REGEX = /_app\/immutable\/assets\/.+\.(webp|avif|png|jpg|jpeg)$/i;
const self = globalThis.self;
const IMAGE_CACHE_VERSION = 'v1';

// Two-Tier Cache Strategy Split
const STATIC_CACHE = `static-${version}`; // Rotates and wipes on version updates
const IMAGE_CACHE = `runtime-images-${IMAGE_CACHE_VERSION}`; // Persistent across updates to preserve user matching history

const API_TIMEOUT_MS = 3500;

const ASSETS = [...build, ...files, ...prerendered].filter((path) => {
  return !OPTIMIZED_ASSETS_REGEX.test(path);
});

/**
 * Normalization Helper
 * Normalizes both query parameters and trailing slashes directly
 * within the Request instance to guarantee perfect keyspace matching alignment.
 */
const normalizeRequest = (request) => {
  const url = new URL(request.url);
  let pathname = url.pathname;

  // Strip trailing slashes defensively from path checks (e.g. /howto/ -> /howto)
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // If parameters were stripped OR the trailing slash was modified, bake a standardized Request object
  if (url.search.length > 0 || url.pathname !== pathname) {
    return new Request(`${url.origin}${pathname}`, {
      method: request.method,
      headers: request.headers,
      credentials: request.credentials,
      mode: request.mode
    });
  }
  return request;
};

const fetchWithTimeout = (request, timeoutMs) => {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network request timed out')), timeoutMs)
    )
  ]);
};

self.addEventListener('install', (event) => {
  const addFilesToCache = async () => {
    const cache = await caches.open(STATIC_CACHE);
    // This bypasses the local HTTP browser disk/CDN caches, forcing a fresh download of pre-rendered HTML paths
    const freshRequestsPool = ASSETS.map((asset) => new Request(asset, { cache: 'reload' }));
    try {
      await cache.addAll(freshRequestsPool);
    } catch (bulkError) {
      console.warn(
        '[Service Worker] Bulk asset pre-cache failed. Switching to resilient individual layout extraction...',
        bulkError
      );

      for (const asset of freshRequestsPool) {
        try {
          await cache.add(asset);
        } catch (individualError) {
          console.error(
            `[Service Worker] Critical 404 Dropout: Target missing -> ${asset}`,
            individualError
          );
        }
      }
    }

    const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clientsList) {
      client.postMessage({ type: 'UPDATE_AVAILABLE' });
    }
  };

  event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
  const deleteOldCaches = async () => {
    const cacheKeys = await caches.keys();
    for (const key of cacheKeys) {
      // Protect IMAGE_CACHE from deletion loops when application version ticks over
      if (key !== STATIC_CACHE && key !== IMAGE_CACHE) {
        await caches.delete(key);
      }
    }
  };

  event.waitUntil(deleteOldCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  const respond = async () => {
    const staticCache = await caches.open(STATIC_CACHE);
    const imageCache = await caches.open(IMAGE_CACHE);

    const standardizedReq = normalizeRequest(event.request);
    const sanitizedPath = new URL(standardizedReq.url).pathname;

    // Static Application Shell Cache Check
    if (ASSETS.includes(sanitizedPath)) {
      const response = await staticCache.match(standardizedReq);
      if (response) return response;
    }

    // If an old hash file is requested, look across ALL legacy cache spaces on disk
    const isImmutableChunk = sanitizedPath.includes(PREGENERATED_ASSETS_PREFIX);
    if (isImmutableChunk) {
      const globalCacheMatch = await caches.match(standardizedReq);
      if (globalCacheMatch) {
        return globalCacheMatch; // Found in an older cache folder
      }
    }

    // Network-First Catalog Data Sync Layer (API Routes)
    if (sanitizedPath.startsWith('/api/')) {
      try {
        const response = await fetchWithTimeout(event.request, API_TIMEOUT_MS);

        if (response.status === 200) {
          staticCache.put(standardizedReq, response.clone());
        }

        return response;
      } catch (err) {
        console.warn(
          `[Service Worker] API Connection failed or timed out for ${url.pathname}. Fallback matching active.`,
          err
        );

        const cachedResponse = await staticCache.match(standardizedReq);
        if (cachedResponse) return cachedResponse;

        throw err;
      }
    }

    // Persistent Image Assets Interceptor (Cache-First)
    const isOptimizedImage = OPTIMIZED_ASSETS_REGEX.test(sanitizedPath);
    if (isOptimizedImage) {
      const cachedImage = await imageCache.match(standardizedReq);
      if (cachedImage) {
        event.waitUntil(updateImageMetadata(IMAGE_CACHE, standardizedReq.url));
        return cachedImage;
      }
    }

    // Live Outbound Fetch Fallback Pipeline
    try {
      const response = await fetch(event.request);
      if (!(response instanceof Response)) {
        throw new Error('invalid response from fetch');
      }

      const isSameOrigin = url.origin === self.location.origin;

      if (response.status === 200 && isSameOrigin) {
        if (isOptimizedImage) {
          imageCache.put(standardizedReq, response.clone());
          event.waitUntil(updateImageMetadata(IMAGE_CACHE, standardizedReq.url, response.clone()));
        } else {
          staticCache.put(standardizedReq, response.clone());
        }
      }

      return response;
    } catch (err) {
      // Cross-check all storage indices before failing completely
      const response =
        (await staticCache.match(standardizedReq)) || (await imageCache.match(standardizedReq));
      if (response) return response;

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
