<script>
  import './css/app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { resolve } from '$app/paths';
  import { wrap } from 'comlink';

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

  onMount(() => {
    if (!browser) return;

    if ('serviceWorker' in navigator) {
      // Direct Inspection: Check if an update was already caught and is waiting from a prior session
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration && registration.waiting) {
          setUpdateAvailable(true);
        }

        // Active Lifecycle Listener: Detect if an update arrives and completes installation while app is running
        if (registration) {
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                // Once it crosses from installing to installed, pop up the notification flag
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });
        }
      });

      // Fallback Reactive Message Bus: Keep the postMessage broadcast listener functional
      const handleMessage = (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          setUpdateAvailable(true);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      // Svelte structural lifecycle cleanup registration
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  });
</script>

{@render children()}
