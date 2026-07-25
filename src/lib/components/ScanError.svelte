<script>
  import { resetScanState } from '$lib/states/scanResult.svelte.js';

  let { errorMessage } = $props();
</script>

<div class="animate-in fade-in flex h-full flex-col duration-300">
  <div
    class="mb-6 flex items-center gap-4 rounded-xl border border-error-border bg-error-bg p-4 shadow-sm"
  >
    <div class="shrink-0 rounded-xl bg-error-icon-bg p-2 text-error-text">
      <i class="iconify size-6 lucide--alert-triangle"></i>
    </div>
    <div>
      <h3 class="text-lg leading-tight font-bold text-error-text">Scan Error</h3>
      <p class="mt-0.5 text-sm text-error-text-muted">
        {errorMessage}
      </p>
    </div>
  </div>

  <div class="mb-6 flex flex-1 flex-col items-center justify-center text-center opacity-50">
    <i class="mb-4 iconify size-16 text-text-muted lucide--scan-line"></i>
    <p class="max-w-50 font-medium text-text-muted">
      Ensure the Data Matrix code is clearly visible and well-lit.
    </p>
  </div>

  <button
    onclick={resetScanState}
    class="mt-auto w-full cursor-pointer rounded-xl border-2 border-border bg-app-bg px-4 py-3.5 font-bold text-text-main transition-colors hover:border-primary active:scale-[0.99]"
  >
    Try Again
  </button>
</div>
