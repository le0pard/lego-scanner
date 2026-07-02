import Dexie from 'dexie';

const DB_VERSION = 1;

export const db = new Dexie('LegoScannerDB');

db.version(DB_VERSION).stores({
  minifigures: '&slug, series, *searchKeys',
  syncMeta: '&series, lastSynced'
});
