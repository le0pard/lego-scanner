<script>
  import { scanResultState, resetScanState } from '$lib/states/scanResult.svelte';

  // Receive the processed data from RightPanel
  let { minifig, searchCompleted } = $props();

  const optimizedImageModules = import.meta.glob(
    '/src/lib/assets/minifigures/**/*.{avif,AVIF,gif,GIF,heif,HEIF,jpeg,JPEG,jpg,JPG,png,PNG,tiff,TIFF,webp,WEBP}',
    {
      query: {
        // Generates 1x (160px), 2x (320px), and 3x (480px) asset variations
        enhanced: true,
        w: '160;320;480'
      },
      import: 'default',
      eager: true
    }
  );

  let optimizedImage = $derived.by(() => {
    if (!minifig?.imagePath) return null;

    const resolvedSourceKey = minifig.imagePath.replace('/assets/', '/src/lib/assets/');
    return optimizedImageModules[resolvedSourceKey] || null;
  });
</script>

{#if searchCompleted}
  <div
    class="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-300 p-2 md:p-4"
  >
    {#if minifig}
      <div
        class="bg-success-bg border border-success-border rounded-xl p-4 flex items-center gap-4 shadow-sm relative overflow-hidden"
      >
        <div class="bg-success-icon-bg text-success-text flex p-2 rounded-xl shrink-0 z-10">
          <i class="iconify lucide--circle-check size-6"></i>
        </div>
        <div class="z-10">
          <h3 class="text-success-text font-bold text-lg leading-tight">Match Found!</h3>
          <p class="text-success-text-muted font-mono text-xs sm:text-sm mt-0.5 break-all">
            {scanResultState.result}
          </p>
        </div>
      </div>

      <div
        class="bg-card-bg border border-border shadow-md rounded-xl p-4 flex flex-col gap-5 items-center relative"
      >
        <div
          class="image-box size-36 sm:size-40 bg-app-bg border border-border rounded-xl shrink-0 flex justify-center items-center p-2 relative"
        >
          {#if optimizedImage}
            <enhanced:img
              src={optimizedImage}
              alt={minifig.name}
              sizes="(min-width: 640px) 160px, 144px"
              class="max-w-full max-h-full object-contain drop-shadow-lg"
            />
          {:else}
            <img
              src={minifig.imagePath}
              alt={minifig.name}
              class="max-w-full max-h-full object-contain drop-shadow-lg"
            />
          {/if}
        </div>
        <div class="flex flex-col items-start justify-center">
          <span class="bg-badge-bg text-badge-text text-xs font-bold px-3 py-1 rounded-full mb-2">
            {minifig.displayName || 'Unknown'}
          </span>
          <h2 class="text-xl sm:text-2xl font-black text-text-main leading-tight mb-1">
            {minifig.name || 'Unknown Figure'}
          </h2>
          <p class="text-sm font-medium text-text-muted">
            QR Code: {scanResultState.result}
          </p>
        </div>
      </div>
    {:else}
      <div
        class="bg-error-bg border border-error-border rounded-xl p-4 flex items-center gap-4 shadow-sm relative overflow-hidden"
      >
        <div class="bg-error-icon-bg text-error-text flex p-2 rounded-xl shrink-0 z-10">
          <i class="iconify lucide--x size-6"></i>
        </div>
        <div class="z-10">
          <h3 class="text-error-text font-bold text-lg leading-tight">Code Not in Database</h3>
          <p class="text-error-text-muted font-mono text-xs sm:text-sm mt-0.5 break-all">
            {scanResultState.result}
          </p>
        </div>
      </div>

      <div
        class="bg-card-bg border border-border shadow-md rounded-xl p-4 flex flex-col gap-5 items-center relative"
      >
        <div
          class="size-36 sm:size-40 bg-app-bg border border-border rounded-xl shrink-0 flex justify-center items-center p-2 relative"
        >
          <svg
            class="w-12 h-12 text-text-muted opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div class="flex flex-col items-start justify-center">
          <span class="bg-error-bg text-error-text text-xs font-bold px-3 py-1 rounded-full mb-2">
            Unknown Box
          </span>
          <h2 class="text-xl sm:text-2xl font-black text-text-main leading-tight mb-1">
            Figure Not Found
          </h2>
          <p class="text-sm font-medium text-text-muted">
            This code hasn't been added to your local database yet.
          </p>
        </div>
      </div>
    {/if}

    <button
      onclick={resetScanState}
      class="mt-4 w-full bg-app-bg border-2 border-border hover:border-primary text-text-main font-bold py-3.5 px-4 rounded-xl transition-colors cursor-pointer active:scale-[0.99]"
    >
      Scan Another Box
    </button>
  </div>
{/if}

<style>
  /**
   * Style the precompiled picture wrapper as a standard layout block.
   * This allows the child image to safely scale to 100% height.
   */
  .image-box :global(picture) {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
  }
</style>
