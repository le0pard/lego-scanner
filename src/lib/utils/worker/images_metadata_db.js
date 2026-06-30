const METADATA_DB_NAME = 'image-cache-ledger';
const METADATA_STORE_NAME = 'usage-metrics';
const DB_VERSION = 2;
const MAX_IMAGE_CACHE_BYTES = 15 * 1024 * 1024; // Strict 15 Megabyte Quota

// Atomic concurrency token preventing overlapping eviction cycles
let isEvictionRunning = false;

/**
 * High-Performance Database Initialization
 */
const openLedgerDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(METADATA_DB_NAME, DB_VERSION);

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
 * Natively scans pre-sorted index tracks to evict elements dynamically.
 */
const enforceLedgerLimits = async (cacheName) => {
  if (isEvictionRunning) return;
  isEvictionRunning = true; // Protect workspace from simultaneous fetch spikes

  try {
    const db = await openLedgerDB();

    // Stream cursor just to calculate combined weight without table allocation bloom
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

    // Open readwrite context only if limits are broken
    const writeTx = db.transaction(METADATA_STORE_NAME, 'readwrite');
    const writeStore = writeTx.objectStore(METADATA_STORE_NAME);
    const ageIndex = writeStore.index('lastAccessed');

    const imageCacheBucket = await caches.open(cacheName);

    // Stream pre-sorted indices natively from oldest to newest ↩️ Brought back!
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

          // Prune across both chambers concurrently
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
    // Single valid catch clause block matching JS specifications cleanly
    console.error('[LRU Manager] Eviction execution error or background rejection caught:', err);
  } finally {
    isEvictionRunning = false; // Guarantees lock release on all exits
  }
};

/**
 * Pure Metadata Metrics Logging Entrypoint
 */
export const updateImageMetadata = async (cacheName, url, responseClone = null) => {
  try {
    let size = 0;
    const isIncomingWrite = !!responseClone;

    if (isIncomingWrite) {
      if (responseClone.type === 'opaque') {
        size = 0;
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

    if (!isIncomingWrite) {
      const existing = await new Promise((resolve) => {
        const req = store.get(url);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (existing) size = existing.size;
    }

    store.put({
      url,
      size,
      lastAccessed: Date.now()
    });

    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });

    if (isIncomingWrite && size > 0) {
      await enforceLedgerLimits(cacheName);
    }
  } catch (err) {
    console.warn('[LRU Manager] Logging sequence deferred safely:', err);
  }
};
