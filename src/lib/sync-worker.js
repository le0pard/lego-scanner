// src/lib/sync-worker.js
import { expose } from 'comlink';
import { db } from '$lib/utils/db.js';

const api = {
  /**
   * Syncs the remote API manifest with local IndexedDB and prunes orphaned collections
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

      // 1. Synchronize and prune inside active remote collections
      for (const [seriesId, remoteInfo] of Object.entries(seriesManifest)) {
        const localHash = localMetaMap[seriesId];

        if (localHash !== remoteInfo.hash) {
          console.log(`Sync Worker: Downloading updated data for Series ${seriesId}...`);
          const dataResponse = await fetch(`${cleanBase}${remoteInfo.endpoint}`);
          if (!dataResponse.ok) continue;

          const dbData = await dataResponse.json();

          // Prune obsolete figures within this series
          const remoteSlugs = new Set(dbData.map((fig) => fig.slug));
          const localOldFigures = await db.minifigures.where({ series: seriesId }).toArray();
          const slugsToDelete = localOldFigures
            .map((fig) => fig.slug)
            .filter((slug) => !remoteSlugs.has(slug));

          if (slugsToDelete.length > 0) {
            console.log(`Sync Worker: Pruning ${slugsToDelete.length} stale figures from ${seriesId}`);
            await db.minifigures.bulkDelete(slugsToDelete);
          }

          // Save fresh JSON data snapshot to IndexedDB
          await db.minifigures.bulkPut(dbData);

          // Pre-cache images using the CacheStorage API
          if ('caches' in self) {
            const cacheKeys = await caches.keys();
            const activeCacheName = cacheKeys[0];
            if (activeCacheName) {
              const cache = await caches.open(activeCacheName);
              const imageUrls = dbData
                .map((fig) => fig.imagePath)
                .filter(Boolean)
                .map((path) => `${cleanBase}${path}`);

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

      // Full Series Purge: Remove entire series missing from remote manifest
      const remoteSeriesKeys = new Set(Object.keys(seriesManifest));

      for (const localMeta of localMetaArray) {
        if (!remoteSeriesKeys.has(localMeta.series)) {
          console.log(`  Sync Worker: Purging discontinued collection "${localMeta.series}" from local storage.`);

          // Delete all figures matched to this discontinued series index
          await db.minifigures.where({ series: localMeta.series }).delete();

          // Drop the tracking signature block
          await db.syncMeta.delete(localMeta.series);

          didUpdate = true;
        }
      }

      return didUpdate;
    } catch (error) {
      console.warn('Sync Worker: Sync deferred. Running fully local offline mode.', error);
      return false;
    }
  }
};

expose(api);
