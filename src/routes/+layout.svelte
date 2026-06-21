<script>
  import './css/app.css';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { resolve } from '$app/paths';
  import { wrap } from 'comlink';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();

  // Auto-detect and set theme based on system preference
  $effect(() => {
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

    let syncWorker;
    try {
      // Boot the sync worker
      const SyncWorker = (await import('$lib/sync-worker?worker')).default;
      syncWorker = new SyncWorker();
      const syncApi = wrap(syncWorker);

      const isUpdated = await syncApi.syncDatabase(resolve('/'));

      if (isUpdated) {
        console.log('✅ Background sync complete! Database is up to date.');
      }
    } catch (err) {
      console.error('Failed to run background sync worker:', err);
    } finally {
      // Important: Kill the worker to free up system memory and battery!
      if (syncWorker) {
        syncWorker.terminate();
      }
    }
  });
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
