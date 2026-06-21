import Dexie from 'dexie';

const DB_VERSION = 1;

export const db = new Dexie('LegoScannerDB');

db.version(DB_VERSION).stores({
  minifigures: '&slug, series, *searchKeys',
  syncMeta: '&series'
});

// export async function syncDatabase() {
//   const MASTER_JSON_URL =
//     'https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/static/db.json';

//   try {
//     const response = await fetch(MASTER_JSON_URL);
//     if (!response.ok) throw new Error('Network offline or repository unavailable.');

//     const data = await response.json();

//     // Bulk put handles upserts gracefully (updates match, adds new rows)
//     await db.minifigures.bulkPut(data.figures);
//     console.log('IndexedDB synchronized with cloud master file.');
//     return true;
//   } catch (error) {
//     console.warn('Network sync failed. Running on local cache.', error.message);
//     return false;
//   }
// }
