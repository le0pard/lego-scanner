<script>
  import { resetScanState } from '$lib/states/scanResult.svelte';

  let { errorMessage } = $props();
</script>

<div class="flex flex-col h-full animate-in fade-in duration-300">
  <div
    class="bg-error-bg border border-error-border rounded-xl p-4 flex items-center gap-4 shadow-sm mb-6"
  >
    <div class="bg-error-icon-bg text-error-text p-2 rounded-xl shrink-0">
      <i class="iconify lucide--alert-triangle size-6"></i>
    </div>
    <div>
      <h3 class="text-error-text font-bold text-lg leading-tight">Scan Error</h3>
      <p class="text-error-text-muted text-sm mt-0.5">
        {errorMessage}
      </p>
    </div>
  </div>

  <div class="flex-1 flex flex-col items-center justify-center text-center opacity-50 mb-6">
    <i class="iconify lucide--scan-line size-16 text-text-muted mb-4"></i>
    <p class="text-text-muted font-medium max-w-[50">
      Ensure the Data Matrix code is clearly visible and well-lit.
    </p>
  </div>

  <button
    onclick={resetScanState}
    class="mt-auto w-full bg-app-bg border-2 border-border hover:border-primary text-text-main font-bold py-3.5 px-4 rounded-xl transition-colors cursor-pointer active:scale-[0.99]"
  >
    Try Again
  </button>
</div>
