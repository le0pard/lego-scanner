const METADATA_DB_NAME = 'image-cache-ledger';
const METADATA_STORE_NAME = 'usage-metrics';
const MAX_IMAGE_CACHE_BYTES = 15 * 1024 * 1024; // Strict 15 Megabyte Quota

// Atomic concurrency token preventing overlapping eviction cycles
let isEvictionRunning = false;

/**
 * High-Performance Database Initialization
 */
const openLedgerDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(METADATA_DB_NAME, 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      let store;

      if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
        store = db.createObjectStore(METADATA_STORE_NAME, { keyPath: 'url' });
      } else {
        store = request.transaction.objectStore(METADATA_STORE_NAME);
      }

      if (!store.indexNames.contains('lastAccessed')) {
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

/**
 * Stream-Based Size Eviction Coordinator
 * Leverages native pre-sorted indices to evaluate boundaries and evict items
 * without loading complete database entries into system RAM.
 */
const enforceLedgerLimits = async (cacheName) => {
  try {
    const db = await openLedgerDB();
    const tx = db.transaction(METADATA_STORE_NAME, 'readwrite');
    const store = tx.objectStore(METADATA_STORE_NAME);

    const records = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });

    let totalCacheMass = records.reduce((sum, item) => sum + item.size, 0);
    if (totalCacheMass <= MAX_IMAGE_CACHE_BYTES) return;

    // Sort ascending by last access time (Oldest items first)
    records.sort((a, b) => a.lastAccessed - b.lastAccessed);

    const imageCache = await caches.open(cacheName);

    for (const record of records) {
      if (totalCacheMass <= MAX_IMAGE_CACHE_BYTES) break;

      // Remove raw asset from the browser's hardware cache pool
      await imageCache.delete(record.url);

      // Clear out identity tracking rows inside IndexedDB
      await store.delete(record.url);

      // Re-calculate active weights
      totalCacheMass -= record.size;
      console.log(`[LRU Eviction] Cleaned stale image: ${record.url} (${(record.size / 1024).toFixed(1)} KB purged)`);
    }
  } catch (err) {
    // ✅ Consolidated into a single valid JavaScript catch wrapper
    console.error('[LRU Manager] Eviction execution error or background rejection caught:', err);
  } finally {
    // Restores mutex lock state safely on all termination code paths
    isEvictionRunning = false;
  }
};

/**
 * Pure Metadata Metrics Logging Entrypoint
 */
export const updateImageMetadata = async (cacheName, url, responseClone = null) => {
  try {
    let size = 0;
    const isIncomingWrite = !!responseClone;

    // Compute file sizes completely outside and before opening transactions
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

    const db = await openLedgerDB();
    const tx = db.transaction(METADATA_STORE_NAME, 'readwrite');
    const store = tx.objectStore(METADATA_STORE_NAME);

    // If it's a simple cache hit touch pass, look up and preserve the historical size mass
    if (!isIncomingWrite) {
      const existing = await new Promise((resolve) => {
        const req = store.get(url);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (existing) size = existing.size;
    }

    // This store call now fires immediately in a clean, non-yielding sequence
    store.put({
      url,
      size,
      lastAccessed: Date.now()
    });

    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });

    // Trigger limits safely after the write pipeline transaction has committed completely
    if (isIncomingWrite && size > 0) {
      await enforceLedgerLimits(cacheName);
    }
  } catch (err) {
    console.warn('[LRU Manager] Logging sequence deferred safely:', err);
  }
};
