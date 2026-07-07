import { expose } from 'comlink';
import { performDatabaseSync } from '$lib/utils/worker/sync_engine.js';

const api = {
  /**
   * Syncs the remote API manifest with local IndexedDB atomically using
   * memory collection loops to keep database transactions pure and crash-proof.
   * @param {string} basePath - The base URL of the app (passed from main thread)
   */
  async syncDatabase(basePath = '/') {
    return await performDatabaseSync(basePath);
  }
};

expose(api);
