<script>
  const { workerApi } = $props();
</script>

<div
  id="workspace-upload"
  class="w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary bg-card-bg shadow-lg rounded-2xl p-6 text-center cursor-pointer transition-colors group relative"
>
  <input
    type="file"
    id="file-picker"
    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    accept="image/*"
  />
  <div
    class="p-4 bg-app-bg rounded-full border border-border mb-4 group-hover:scale-105 transition-transform"
  >
    <svg
      class="w-8 h-8 text-text-muted group-hover:text-primary transition-colors"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H4a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  </div>
  <p class="text-sm font-bold text-text-main">Drop Lego image here</p>
  <p class="text-xs text-text-muted mt-1">Supports PNG, JPG up to 10MB</p>
</div>
