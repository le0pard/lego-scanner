// src/lib/utils/worker/images_metadata_db.js
import Dexie from 'dexie';

const MAX_IMAGE_CACHE_BYTES = 15 * 1024 * 1024; // Strict 15 Megabyte Limit

// Isolated database dedicated exclusively to tracking service worker cache health
export const cacheDb = new Dexie('RuntimeImagesCacheDB');
cacheDb.version(1).stores({
  usageMetrics: 'url, lastAccessed' // 'url' is the primary key; index created on 'lastAccessed'
});

// Atomic concurrency token preventing overlapping eviction loops
let isEvictionRunning = false;

/**
 * Stream-Based Size Eviction Coordinator
 * Leverages native pre-sorted indices to evaluate boundaries and evict items
 * in lightweight chunks without causing worker memory spikes.
 * @param {string} cacheName - Target string token identifying the cache chamber
 */
const enforceLedgerLimits = async (cacheName) => {
  if (isEvictionRunning) return;
  isEvictionRunning = true; // Secure the execution track against concurrent fetch spikes

  try {
    let totalCacheMass = 0;

    // Memory-safe streaming calculation using Dexie's each wrapper
    await cacheDb.usageMetrics.each((record) => {
      totalCacheMass += record.size || 0;
    });

    if (totalCacheMass <= MAX_IMAGE_CACHE_BYTES) return;

    const imageCacheBucket = await caches.open(cacheName);

    // Batch processing loop: Fetch old items in small chunks to prevent RAM bloat
    // while avoiding standard cursor lock deadlocks during deletions
    while (totalCacheMass > MAX_IMAGE_CACHE_BYTES) {
      const oldestRecords = await cacheDb.usageMetrics.orderBy('lastAccessed').limit(10).toArray();

      if (oldestRecords.length === 0) break;

      for (const record of oldestRecords) {
        if (totalCacheMass <= MAX_IMAGE_CACHE_BYTES) break;

        // Evict concurrently across both local storage mechanisms
        await imageCacheBucket.delete(record.url);
        await cacheDb.usageMetrics.delete(record.url);

        totalCacheMass -= record.size;
        console.log(
          `[LRU Eviction] Evicted asset via Dexie: ${record.url} (${(record.size / 1024).toFixed(1)} KB freed)`
        );
      }
    }
  } catch (err) {
    console.error('[LRU Manager] Dexie eviction process encountered an error:', err);
  } finally {
    isEvictionRunning = false; // Always clear the concurrency lock safely on termination
  }
};

/**
 * Pure Metadata Metrics Logging Entrypoint
 * @param {string} cacheName - Target string token identifying the cache chamber
 * @param {string} url - Target resource web URL string location
 * @param {Response|null} responseClone - Cloned HTTP token payload (passed on fresh downloads)
 */
export const updateImageMetadata = async (cacheName, url, responseClone = null) => {
  try {
    let size = 0;
    const isIncomingWrite = !!responseClone;

    // Extract sizes over the wire before touching database contexts
    if (isIncomingWrite) {
      if (responseClone.type === 'opaque') {
        size = 0; // Opaque cross-origin structures hide body sizes from javascript access
      } else {
        try {
          const headerLength = responseClone.headers.get('content-length');
          if (headerLength) {
            size = parseInt(headerLength, 10);
          } else {
            const blob = await responseClone.blob();
            size = blob.size;
          }
        } catch {
          size = 0;
        }
      }
    }

    // If it's a simple cache read hit touch pass, look up and preserve the historical mass
    if (!isIncomingWrite) {
      const existing = await cacheDb.usageMetrics.get(url);
      if (existing) size = existing.size;
    }

    // Atomic update/insert using Dexie's clean put API
    await cacheDb.usageMetrics.put({
      url,
      size,
      lastAccessed: Date.now()
    });

    // Trigger limits safely after the metric row has committed completely
    if (isIncomingWrite && size > 0) {
      await enforceLedgerLimits(cacheName);
    }
  } catch (err) {
    console.warn('[LRU Manager] Dexie tracking logging deferred safely:', err);
  }
};
