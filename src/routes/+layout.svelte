<script>
  import './css/app.css';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { resolve } from '$app/paths';
  import { wrap } from 'comlink';
  import Header from '$lib/components/Header.svelte';

  import { db } from '$lib/utils/db.js';
  import { setSyncStatus } from '$lib/states/sync.svelte.js';
  import { setUpdateAvailable } from '$lib/states/update.svelte.js';

  let { children } = $props();

  let showTabs = $derived(page.url.pathname === '/');

  const firstSortedMetaRecord = async () => {
    return (await db.syncMeta.orderBy('lastSynced').reverse().first()) || null;
  };

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
      const sortedRecord = await firstSortedMetaRecord();
      if (sortedRecord) {
        setSyncStatus('idle', { lastSynced: sortedRecord.lastSynced });
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
      const sortedRecord = await firstSortedMetaRecord();
      if (sortedRecord) {
        setSyncStatus('synced', { lastSynced: sortedRecord.lastSynced });
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
      navigator.serviceWorker.getRegistration().then((registration) => {
        // Active Lifecycle Listener: Detect if an update arrives and completes installation while app is running
        if (registration) {
          if (registration.waiting && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }

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
        if (
          event.data &&
          event.data.type === 'UPDATE_AVAILABLE' &&
          navigator.serviceWorker.controller
        ) {
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

<svelte:head>
  <title>
    {page.data.title ? `${page.data.title} | ` : ''}
    L-Scan: LEGO Collectible Minifigure Online Scanner
  </title>
</svelte:head>

<main
  class="max-w-md landscape:max-w-4xl mx-auto min-h-dvh px-4 pt-pwa-top pb-pwa-bottom flex flex-col sm:border-x sm:border-border sm:shadow-2xl sm:bg-app-bg relative overflow-x-hidden"
>
  <Header {showTabs} />

  {@render children()}
</main>
