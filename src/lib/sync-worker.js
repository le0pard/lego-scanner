import { expose } from 'comlink';
import { db } from '$lib/utils/db.js';

const api = {
  /**
   * Syncs the remote API manifest with local IndexedDB
   * @param {string} basePath - The base URL of the app (passed from the main thread)
   */
  async syncDatabase(basePath = '/') {
    const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

    try {
      // Fetch the latest manifest to check for updates
      const manifestResponse = await fetch(`${cleanBase}/api/manifest?t=${Date.now()}`);
      if (!manifestResponse.ok) throw new Error('Could not fetch remote manifest');

      const { seriesManifest } = await manifestResponse.json();

      // Get current local sync state
      const localMetaArray = await db.syncMeta.toArray();
      const localMetaMap = Object.fromEntries(localMetaArray.map((m) => [m.series, m.hash]));

      let didUpdate = false;

      // Compare hashes and download new data if needed
      for (const [seriesId, remoteInfo] of Object.entries(seriesManifest)) {
        const localHash = localMetaMap[seriesId];

        if (localHash !== remoteInfo.hash) {
          console.log(`🔄 Sync Worker: Downloading new data for Series ${seriesId}...`);

          const dataResponse = await fetch(`${cleanBase}${remoteInfo.endpoint}`);
          if (!dataResponse.ok) continue;

          const collectionData = await dataResponse.json();

          const dbData = collectionData.minifigures.map((item) => ({
            ...item,
            series: collectionData.series,
            displayName: collectionData.displayName,
            releaseYear: collectionData.releaseYear
          }))

          // Save JSON data to IndexedDB
          await db.minifigures.bulkPut(dbData);

          // Pre-cache images using the CacheStorage API
          if ('caches' in self) {
            const cacheKeys = await caches.keys();
            const activeCacheName = cacheKeys[0]; // Grab SvelteKit's active SW cache

            if (activeCacheName) {
              const cache = await caches.open(activeCacheName);

              // Construct absolute URLs for the images
              const imageUrls = dbData
                .map((fig) => fig.imagePath)
                .filter(Boolean)
                .map((path) => `${cleanBase}${path}`);

              console.log(`📦 Sync Worker: Pre-caching ${imageUrls.length} images...`);
              await cache.addAll(imageUrls);
            }
          }

          // Update hash tracking in DB so we don't download it again next time
          await db.syncMeta.put({
            series: seriesId,
            hash: remoteInfo.hash,
            lastSynced: new Date().toISOString()
          });

          didUpdate = true;
        }
      }

      return didUpdate;
    } catch (error) {
      console.warn('⚠️ Sync Worker: Sync deferred. Running fully local offline mode.', error);
      return false;
    }
  }
};

expose(api);
