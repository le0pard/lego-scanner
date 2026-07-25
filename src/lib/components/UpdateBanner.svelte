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
  <div class="animate-in fade-in mt-2 w-full text-left duration-300">
    <div
      class="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4 shadow-sm"
    >
      <div class="flex items-start gap-3">
        <div class="flex shrink-0 rounded-lg bg-primary p-1 text-black">
          <i class="iconify size-6 lucide--circle-arrow-down"></i>
        </div>
        <div>
          <h4 class="text-sm leading-snug font-bold text-text-main">
            Application Update Available!
          </h4>
          <p class="mt-0.5 text-xs text-text-muted">
            New Lego set indexes and scanning enhancements have been downloaded for offline use.
          </p>
        </div>
      </div>
      <button
        onclick={reloadApp}
        class="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-center text-xs font-bold text-black shadow-sm transition-colors hover:bg-primary-hover active:scale-[0.98]"
      >
        <i class="iconify size-4 lucide--refresh-cw"></i>
        Reload & Update App
      </button>
    </div>
  </div>
{/if}
