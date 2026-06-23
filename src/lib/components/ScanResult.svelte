<script>
  import { scanResultState, resetScanState } from '$lib/states/scanResult.svelte';

  // Receive the processed data from RightPanel
  let { minifig, searchCompleted } = $props();

  const optimizedImageModules = import.meta.glob(
    '/src/lib/assets/minifigures/**/*.{avif,AVIF,gif,GIF,heif,HEIF,jpeg,JPEG,jpg,JPG,png,PNG,tiff,TIFF,webp,WEBP}',
    {
      query: {
        enhanced: true,
        // Generates 1x (160px), 2x (320px), and 3x (480px) asset variations
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

  // Local interactive clipboard copy feedback states
  let copyStatus = $state('idle'); // 'idle' | 'success'
  let timeoutId;

  /**
   * Copies the raw Data Matrix token into the system clipboard buffer
   * and triggers a localized transient state change for visual icon tracking.
   * @param {string} text
   */
  const copyToClipboard = async (text) => {
    if (!text) return;
    if (timeoutId) clearTimeout(timeoutId);

    try {
      await navigator.clipboard.writeText(text);
      copyStatus = 'success';
    } catch (err) {
      console.warn('Clipboard buffer operation failed:', err);
      copyStatus = 'idle';
    } finally {
      // Revert the icon state back to normal after 2 seconds
      timeoutId = setTimeout(() => {
        copyStatus = 'idle';
      }, 2000);
    }
  };
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
        <div class="z-10 flex-1 min-w-0 flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h3 class="text-success-text font-bold text-lg leading-tight">Match Found!</h3>
            <p
              class="text-success-text-muted font-mono text-xs sm:text-sm mt-0.5 break-all select-all"
            >
              {scanResultState.result}
            </p>
          </div>
          <button
            type="button"
            aria-label="Copy scanned string data to clipboard"
            onclick={() => copyToClipboard(scanResultState.result)}
            class="bg-success-icon-bg/40 hover:bg-success-icon-bg text-success-text p-2 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95 border border-success-border/30 flex items-center justify-center min-w-9 min-h-9"
          >
            {#if copyStatus === 'success'}
              <i
                class="iconify lucide--check size-5 text-success-text animate-in scale-in duration-200"
              ></i>
            {:else}
              <i
                class="iconify lucide--copy size-5 opacity-80 hover:opacity-100 animate-in scale-in duration-200"
              ></i>
            {/if}
          </button>
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
        <div class="z-10 flex-1 min-w-0 flex items-center justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h3 class="text-error-text font-bold text-lg leading-tight">Code Not in Database</h3>
            <p
              class="text-error-text-muted font-mono text-xs sm:text-sm mt-0.5 break-all select-all"
            >
              {scanResultState.result}
            </p>
          </div>
          <button
            type="button"
            aria-label="Copy scanned string data to clipboard"
            onclick={() => copyToClipboard(scanResultState.result)}
            class="bg-error-icon-bg/40 hover:bg-error-icon-bg text-error-text p-2 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95 border border-error-border/30 flex items-center justify-center min-w-9 min-h-9"
          >
            {#if copyStatus === 'success'}
              <i
                class="iconify lucide--check size-5 text-error-text animate-in scale-in duration-200"
              ></i>
            {:else}
              <i
                class="iconify lucide--copy size-5 opacity-80 hover:opacity-100 animate-in scale-in duration-200"
              ></i>
            {/if}
          </button>
        </div>
      </div>

      <div
        class="bg-card-bg border border-border shadow-md rounded-xl p-4 flex flex-col gap-5 items-center relative"
      >
        <div
          class="size-36 sm:size-40 bg-app-bg border border-border rounded-xl shrink-0 flex justify-center items-center p-2 relative"
        >
          <i class="iconify lucide--package-search size-12 text-text-muted opacity-50"></i>
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
