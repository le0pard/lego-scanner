<script>
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { db } from '$lib/utils/db.js';
  import { getOptimizedImage } from '$lib/utils/lego_data.js';

  let seriesSlug = $derived(page.params.slug);
  let figures = $state([]);
  let seriesName = $state('');
  let isLoading = $state(true);

  $effect(() => {
    if (!seriesSlug) return;
    isLoading = true;

    db.minifigures
      .where('series')
      .equals(seriesSlug)
      .sortBy('slug')
      .then((results) => {
        figures = results;
        if (results.length > 0) {
          seriesName = results[0].displayName || results[0].series;
        }
      })
      .catch((err) => console.error('Failed to load specific series:', err))
      .finally(() => {
        isLoading = false;
      });
  });
</script>

<div class="flex-1 w-full pb-8 mt-4 flex flex-col gap-6 animate-in fade-in duration-300">
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

  {#if isLoading}
    <div class="flex justify-center py-12">
      <i class="iconify lucide--loader-2 size-8 animate-spin text-primary"></i>
    </div>
  {:else}
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {#each figures as fig, index (index)}
        {@const optImg = getOptimizedImage(fig.imagePath)}
        <div class="bg-card-bg border border-border rounded-2xl p-4 flex flex-col shadow-sm">
          <div class="w-full aspect-4/5 flex items-center justify-center mb-4 image-wrapper">
            {#if optImg}
              <enhanced:img src={optImg} alt={fig.name} sizes="(min-width: 640px) 160px, 144px" />
            {:else}
              <img src={fig.imagePath} alt={fig.name} loading="lazy" />
            {/if}
          </div>

          <div class="flex flex-col mt-auto border-t border-border/40 pt-3">
            <h4 class="text-sm font-black text-text-main leading-tight mb-1">
              {fig.name}
            </h4>
            <p
              class="text-[9px] text-text-muted leading-tight line-clamp-2"
              title={fig.identifiers?.map((i) => i.code).join(', ')}
            >
              Data Matrix codes: {fig.identifiers?.map((i) => i.code).join(', ')}
            </p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .image-wrapper :global(picture) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .image-wrapper :global(img) {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>
