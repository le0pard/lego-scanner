<script>
  import { scanResultState, resetScanState } from '$lib/states/scanResult.svelte';
  // import { useTiks } from '@rexa-developer/tiks/svelte';
  // import { db } from '$lib/utils/db';

  // const { success: successTick, error: errorTick } = useTiks({ theme: 'crisp', volume: 1.0 });

  let minifig = $state(null);
  let searchCompleted = $state(false);

  const getShortCode = (fullString) => {
    return fullString ? fullString.split(' ')[0] : '';
  };

  $effect(() => {
    if (scanResultState.result) {
      console.log('State changed! Reacting to new scan:', scanResultState.result);

      const shortCode = getShortCode(scanResultState.result);

      // Query IndexedDB for the short code
      // db.minifigs.get(shortCode).then((found) => {
      //   searchCompleted = true;

      //   if (found) {
      //     minifig = found;
      //     successTick();
      //   } else {
      //     // Code is valid but not in our database
      //     minifig = null;
      //     errorTick();
      //   }
      // }).catch((err) => {
      //   console.error('Database query failed:', err);
      //   searchCompleted = true;
      //   minifig = null;
      //   errorTick();
      // });
    } else if (scanResultState.errorMessage && scanResultState.errorMessage.length > 0) {
      console.log('Error scan:', scanResultState.errorMessage);
      errorTick();
      searchCompleted = false;
      minifig = null;
    } else {
      // Reset state when scan is cleared
      searchCompleted = false;
      minifig = null;
    }
  });
</script>

<article
  class="mt-4 mb-0 landscape:mt-0 landscape:w-1/2 flex-1 min-h-70 landscape:min-h-0 landscape:h-fit flex flex-col justify-start"
>
  {#if scanResultState.result && searchCompleted}
    <div class="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      {#if minifig}
        <div
          class="bg-success-bg border border-success-border rounded-2xl p-4 flex items-center gap-4 shadow-sm relative overflow-hidden"
        >
          <div class="bg-success-icon-bg text-success-text p-2 rounded-xl shrink-0 z-10">
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div class="z-10">
            <h3 class="text-success-text font-bold text-lg leading-tight">Match Found!</h3>
            <p class="text-success-text-muted font-mono text-xs sm:text-sm mt-0.5 break-all">
              {scanResultState.result}
            </p>
          </div>
        </div>

        <div
          class="bg-card-bg border border-border shadow-md rounded-[1.5rem] p-4 flex gap-5 items-center relative"
        >
          <div
            class="w-28 h-28 sm:w-32 sm:h-32 bg-app-bg border border-border rounded-2xl shrink-0 flex justify-center items-center p-2 relative"
          >
            <img
              src={minifig.image ||
                'https://www.lego.com/cdn/cs/set/assets/blt5ce56b7c02b9e6e4/71046_0-Bionicle-1.png?format=png&height=300&dpr=1'}
              alt={minifig.name || 'Minifigure'}
              class="max-h-full object-contain drop-shadow-lg"
            />
          </div>
          <div class="flex flex-col items-start justify-center">
            <span class="bg-badge-bg text-badge-text text-xs font-bold px-3 py-1 rounded-full mb-2">
              Series {minifig.series || 'Unknown'}
            </span>
            <h2 class="text-xl sm:text-2xl font-black text-text-main leading-tight mb-1">
              {minifig.name || 'Unknown Figure'}
            </h2>
            <p class="text-sm font-medium text-text-muted">
              QR Code: {getShortCode(scanResultState.result)}
            </p>
          </div>
        </div>
      {:else}
        <div
          class="bg-error-bg border border-error-border rounded-2xl p-4 flex items-center gap-4 shadow-sm relative overflow-hidden"
        >
          <div class="bg-error-icon-bg text-error-text p-2 rounded-xl shrink-0 z-10">
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div class="z-10">
            <h3 class="text-error-text font-bold text-lg leading-tight">Code Not in Database</h3>
            <p class="text-error-text-muted font-mono text-xs sm:text-sm mt-0.5 break-all">
              {scanResultState.result}
            </p>
          </div>
        </div>

        <div
          class="bg-card-bg border border-border shadow-md rounded-[1.5rem] p-4 flex gap-5 items-center relative"
        >
          <div
            class="w-28 h-28 sm:w-32 sm:h-32 bg-app-bg border border-border rounded-2xl shrink-0 flex justify-center items-center p-2 relative"
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
  {:else if !scanResultState.result}
    <div class="h-full flex flex-col justify-between">
      <div class="space-y-1">
        <div class="flex justify-between items-start">
          <h2 class="text-lg font-bold leading-tight">Scanner Engine</h2>
          <span class="text-xs font-mono text-text-muted">READY</span>
        </div>
        <p class="text-sm text-text-muted">
          Select input mode above. Flash control helps resolve specular glare reflections on slick
          plastic bricks.
        </p>
      </div>

      <footer class="mt-auto pt-4">
        <button
          disabled
          class="w-full bg-border text-text-muted font-bold py-3.5 px-4 rounded-xl shadow-sm cursor-not-allowed opacity-50"
        >
          Waiting for Code...
        </button>
      </footer>
    </div>
  {/if}
</article>
