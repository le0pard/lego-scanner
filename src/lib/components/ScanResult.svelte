<script>
  import { resolve } from '$app/paths';
  import { scanResultState, resetScanState } from '$lib/states/scanResult.svelte.js';
  import { collectionState } from '$lib/states/collection.svelte.js';
  import { extractFieldsFromDataMatrix, getOptimizedImage } from '$lib/utils/lego_data.js';
  import { sessionState } from '$lib/states/session.svelte.js';
  import { mysteryMode } from '$lib/states/ui.svelte.js';
  import CollectionToggle from '$lib/components/CollectionToggle.svelte';

  const REPOSITORY_URL = 'https://github.com/le0pard/lego-scanner/issues/new';

  // Receive the processed data from RightPanel
  let { minifig, searchCompleted, sessionData } = $props();

  let legoData = $derived(extractFieldsFromDataMatrix(scanResultState.result));
  let optimizedImage = $derived(getOptimizedImage(minifig?.imagePath));

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

  const resetSessionAndScan = () => {
    sessionState.resetSession();
    resetScanState();
  };

  /**
   * Generates a GitHub Issue Creation link pre-filled with raw tracking signatures.
   * @param {string} rawToken - Scanned code sequence string
   * @returns {string} URL string
   */
  const generateReportUrl = (rawToken) => {
    // Structure metadata information body payload
    const bodyContent =
      `### Scanned Token String\n` +
      `\`\`\`\n` +
      `${rawToken}\n` +
      `\`\`\`\n\n` +
      `### Identified Parameters (If Available)\n` +
      `- **Extracted Base Code:** ${legoData?.code || 'Unknown'}\n` +
      `- **Factory Identifier:** ${legoData?.factory || 'Unknown'}\n` +
      `- **Production Year Stamp:** ${legoData?.year || 'Unknown'}\n\n` +
      `### Missing Minifigure / Set Details\n` +
      `- **LEGO Series Name:** (e.g., Series 29, Formula 1)\n` +
      `- **Minifigure Character Name:** \n\n` +
      `### Additional Context\n` +
      `Provide any extra numerical codes printed near the box bottom flap or region details here.`;

    const urlParams = new URLSearchParams({
      template: 'missing_figure.md',
      title: `[Missing Figure] Code: ${legoData?.code || rawToken}`,
      body: bodyContent
    });

    return `${REPOSITORY_URL}?${urlParams.toString()}`;
  };
</script>

{#if searchCompleted}
  <div
    class="animate-in fade-in slide-in-from-bottom-2 flex w-full flex-col gap-4 p-2 duration-300 md:p-4"
  >
    {#if minifig}
      <div
        class="relative flex items-center gap-2 overflow-hidden rounded-xl border border-success-border bg-success-bg px-2 py-4 shadow-sm"
      >
        <div class="z-10 flex shrink-0 rounded-xl bg-success-icon-bg p-2 text-success-text">
          <i class="iconify size-6 lucide--circle-check"></i>
        </div>
        <div class="z-10 flex min-w-0 flex-1 items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <h3 class="text-lg leading-tight font-bold text-success-text">Match Found!</h3>
            <p
              class="mt-0.5 font-mono text-xs break-all text-success-text-muted select-all sm:text-sm"
            >
              {scanResultState.result}
            </p>
          </div>
          <button
            type="button"
            aria-label="Copy scanned string data to clipboard"
            onclick={() => copyToClipboard(scanResultState.result)}
            class="flex min-h-9 min-w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-success-border/30 bg-success-icon-bg/40 p-2 text-success-text transition-all hover:bg-success-icon-bg active:scale-95"
          >
            {#if copyStatus === 'success'}
              <i
                class="animate-in scale-in iconify size-5 text-success-text duration-200 lucide--check"
              ></i>
            {:else}
              <i
                class="animate-in scale-in iconify size-5 opacity-80 duration-200 lucide--copy hover:opacity-100"
              ></i>
            {/if}
          </button>
        </div>
      </div>

      <div
        class="relative flex flex-col items-center gap-5 rounded-xl border border-border bg-card-bg p-4 shadow-md"
      >
        <div
          class="image-box relative flex size-52 shrink-0 items-center justify-center rounded-xl border border-border bg-app-bg p-2 sm:size-56 md:size-60"
        >
          {#if mysteryMode.active && !collectionState.isCollected(minifig.slug)}
            <div
              class="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl transition-colors {sessionData.isDuplicate
                ? 'border-2 border-error-border bg-error-bg text-error-text'
                : 'bg-neutral-900 text-white'}"
            >
              {#if sessionData.isDuplicate}
                <i class="mb-2 iconify size-8 animate-pulse lucide--alert-triangle"></i>
              {/if}

              <span class="mb-1 text-4xl font-black">#{sessionData.mysteryId}</span>

              <span
                class="text-[10px] font-bold tracking-widest uppercase {sessionData.isDuplicate
                  ? 'text-error-text-muted'
                  : 'text-white/70'}"
              >
                {sessionData.isDuplicate ? 'Duplicate Box' : 'Mystery Box'}
              </span>

              {#if sessionData.isDuplicate}
                <button
                  type="button"
                  onclick={resetSessionAndScan}
                  class="mt-4 flex cursor-pointer items-center gap-1.5 rounded-lg bg-error-text/10 px-3 py-1.5 text-xs font-bold transition-all hover:bg-error-text/20 active:scale-95"
                >
                  <i class="iconify size-3.5 lucide--rotate-ccw"></i>
                  Reset Session
                </button>
              {/if}
            </div>
          {/if}

          {#if optimizedImage}
            <enhanced:img
              src={optimizedImage}
              alt={minifig.name}
              sizes="(min-width: 640px) 240px, 208px"
              class="max-h-full max-w-full object-contain drop-shadow-lg"
            />
          {:else}
            <img
              src={minifig.imagePath}
              alt={minifig.name}
              class="max-h-full max-w-full object-contain drop-shadow-lg"
            />
          {/if}
        </div>
        <div class="flex flex-col items-start justify-center">
          {#if minifig.series}
            <a
              href={resolve(`/catalog/${minifig.series}`)}
              class="mb-2 flex items-center justify-center gap-1 rounded-full border border-transparent bg-badge-bg px-3 py-1 text-xs font-bold text-badge-text transition-colors hover:border-primary active:scale-95"
            >
              <i
                class="iconify size-4 opacity-60 transition-opacity lucide--link-2 group-hover:opacity-100"
              ></i>
              {minifig.displayName || 'Unknown'}
            </a>
          {:else}
            <span
              class="mb-2 rounded-full border border-transparent bg-badge-bg px-3 py-1 text-xs font-bold text-badge-text"
            >
              {minifig.displayName || 'Unknown'}
            </span>
          {/if}
          <h2 class="mb-1 text-xl leading-tight font-black text-text-main sm:text-2xl">
            {#if mysteryMode.active && !collectionState.isCollected(minifig.slug)}
              Mystery Figure {sessionData.mysteryId}
            {:else}
              {minifig.name || 'Unknown Figure'}
            {/if}
          </h2>
          {#if legoData?.code}
            <p class="text-sm font-medium text-text-muted">
              Code: {legoData?.code}
            </p>
          {/if}
        </div>

        <div class="w-full">
          <CollectionToggle slug={minifig.slug} />
        </div>
      </div>

      <button
        onclick={resetScanState}
        class="mt-2 w-full cursor-pointer rounded-xl border-2 border-border bg-app-bg px-4 py-3.5 font-bold text-text-main transition-colors hover:border-primary active:scale-[0.99]"
      >
        Scan Another Box
      </button>
    {:else}
      <div
        class="relative flex items-center gap-2 overflow-hidden rounded-xl border border-error-border bg-error-bg px-2 py-4 shadow-sm"
      >
        <div class="z-10 flex shrink-0 rounded-xl bg-error-icon-bg p-2 text-error-text">
          <i class="iconify size-6 lucide--x"></i>
        </div>
        <div class="z-10 flex min-w-0 flex-1 items-center justify-between gap-2">
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <h3 class="text-lg leading-tight font-bold text-error-text">Code Not in Database</h3>
            <p
              class="mt-0.5 font-mono text-xs break-all text-error-text-muted select-all sm:text-sm"
            >
              {scanResultState.result}
            </p>
          </div>
          <button
            type="button"
            aria-label="Copy scanned string data to clipboard"
            onclick={() => copyToClipboard(scanResultState.result)}
            class="flex min-h-9 min-w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-error-border/30 bg-error-icon-bg/40 p-2 text-error-text transition-all hover:bg-error-icon-bg active:scale-95"
          >
            {#if copyStatus === 'success'}
              <i
                class="animate-in scale-in iconify size-5 text-error-text duration-200 lucide--check"
              ></i>
            {:else}
              <i
                class="animate-in scale-in iconify size-5 opacity-80 duration-200 lucide--copy hover:opacity-100"
              ></i>
            {/if}
          </button>
        </div>
      </div>

      <div
        class="relative flex flex-col items-center gap-5 rounded-xl border border-border bg-card-bg p-4 shadow-md"
      >
        <div
          class="relative flex size-36 shrink-0 items-center justify-center rounded-xl border border-border bg-app-bg p-2 sm:size-40"
        >
          <i class="iconify size-12 text-text-muted opacity-50 lucide--package-search"></i>
        </div>
        <div class="flex flex-col items-start justify-center">
          <span class="mb-2 rounded-full bg-error-bg px-3 py-1 text-xs font-bold text-error-text">
            Unknown Box
          </span>
          <h2 class="mb-1 text-xl leading-tight font-black text-text-main sm:text-2xl">
            Figure Not Found
          </h2>
          <p class="text-sm font-medium text-text-muted">
            This code hasn't been added to your local database yet.
          </p>
        </div>
      </div>

      <a
        href={generateReportUrl(scanResultState.result)}
        target="_blank"
        rel="external noopener noreferrer"
        class="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-center text-sm font-black text-neutral-950 shadow-sm transition-all select-none hover:bg-primary-hover active:scale-[0.98]"
      >
        <i class="iconify size-8 mdi--github"></i>
        Help with missing figure
      </a>
    {/if}
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
