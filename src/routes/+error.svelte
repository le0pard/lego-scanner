<script>
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
</script>

<div
  class="animate-in fade-in zoom-in-95 my-auto flex flex-1 flex-col items-center justify-center p-4 text-center duration-300"
>
  <div class="relative mb-6 flex h-24 w-24 items-center justify-center">
    <div
      class="absolute inset-0 animate-ping rounded-full border border-primary/20 bg-primary/10 opacity-40 duration-1000"
    ></div>
    <div
      class="relative z-10 flex items-center justify-center rounded-2xl border-2 border-primary/30 bg-card-bg p-5 text-primary shadow-md"
    >
      {#if page.status === 404}
        <i class="iconify size-12 drop-shadow-[0_0_6px_var(--color-primary)] lucide--puzzle"></i>
      {:else}
        <i class="iconify size-12 text-error-text lucide--triangle-alert"></i>
      {/if}
    </div>
  </div>

  <h2 class="mb-2 text-3xl font-black tracking-tight text-text-main uppercase">
    {#if page.status === 404}
      Piece Missing!
    {:else}
      System Jammed!
    {/if}
  </h2>

  <span
    class="mb-4 rounded-md border border-border bg-neutral-200 px-2.5 py-0.5 font-mono text-xs font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
  >
    Error Code: {page.status}
  </span>

  <p class="mb-8 max-w-72 text-sm leading-relaxed text-text-muted">
    {#if page.status === 404}
      The page you are looking for has been moved, disassembled, or never existed.
    {:else}
      {page.error?.message ||
        'An unexpected background script dropout occurred inside the active layout workspace.'}
    {/if}
  </p>

  <div class="flex w-full max-w-xs flex-col gap-2.5">
    <a
      href={resolve('/')}
      class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-center text-sm font-black text-neutral-950 shadow-sm transition-all hover:bg-primary-hover active:scale-[0.98]"
    >
      <i class="iconify size-4 lucide--scan"></i>
      Return to Scanner Workbench
    </a>

    <a
      href={resolve('/howto')}
      class="w-full cursor-pointer rounded-xl border border-border bg-card-bg px-4 py-3 text-center text-sm font-bold text-text-main transition-all hover:border-primary/50 active:scale-[0.98]"
    >
      Read Documentation
    </a>
  </div>
</div>
