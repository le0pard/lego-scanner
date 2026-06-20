<script>
  // Use Svelte 5 reactive state instead of CSS checkbox hacks
  let isMenuOpen = $state(false);
  let activeTab = $state('camera'); // 'camera' | 'upload'
  let isFlashOn = $state(false);
  let videoSource = $state('environment-0');

  // New state to manage camera permission initialization
  let isCameraStarted = $state(false);

  // Lock body scroll when drawer is open
  $effect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = isMenuOpen ? 'hidden' : 'auto';
    }
  });
</script>

<main class="max-w-md landscape:max-w-4xl mx-auto min-h-dvh px-4 pt--pwa-top pb-pwa-bottom flex flex-col sm:border-x sm:border-border sm:shadow-2xl sm:bg-app-bg relative overflow-x-hidden">

  <header class="py-3 flex justify-between items-center gap-2">
    <div class="flex-1 min-w-0">
      <h1 class="text-xl sm:text-2xl font-black tracking-tight truncate">L-Scan</h1>
      <p class="text-[10px] sm:text-xs text-text-muted truncate">Barcode & Minifig</p>
    </div>

    <div class="flex shrink-0 p-1 bg-card-bg/50 border border-border rounded-lg" role="tablist">
      <button
        role="tab"
        aria-selected={activeTab === 'camera'}
        onclick={() => activeTab = 'camera'}
        class="px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all active:scale-98 {activeTab === 'camera' ? 'bg-app-bg text-primary shadow-sm border border-border/50' : 'text-text-muted border border-transparent hover:text-text-main'}"
      >
        Camera
      </button>
      <button
        role="tab"
        aria-selected={activeTab === 'upload'}
        onclick={() => activeTab = 'upload'}
        class="px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all active:scale-98 {activeTab === 'upload' ? 'bg-app-bg text-primary shadow-sm border border-border/50' : 'text-text-muted border border-transparent hover:text-text-main'}"
      >
        Upload
      </button>
    </div>

    <nav aria-label="Main Navigation" class="flex-1 flex justify-end">
      <button
        aria-expanded={isMenuOpen}
        aria-controls="mobile-menu"
        aria-label="Toggle navigation menu"
        onclick={() => isMenuOpen = !isMenuOpen}
        class="relative z-50 block w-8 h-8 cursor-pointer flex flex-col justify-center items-end space-y-1.5 p-1"
      >
        <span class="block w-6 h-0.5 bg-text-main transition-transform duration-300 {isMenuOpen ? 'rotate-45 translate-y-[8px]' : ''}"></span>
        <span class="block w-6 h-0.5 bg-text-main transition-opacity duration-300 {isMenuOpen ? 'opacity-0' : ''}"></span>
        <span class="block w-6 h-0.5 bg-text-main transition-transform duration-300 {isMenuOpen ? '-rotate-45 -translate-y-[8px]' : ''}"></span>
      </button>

      <div
        id="mobile-menu"
        class="absolute inset-0 z-40 bg-app-bg transition-transform duration-300 ease-out p-6 pt-[calc(var(--spacing-pwa-top)+4rem)] flex flex-col justify-between text-left {isMenuOpen ? 'translate-x-0' : '-translate-x-full'}"
      >
        <ul class="space-y-4 text-lg font-bold">
          <li><a href="#" class="block py-2 text-text-main hover:text-primary transition-colors">Scanner Dashboard</a></li>
          <li><a href="#" class="block py-2 text-text-main hover:text-primary transition-colors">My Minifig Inventory</a></li>
          <li><hr class="border-border my-2" /></li>
          <li>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 py-2 text-text-muted hover:text-text-main transition-colors">
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.061.069-.061 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              Source Code
            </a>
          </li>
          <li><a href="#" class="block py-2 text-sm text-text-muted hover:text-text-main transition-colors">Report Missing Brick Set</a></li>
        </ul>
        <div class="text-xs text-text-muted border-t border-border pt-4">
          v1.4.0-BETA • PWA Sandbox
        </div>
      </div>
    </nav>
  </header>

  <div class="flex flex-col landscape:flex-row landscape:items-stretch landscape:gap-6 flex-1 w-full pb-2 mt-2">

    <div class="w-full landscape:w-1/2 landscape:max-w-[75dvh] shrink-0 flex flex-col relative z-10 mx-auto">
      {#if activeTab === 'camera'}
        {#if !isCameraStarted}
          <div class="w-full aspect-square flex flex-col items-center justify-center border border-border bg-card-bg shadow-lg rounded-2xl p-6 text-center">
            <div class="p-4 bg-app-bg rounded-full border border-border mb-4">
              <svg class="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            <p class="text-sm font-bold text-text-main mb-1">Camera Access Required</p>
            <p class="text-xs text-text-muted mb-6">Tap below to allow device camera access for scanning.</p>

            <button
              onclick={() => isCameraStarted = true}
              class="bg-primary hover:bg-primary-hover text-black font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors cursor-pointer active:scale-[0.99]"
            >
              Start Camera
            </button>
          </div>
        {:else}
          <div id="workspace-camera" class="w-full aspect-square relative overflow-hidden rounded-2xl bg-black border border-border shadow-lg">
            <div class="absolute inset-0 bg-neutral-900/10"></div>
            <div class="absolute inset-x-6 top-1/2 h-0.5 bg-scanner-line shadow-[0_0_15px_var(--color-scanner-line)] animate-pulse"></div>

            <button
              onclick={() => isFlashOn = !isFlashOn}
              class="absolute top-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-md p-2.5 rounded-xl transition-colors shadow-lg border border-white/10 z-10"
              aria-label="Toggle Camera Flash"
              aria-pressed={isFlashOn}
            >
              <svg class="w-5 h-5 transition-all {isFlashOn ? 'fill-primary drop-shadow-[0_0_8px_var(--color-primary)]' : 'fill-neutral-400'}" viewBox="0 0 24 24">
                <path d="M7 2v11h3v9l7-12h-4l4-8H7z"/>
              </svg>
            </button>

            <div class="absolute bottom-4 inset-x-4 flex flex-col gap-2">
              <div class="text-center pointer-events-none">
                <span class="inline-block text-xs font-medium bg-black/70 text-white backdrop-blur-md px-3 py-1.5 rounded-lg">Point camera at barcode or torso</span>
              </div>

              <div class="w-full relative bg-black/60 backdrop-blur-md rounded-xl border border-white/10 p-1 flex items-center gap-2">
                <div class="pl-2 text-neutral-400 pointer-events-none">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                </div>

                <select bind:value={videoSource} class="flex-1 bg-transparent text-xs text-neutral-200 font-semibold py-2 pl-1 pr-8 rounded-lg outline-none cursor-pointer border-0 focus:ring-0 appearance-none">
                  <option value="user" class="bg-neutral-900 text-white">Front Camera (Selfie)</option>
                  <option value="environment-0" class="bg-neutral-900 text-white">Rear Camera (Main Wide)</option>
                  <option value="environment-1" class="bg-neutral-900 text-white">Back Camera (Ultra-Wide/Macro)</option>
                </select>
              </div>
            </div>
          </div>
        {/if}
      {:else}
        <div id="workspace-upload" class="w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary bg-card-bg shadow-lg rounded-2xl p-6 text-center cursor-pointer transition-colors group relative">
          <input type="file" id="file-picker" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
          <div class="p-4 bg-app-bg rounded-full border border-border mb-4 group-hover:scale-105 transition-transform">
            <svg class="w-8 h-8 text-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p class="text-sm font-bold text-text-main">Drop Lego image here</p>
          <p class="text-xs text-text-muted mt-1">Supports PNG, JPG up to 10MB</p>
        </div>
      {/if}
    </div>

    <article class="mt-4 mb-0 landscape:mt-0 landscape:w-1/2 flex-1 min-h-70 flex flex-col justify-between">
      <div class="space-y-1">
        <div class="flex justify-between items-start">
          <h2 class="text-lg font-bold leading-tight">Scanner Engine</h2>
          <span class="text-xs font-mono text-text-muted">READY</span>
        </div>
        <p class="text-sm text-text-muted">Select input mode above. Flash control helps resolve specular glare reflections on slick plastic bricks.</p>
      </div>

      <footer class="mt-auto pt-4">
        <button class="w-full bg-primary hover:bg-primary-hover text-black font-bold py-3.5 px-4 rounded-xl shadow-sm transition-colors cursor-pointer active:scale-[0.99]">
          Process Frame
        </button>
      </footer>
    </article>

  </div>

</main>
