<script>
  import { onMount, onDestroy } from 'svelte';
  import { resolve } from '$app/paths';
  import { browser } from '$app/environment';
  import { wrap } from 'comlink';

  import Camera from '$lib/components/Camera.svelte';
  import Header from '$lib/components/Header.svelte';
  import RightPanel from '$lib/components/RightPanel.svelte';
  import Upload from '$lib/components/Upload.svelte';
  import WorkerError from '$lib/components/WorkerError.svelte';
  import WorkerLoading from '$lib/components/WorkerLoading.svelte';
  import { isMenuOpen } from '$lib/states/menu.svelte';
  import { uploadTabState } from '$lib/states/tabs.svelte';

  let workersLoaded = $state(false);
  let errorMessage = $state('');
  let scannerWorker = null;
  let scannerWorkerApi = null;

  const getScanner = () => scannerWorkerApi;

  onMount(async () => {
    if (!browser) return;

    try {
      const ScannerWorker = (await import('$lib/scanner-worker?worker')).default;
      scannerWorker = new ScannerWorker();
      scannerWorkerApi = wrap(scannerWorker);
      await scannerWorkerApi.init(resolve('/'));
      workersLoaded = true;
    } catch (err) {
      errorMessage = err.message || 'Failed to boot scanner engine.';
    }
  });

  onDestroy(() => {
    if (scannerWorker) {
      scannerWorker.terminate();
    }
  });

  // Dynamic lock controls optimizing layout interaction surfaces
  $effect(() => {
    if (typeof document !== 'undefined' && document.body?.style) {
      document.body.style.overflow = isMenuOpen() ? 'hidden' : 'auto';
    }
  });
</script>

<main
  class="max-w-md landscape:max-w-4xl mx-auto min-h-dvh px-4 pt-pwa-top pb-pwa-bottom flex flex-col sm:border-x sm:border-border sm:shadow-2xl sm:bg-app-bg relative overflow-x-hidden"
>
  <Header />

  <div
    class="flex flex-col landscape:flex-row landscape:items-start landscape:gap-6 flex-1 w-full pb-2 mt-2"
  >
    <div
      class="w-full landscape:w-1/2 landscape:max-w-[75dvh] shrink-0 flex flex-col relative z-10 mx-auto"
    >
      {#if errorMessage && errorMessage.length > 0}
        <WorkerError {errorMessage} />
      {:else if !workersLoaded}
        <WorkerLoading />
      {:else}
        {#if uploadTabState()}
          <Upload {getScanner} />
        {:else}
          <Camera {getScanner} />
        {/if}
      {/if}
    </div>

    <RightPanel />
  </div>
</main>
