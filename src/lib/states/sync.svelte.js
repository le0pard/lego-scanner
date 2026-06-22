export const syncState = $state({
  status: 'idle', // 'idle' | 'syncing' | 'synced' | 'error'
  lastSynced: null,
  errorMessage: ''
});

/**
 * Mutates the global database synchronization status tracker.
 * @param {'idle' | 'syncing' | 'synced' | 'error'} status
 * @param {{lastSynced?: string, errorMessage?: string}} extra
 */
export function setSyncStatus(status, extra = {}) {
  syncState.status = status;
  if (extra.lastSynced !== void 0) syncState.lastSynced = extra.lastSynced;
  if (extra.errorMessage !== void 0) syncState.errorMessage = extra.errorMessage;
}
