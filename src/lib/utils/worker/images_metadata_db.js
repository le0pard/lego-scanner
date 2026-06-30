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
  if (isEvictionRunning) return;
  isEvictionRunning = true; // Atomic lock established immediately at the gate

  try {
    const db = await openLedgerDB();

    // Calculate total size mass using a streaming memory-safe cursor pass
    const calcTx = db.transaction(METADATA_STORE_NAME, 'readonly');
    const calcStore = calcTx.objectStore(METADATA_STORE_NAME);

    let totalCacheMass = 0;
    await new Promise((resolve, reject) => {
      const cursorReq = calcStore.openCursor();
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          totalCacheMass += cursor.value.size || 0;
          cursor.continue();
        } else {
          resolve();
        }
      };
      cursorReq.onerror = () => reject(calcTx.error);
    });

    if (totalCacheMass <= MAX_IMAGE_CACHE_BYTES) return;

    // Open atomic write context only if size bounds are broken
    const writeTx = db.transaction(METADATA_STORE_NAME, 'readwrite');
    const writeStore = writeTx.objectStore(METADATA_STORE_NAME);
    const ageIndex = writeStore.index('lastAccessed');

    const imageCacheBucket = await caches.open(cacheName);

    // Stream cursors pre-sorted from oldest to newest natively
    await new Promise((resolve, reject) => {
      const cursorRequest = ageIndex.openCursor();

      cursorRequest.onsuccess = async (event) => {
        const cursor = event.target.result;
        if (!cursor) {
          resolve();
          return;
        }

        if (totalCacheMass > MAX_IMAGE_CACHE_BYTES) {
          const record = cursor.value;

          // Evict simultaneously across both Storage Chambers
          await imageCacheBucket.delete(record.url);
          cursor.delete();

          totalCacheMass -= record.size;
          console.log(
            `[LRU Eviction] Evicted asset: ${record.url} (${(record.size / 1024).toFixed(1)} KB freed)`
          );

          cursor.continue();
        } else {
          resolve();
        }
      };

      cursorRequest.onerror = (event) => reject(event.target.error);
    });
  } catch (err) {
    console.error('[LRU Manager] Eviction execution error:', err);
  } finally {
    isEvictionRunning = false; // Always clear token blocks safely
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
