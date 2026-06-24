<script>
  import './css/app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { resolve } from '$app/paths';
  import { wrap } from 'comlink';
  import favicon from '$lib/assets/favicon.svg';

  import { db } from '$lib/utils/db.js';
  import { setSyncStatus } from '$lib/states/sync.svelte.js';
  import { setUpdateAvailable } from '$lib/states/update.svelte.js';

  let { children } = $props();

  // Auto-detect and set theme based on system preference
  $effect(() => {
    if (!browser) return;

    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  });

  onMount(async () => {
    if (!browser) return;

    if ('serviceWorker' in navigator) {
      const handleMessage = (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          setUpdateAvailable(true);
        }
      };

      // add the listener
      navigator.serviceWorker.addEventListener('message', handleMessage);

      // return the cleanup function that Svelte will run on component unmount
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }

    try {
      const localMetaArray = await db.syncMeta.toArray();
      if (localMetaArray.length > 0) {
        // Sort to identify the most recently updated catalog series timestamp
        const sorted = localMetaArray.sort(
          (a, b) => new Date(b.lastSynced) - new Date(a.lastSynced)
        );
        setSyncStatus('idle', { lastSynced: sorted[0].lastSynced });
      }
    } catch (e) {
      console.warn('Could not read local sync history metadata:', e);
    }

    let syncWorker;
    try {
      setSyncStatus('syncing');

      // Boot the sync worker
      const SyncWorker = (await import('$lib/sync-worker?worker')).default;
      syncWorker = new SyncWorker();
      const syncApi = wrap(syncWorker);

      await syncApi.syncDatabase(resolve('/'));

      // Extract newly updated metadata timestamps upon successful completion
      const updatedMeta = await db.syncMeta.toArray();
      if (updatedMeta.length > 0) {
        const sorted = updatedMeta.sort((a, b) => new Date(b.lastSynced) - new Date(a.lastSynced));
        setSyncStatus('synced', { lastSynced: sorted[0].lastSynced });
      } else {
        setSyncStatus('synced', { lastSynced: new Date().toISOString() });
      }

      console.log('✅ Background sync complete! Database is up to date.');
    } catch (err) {
      console.error('Failed to run background sync worker:', err);
      setSyncStatus('error', { errorMessage: err.message || 'Sync operation deferred.' });
    } finally {
      // Kill the worker to free up system memory and battery!
      if (syncWorker) {
        syncWorker.terminate();
      }
    }
  });
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
