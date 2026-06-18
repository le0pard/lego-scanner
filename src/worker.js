import { build, files, version } from '$service-worker';

const CACHE_NAME = `cache-v${version}`;
const ASSETS = [...build, ...files]; // Caches compiled js, css, and everything inside your /static folder

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE_NAME) await caches.delete(key);
			}
		})
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	event.respondWith(
		caches.match(event.request).then((cachedResponse) => {
			if (cachedResponse) return cachedResponse;

			// Fallback for SPA routing parameters (direct entry via sub-URLs)
			if (event.request.mode === 'navigate') {
				return caches.match('/200.html');
			}

			return fetch(event.request);
		})
	);
});
