<script>
  let { errorMessage } = $props();

  const handleReload = (e) => {
    e.preventDefault();
    window.location.reload();
  };
</script>

<div
  class="flex aspect-square w-full flex-col items-center justify-center rounded-2xl border-2 border-red-500/20 bg-card-bg p-6 text-center shadow-lg"
>
  <div class="mb-4 rounded-full border border-red-500/20 bg-red-500/10 p-4">
    <i class="iconify size-8 text-red-500 lucide--triangle-alert"></i>
  </div>
  <h2 class="mb-2 text-lg font-bold text-text-main">Scanner Offline</h2>
  <p class="mb-6 max-w-62 text-sm text-text-muted">{errorMessage}</p>
  <button
    onclick={handleReload}
    class="cursor-pointer rounded-xl border border-border bg-app-bg px-6 py-2.5 font-bold text-text-main shadow-sm transition-colors hover:border-red-500/50 active:scale-95"
  >
    Reload Application
  </button>
</div>
