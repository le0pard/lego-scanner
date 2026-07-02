<script>
  import { resolve } from '$app/paths';
  import { getOptimizedImage } from '$lib/utils/lego_data.js';

  let { data } = $props();

  let figures = $derived(data.figures);
  let seriesName = $derived(data.metadata?.displayName || data.metadata?.series || 'Collection');
  let seriesYear = $derived(data.metadata?.releaseYear || '');
</script>

<div class="flex-1 w-full pb-8 mt-4 flex flex-col gap-6 animate-in fade-in duration-300">
  <div class="flex justify-between">
    <div class="flex items-center gap-3">
      <a
        title="Catalog"
        href={resolve('/catalog')}
        class="flex justify-center bg-card-bg border border-border p-2 rounded-xl text-text-main hover:border-primary transition-colors active:scale-95"
      >
        <i class="iconify lucide--arrow-left size-5"></i>
      </a>
      <div>
        <h2 class="text-2xl font-black tracking-tight text-text-main">{seriesName}</h2>
        <p class="text-xs text-text-muted mt-0.5">All Minifigures</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      {#if seriesYear}
        <div
          class="text-sm font-bold text-text-muted bg-badge-bg border border-border px-2 py-0.5 rounded-md"
        >
          {seriesYear}
        </div>
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
    {#each figures as fig, index (index)}
      {@const optImg = getOptimizedImage(fig.imagePath)}
      <div class="bg-card-bg border border-border rounded-2xl p-4 flex flex-col shadow-sm">
        <div
          class="relative w-full aspect-4/5 mb-4 bg-app-bg rounded-xl border border-border/50 image-box"
        >
          {#if optImg}
            <enhanced:img src={optImg} alt={fig.name} sizes="(min-width: 640px) 160px, 144px" />
          {:else}
            <img src={fig.imagePath} alt={fig.name} loading="lazy" />
          {/if}
        </div>

        <div class="flex flex-col mt-auto border-t border-border/40 pt-3">
          <h4 class="text-base font-black text-text-main leading-tight mb-1">
            {fig.name}
          </h4>
          <p
            class="text-xs text-text-muted leading-tight line-clamp-2"
            title={fig.identifiers?.map((i) => i.code).join(', ')}
          >
            Data Matrix codes: {fig.identifiers?.map((i) => i.code).join(', ')}
          </p>
        </div>
      </div>
    {/each}
  </div>

  <a
    href={resolve('/')}
    class="mt-4 w-full bg-primary hover:bg-primary-hover text-neutral-950 font-black py-3.5 px-4 rounded-xl text-center transition-all shadow-md active:scale-95 cursor-pointer"
  >
    Return to Scanner
  </a>
</div>

<style>
  .image-box :global(picture) {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
  }

  .image-box :global(img) {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 4px 6px rgb(0 0 0 / 0.1));
  }
</style>
