import { db } from '$lib/utils/db.js';

/**
 * Shared standalone Core Sync Engine execution unit.
 * Calculates operational hash deltas against the remote manifest layout
 * and handles ACID-compliant batch transactions seamlessly across any worker thread context.
 * * @param {string} basePath - The base routing prefix path of the application workbench
 * @returns {Promise<boolean>} - Resolves to true if catalog updates were written, false otherwise
 */
export const performDatabaseSync = async (basePath = '/') => {
  const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

  try {
    // Fetch the latest manifest to check for catalog updates
    const manifestResponse = await fetch(`${cleanBase}/api/manifest.json?t=${Date.now()}`);
    if (!manifestResponse.ok) throw new Error('Could not fetch remote manifest');
    const { seriesManifest } = await manifestResponse.json();

    // Read current local state out of DB to isolate delta targets
    const localMetaArray = await db.syncMeta.toArray();
    const localMetaMap = Object.fromEntries(localMetaArray.map((m) => [m.series, m.hash]));

    const downloadsToProcess = [];
    let didUpdate = false;

    // ==========================================================================
    // NETWORK GATHERING LOOP (Must be outside the Dexie Transaction)
    // ==========================================================================
    for (const [seriesId, remoteInfo] of Object.entries(seriesManifest)) {
      const localHash = localMetaMap[seriesId];

      if (localHash !== remoteInfo.hash) {
        console.log(`Sync Worker: Pulling network update parameters for Series: ${seriesId}...`);
        const dataResponse = await fetch(`${cleanBase}${remoteInfo.endpoint}`);

        if (!dataResponse.ok) {
          throw new Error(`Network dropout encountered while fetching catalog series: ${seriesId}`);
        }

        const dbData = await dataResponse.json();
        downloadsToProcess.push({
          seriesId,
          remoteHash: remoteInfo.hash,
          dbData
        });
      }
    }

    // If nothing has been updated on the network side, skip open hooks entirely
    const remoteSeriesKeys = new Set(Object.keys(seriesManifest));
    const codeHasDiscontinuedSeries = localMetaArray.some(
      (meta) => !remoteSeriesKeys.has(meta.series)
    );

    if (downloadsToProcess.length === 0 && !codeHasDiscontinuedSeries) {
      return false;
    }

    // ==========================================================================
    // ATOMIC DATABASE FLUSH (100% Acid Compliant, Zero Network Activity)
    // ==========================================================================
    await db.transaction('rw', [db.minifigures, db.syncMeta], async () => {
      // Flush and modify updated download modules sequentially inside the transaction
      for (const update of downloadsToProcess) {
        const { seriesId, remoteHash, dbData } = update;

        // Isolate and prune obsolete figure entries no longer present in the updated file
        const remoteSlugs = new Set(dbData.map((fig) => fig.slug));
        const localOldFigures = await db.minifigures.where({ series: seriesId }).toArray();
        const slugsToDelete = localOldFigures
          .map((fig) => fig.slug)
          .filter((slug) => !remoteSlugs.has(slug));

        if (slugsToDelete.length > 0) {
          console.log(
            `Sync Worker [Tx]: Pruning ${slugsToDelete.length} obsolete targets from ${seriesId}`
          );
          await db.minifigures.bulkDelete(slugsToDelete);
        }

        // Force-insert the fresh collection array block into IndexedDB
        await db.minifigures.bulkPut(dbData);

        // Update sync history hash blocks safely inside the atomic loop
        await db.syncMeta.put({
          series: seriesId,
          hash: remoteHash,
          lastSynced: new Date().toISOString()
        });

        didUpdate = true;
      }

      // Complete Catalog Purge: Remove legacy retired series missed by the manifest
      for (const localMeta of localMetaArray) {
        if (!remoteSeriesKeys.has(localMeta.series)) {
          console.log(
            `Sync Worker [Tx]: Purging discontinued catalog namespace: "${localMeta.series}"`
          );

          // Delete all mapped character items matching this series identifier handle
          await db.minifigures.where({ series: localMeta.series }).delete();
          // Evict tracking identity key
          await db.syncMeta.delete(localMeta.series);

          didUpdate = true;
        }
      }
    });

    return didUpdate;
  } catch (error) {
    console.warn('Sync Worker: Atomic operation failed. Rollback successfully triggered.', error);
    // Pass the error back up to SvelteKit layout handlers to set correct UI indicator banners
    throw error;
  }
};
