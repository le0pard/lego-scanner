<script>
  import { resolve } from '$app/paths';
  import { getOptimizedImage } from '$lib/utils/lego_data.js';
  import ReturnButton from '$lib/components/ReturnButton.svelte';

  let { data } = $props();

  let figures = $derived(data.figures);
  let seriesName = $derived(data.metadata?.displayName || data.metadata?.series || 'Collection');
  let seriesYear = $derived(data.metadata?.releaseYear || '');
</script>

<svelte:head>
  <meta name="description" content={`${seriesName} Minifigures and Codes`} />
</svelte:head>

<div class="flex-1 w-full pb-8 mt-4 flex flex-col gap-6 animate-in fade-in duration-300">
  <div class="flex justify-between gap-2">
    <div class="flex items-center gap-3">
      <a
        title="Catalog"
        href={resolve('/catalog')}
        class="flex justify-center bg-card-bg border border-border p-2 rounded-xl text-text-main hover:border-primary transition-colors active:scale-95"
      >
        <i class="iconify lucide--arrow-left size-5"></i>
      </a>
      <div class="flex gap-3">
        <h2 class="flex justify-center text-2xl font-black tracking-tight text-text-main">
          {seriesName}
        </h2>
        {#if data.metadata?.series}
          <a
            href={resolve(`/api/collections/${data.metadata?.series}.json`)}
            class="flex items-center gap-2 py-2 text-text-muted hover:text-text-main transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            title="API link"
          >
            <i class="iconify lucide--database size-5"></i>
          </a>
        {/if}
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

  <div class="grid grid-cols-2 landscape:grid-cols-4 gap-4">
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
          <h4 class="text-lg font-black text-text-main leading-tight mb-1">
            {fig.name}
          </h4>
          <p
            class="text-sm text-text-muted leading-tight line-clamp-3"
            title={fig.identifiers?.map((i) => i.code).join(', ')}
          >
            Codes: {fig.identifiers?.map((i) => i.code).join(', ')}
          </p>
        </div>
      </div>
    {/each}
  </div>

  <ReturnButton />
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
