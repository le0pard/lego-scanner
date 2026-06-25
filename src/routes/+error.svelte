<script>
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import Header from '$lib/components/Header.svelte';
</script>

<main
  class="max-w-md landscape:max-w-4xl mx-auto min-h-dvh px-4 pt-pwa-top pb-pwa-bottom flex flex-col sm:border-x sm:border-border sm:shadow-2xl sm:bg-app-bg relative overflow-x-hidden justify-between"
>
  <Header showTabs={false} />

  <div
    class="flex-1 flex flex-col items-center justify-center text-center my-auto p-4 animate-in fade-in zoom-in-95 duration-300"
  >
    <div class="relative flex items-center justify-center w-24 h-24 mb-6">
      <div
        class="absolute inset-0 bg-primary/10 rounded-full border border-primary/20 animate-ping duration-1000 opacity-40"
      ></div>
      <div
        class="p-5 bg-card-bg border-2 border-primary/30 rounded-2xl shadow-md text-primary relative z-10 flex items-center justify-center"
      >
        {#if page.status === 404}
          <i class="iconify lucide--puzzle size-12 drop-shadow-[0_0_6px_var(--color-primary)]"></i>
        {:else}
          <i class="iconify lucide--triangle-alert size-12 text-error-text"></i>
        {/if}
      </div>
    </div>

    <h2 class="text-3xl font-black tracking-tight text-text-main uppercase mb-2">
      {#if page.status === 404}
        Piece Missing!
      {:else}
        System Jammed!
      {/if}
    </h2>

    <span
      class="px-2.5 py-0.5 font-mono text-xs font-bold rounded-md mb-4 border bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 border-border"
    >
      Error Code: {page.status}
    </span>

    <p class="text-sm text-text-muted max-w-72 leading-relaxed mb-8">
      {#if page.status === 404}
        The page you are looking for has been moved, disassembled, or never existed.
      {:else}
        {page.error?.message ||
          'An unexpected background script dropout occurred inside the active layout workspace.'}
      {/if}
    </p>

    <div class="w-full flex flex-col gap-2.5 max-w-xs">
      <a
        href={resolve('/')}
        class="w-full bg-primary hover:bg-primary-hover text-neutral-950 font-black py-3.5 px-4 rounded-xl text-center transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 text-sm"
      >
        <i class="iconify lucide--scan size-4"></i>
        Return to Scanner Workbench
      </a>

      <a
        href={resolve('/howto')}
        class="w-full bg-card-bg border border-border hover:border-primary/50 text-text-main font-bold py-3 px-4 rounded-xl text-center transition-all active:scale-[0.98] cursor-pointer text-sm"
      >
        Read Documentation
      </a>
    </div>
  </div>
</main>
