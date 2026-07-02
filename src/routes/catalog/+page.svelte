<script>
  import { resolve } from '$app/paths';
  import { getOptimizedImage } from '$lib/utils/lego_data.js';

  let { data } = $props();
  let seriesList = $derived(data.seriesList || []);
</script>

<div class="flex-1 w-full pb-8 mt-4 flex flex-col gap-6 animate-in fade-in duration-300">
  <div>
    <h2 class="text-2xl font-black tracking-tight text-text-main">Lego Catalog</h2>
    <p class="text-xs text-text-muted mt-0.5">Browse your locally synchronized collections.</p>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each seriesList as series (series.slug)}
      {@const optImg = getOptimizedImage(series.coverImage)}
      <a
        href={resolve(`/catalog/${series.slug}`)}
        class="bg-card-bg border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:border-primary transition-colors active:scale-[0.98]"
      >
        <div
          class="size-16 bg-app-bg rounded-xl flex items-center justify-center p-1.5 shrink-0 image-wrapper"
        >
          {#if optImg}
            <enhanced:img src={optImg} alt={series.displayName} />
          {:else}
            <img src={series.coverImage} alt={series.displayName} />
          {/if}
        </div>
        <div class="flex flex-col">
          <h3 class="font-bold text-text-main leading-tight">{series.displayName}</h3>
          <span class="text-xs text-text-muted mt-1">{series.releaseYear}</span>
        </div>
        <i class="iconify lucide--chevron-right size-5 text-text-muted ml-auto"></i>
      </a>
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
