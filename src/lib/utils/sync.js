import { db } from './db';
// 👇 Swap base for resolve and asset
import { resolve, asset } from '$app/paths';

export async function syncDatabase() {
  try {
    // Use resolve() for internal API paths.
    // SvelteKit natively parses paths containing query parameters inside resolve().
    const manifestResponse = await fetch(resolve(`/api/manifest?t=${Date.now()}`));
    if (!manifestResponse.ok) throw new Error('Could not fetch remote manifest');

    const { seriesManifest } = await manifestResponse.json();
    const localMetaArray = await db.syncMeta.toArray();
    const localMetaMap = Object.fromEntries(localMetaArray.map((m) => [m.key, m.hash]));

    for (const [seriesId, remoteInfo] of Object.entries(seriesManifest)) {
      const localHash = localMetaMap[seriesId];

      if (localHash !== remoteInfo.hash) {
        console.log(`🔄 Syncing data and images for Series ${seriesId}...`);

        // Use asset() for static assets like data files
        const dataResponse = await fetch(asset(`/data/${remoteInfo.filename}`));
        if (!dataResponse.ok) continue;

        const minifigsData = await dataResponse.json();

        // 1. Save text definitions directly to IndexedDB
        await db.minifigs.bulkPut(minifigsData);

        // 2. Pre-cache binary images over the network
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          const activeCacheName = cacheKeys[0];

          if (activeCacheName) {
            const cache = await caches.open(activeCacheName);

            // Wrap image routes in asset() before submitting them to the Service Worker Cache
            const imageUrls = minifigsData.map((fig) => asset(fig.image)).filter((url) => !!url);

            console.log(`📦 Pre-downloading ${imageUrls.length} assets for offline use...`);
            await cache.addAll(imageUrls);
          }
        }

        // 3. Update hash tracking state
        await db.syncMeta.put({
          key: seriesId,
          hash: remoteInfo.hash,
          lastSynced: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.warn('⚠️ Sync deferred. Running fully local offline mode.', error);
  }
}
