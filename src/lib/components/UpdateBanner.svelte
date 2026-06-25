<script>
  import { updateState } from '$lib/states/update.svelte.js';

  const reloadApp = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        // Listen for the new service worker to take control of the page
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
        // Tell the waiting service worker to activate immediately
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        return; // Exit early, the controllerchange listener will handle the reload
      }
    }

    // If no service worker is waiting or supported, just reload normally
    window.location.reload();
  };
</script>

{#if updateState.available}
  <div class="w-full mt-2 animate-in fade-in duration-300 text-left">
    <div
      class="p-4 bg-primary/10 border border-primary/20 rounded-xl flex flex-col gap-3 shadow-sm"
    >
      <div class="flex items-start gap-3">
        <div class="flex bg-primary text-black p-1 rounded-lg shrink-0">
          <i class="iconify lucide--circle-arrow-down size-6"></i>
        </div>
        <div>
          <h4 class="text-sm font-bold text-text-main leading-snug">
            Application Update Available!
          </h4>
          <p class="text-xs text-text-muted mt-0.5">
            New Lego set indexes and scanning enhancements have been downloaded for offline use.
          </p>
        </div>
      </div>
      <button
        onclick={reloadApp}
        class="w-full bg-primary hover:bg-primary-hover text-black text-xs font-bold py-2.5 px-3 rounded-lg shadow-sm transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 active:scale-[0.98]"
      >
        <i class="iconify lucide--refresh-cw size-4"></i>
        Reload & Update App
      </button>
    </div>
  </div>
{/if}
