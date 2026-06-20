<script>
  let isCameraStarted = $state(false);
  let isFlashOn = $state(false);
  let videoSource = $state('environment-0');
</script>

{#if !isCameraStarted}
  <div
    class="w-full aspect-square flex flex-col items-center justify-center border border-border bg-card-bg shadow-lg rounded-2xl p-6 text-center"
  >
    <div class="p-4 bg-app-bg rounded-full border border-border mb-4">
      <svg
        class="w-8 h-8 text-text-muted"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
        />
      </svg>
    </div>
    <p class="text-sm font-bold text-text-main mb-1">Camera Access Required</p>
    <p class="text-xs text-text-muted mb-6">
      Tap below to allow device camera access for scanning.
    </p>

    <button
      onclick={() => (isCameraStarted = true)}
      class="bg-primary hover:bg-primary-hover text-black font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors cursor-pointer active:scale-[0.99]"
    >
      Start Camera
    </button>
  </div>
{:else}
  <div
    id="workspace-camera"
    class="w-full aspect-square relative overflow-hidden rounded-2xl bg-black border border-border shadow-lg"
  >
    <div class="absolute inset-0 bg-neutral-900/10"></div>
    <div
      class="absolute inset-x-6 top-1/2 h-0.5 bg-scanner-line shadow-[0_0_15px_var(--color-scanner-line)] animate-pulse"
    ></div>

    <button
      onclick={() => (isFlashOn = !isFlashOn)}
      class="absolute top-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-md p-2.5 rounded-xl transition-colors shadow-lg border border-white/10 z-10"
      aria-label="Toggle Camera Flash"
      aria-pressed={isFlashOn}
    >
      <svg
        class="w-5 h-5 transition-all {isFlashOn
          ? 'fill-primary drop-shadow-[0_0_8px_var(--color-primary)]'
          : 'fill-neutral-400'}"
        viewBox="0 0 24 24"
      >
        <path d="M7 2v11h3v9l7-12h-4l4-8H7z" />
      </svg>
    </button>

    <div class="absolute bottom-4 inset-x-4 flex flex-col gap-2">
      <div class="text-center pointer-events-none">
        <span
          class="inline-block text-xs font-medium bg-black/70 text-white backdrop-blur-md px-3 py-1.5 rounded-lg"
          >Point camera at barcode or torso</span
        >
      </div>

      <div
        class="w-full relative bg-black/60 backdrop-blur-md rounded-xl border border-white/10 p-1 flex items-center gap-2"
      >
        <div class="pl-2 text-neutral-400 pointer-events-none">
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
        </div>

        <select
          bind:value={videoSource}
          class="flex-1 bg-transparent text-xs text-neutral-200 font-semibold py-2 pl-1 pr-8 rounded-lg outline-none cursor-pointer border-0 focus:ring-0 appearance-none"
        >
          <option value="user" class="bg-neutral-900 text-white">Front Camera (Selfie)</option>
          <option value="environment-0" class="bg-neutral-900 text-white"
            >Rear Camera (Main Wide)</option
          >
          <option value="environment-1" class="bg-neutral-900 text-white"
            >Back Camera (Ultra-Wide/Macro)</option
          >
        </select>
      </div>
    </div>
  </div>
{/if}
