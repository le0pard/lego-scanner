import { wrap } from 'comlink';
import { db } from '$lib/utils/db.js';
import { setSyncStatus } from '$lib/states/sync.svelte.js';
import { SYNC_LEGO_CATALOG_EVENT } from '$lib/utils/constants.js';

// Extracted from +layout.svelte
export const firstSortedMetaRecord = async () => {
  return (await db.syncMeta.orderBy('lastSynced').reverse().first()) || null;
};

// Reusable sync function
export const triggerDatabaseSync = async (basePath) => {
  let syncWorker;
  try {
    setSyncStatus('syncing');

    // Boot the sync worker
    const SyncWorker = (await import('$lib/sync-worker?worker')).default;
    syncWorker = new SyncWorker();
    const syncApi = wrap(syncWorker);

    await syncApi.syncDatabase(basePath);

    // Extract newly updated metadata timestamps upon successful completion
    const sortedRecord = await firstSortedMetaRecord();
    if (sortedRecord) {
      setSyncStatus('synced', { lastSynced: sortedRecord.lastSynced });
    } else {
      setSyncStatus('synced', { lastSynced: new Date().toISOString() });
    }

    console.log('✅ Database sync complete! Database is up to date.');
  } catch (err) {
    console.error('Failed to run database sync worker:', err);
    setSyncStatus('error', { errorMessage: err.message || 'Sync operation deferred.' });
  } finally {
    // Kill the worker to free up system memory and battery!
    if (syncWorker) {
      syncWorker.terminate();
    }
  }
};

export const registerPeriodicSync = async (registration) => {
  // Check if Periodic Sync interface is supported by the client browser instance
  if (!('periodicSync' in registration)) return;

  try {
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync'
    });

    if (status.state === 'granted') {
      // Register sync schedule. Interval set to 24 hours (86,400,000 milliseconds)
      await registration.periodicSync.register(SYNC_LEGO_CATALOG_EVENT, {
        minInterval: 24 * 60 * 60 * 1000
      });
      console.log('[Periodic Sync] Hardware background routine registered successfully.');
    }
  } catch (err) {
    console.warn('[Periodic Sync] Registration failed or permission restricted:', err);
  }
};
