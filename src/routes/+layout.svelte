<script>
  import './css/app.css';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { resolve } from '$app/paths';
  import Header from '$lib/components/Header.svelte';

  import { setSyncStatus } from '$lib/states/sync.svelte.js';
  import { setUpdateAvailable } from '$lib/states/update.svelte.js';

  import {
    firstSortedMetaRecord,
    triggerDatabaseSync,
    registerPeriodicSync
  } from '$lib/utils/sync_manager.js';

  let { children } = $props();

  let showTabs = $derived(page.url.pathname === '/');

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

    await triggerDatabaseSync(resolve('/'));
  });

  onMount(() => {
    if (!browser) return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          if (registration.waiting && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }

          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });

          // Call the extracted periodic sync function
          registerPeriodicSync(registration);
        }
      });

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

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  });
</script>

<svelte:head>
  <title
    >{[page.data.title ? `${page.data.title} |` : null, 'L-Scan: LEGO Minifigure Online Scanner']
      .filter(Boolean)
      .join(' ')}</title
  >
  <link rel="canonical" href={`${page.url.origin}${page.url.pathname}`} />
</svelte:head>

<main
  class="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-x-hidden px-4 pt-pwa-top pb-pwa-bottom sm:border-x sm:border-border sm:bg-app-bg sm:shadow-2xl landscape:max-w-4xl"
>
  <Header {showTabs} />

  {@render children()}
</main>
