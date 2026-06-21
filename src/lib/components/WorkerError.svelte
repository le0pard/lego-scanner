<script>
  let { errorMessage } = $props();

  const handleReload = (e) => {
    e.preventDefault();
    window.location.reload();
  };
</script>

<div
  class="w-full aspect-square flex flex-col items-center justify-center bg-card-bg border-2 border-red-500/20 shadow-lg rounded-2xl p-6 text-center"
>
  <div class="p-4 bg-red-500/10 rounded-full border border-red-500/20 mb-4">
    <i class="iconify lucide--triangle-alert size-8 text-red-500"></i>
  </div>
  <h2 class="text-lg font-bold text-text-main mb-2">Scanner Offline</h2>
  <p class="text-sm text-text-muted max-w-62 mb-6">{errorMessage}</p>
  <button
    onclick={handleReload}
    class="bg-app-bg border border-border hover:border-red-500/50 text-text-main font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors cursor-pointer active:scale-95"
  >
    Reload Application
  </button>
</div>
