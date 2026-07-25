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

<div class="animate-in fade-in mt-4 flex w-full flex-1 flex-col gap-6 pb-8 duration-300">
  <div class="flex justify-between gap-2">
    <div class="flex items-center gap-3">
      <a
        title="Catalog"
        href={resolve('/catalog')}
        class="flex justify-center rounded-xl border border-border bg-card-bg p-2 text-text-main transition-colors hover:border-primary active:scale-95"
      >
        <i class="iconify size-5 lucide--arrow-left"></i>
      </a>
      <div class="flex gap-3">
        <h2 class="flex justify-center text-2xl font-black tracking-tight text-text-main">
          {seriesName}
        </h2>
        {#if data.metadata?.series}
          <a
            href={resolve(`/api/collections/${data.metadata?.series}.json`)}
            class="flex items-center gap-2 py-2 text-text-muted transition-colors hover:text-text-main"
            target="_blank"
            rel="noopener noreferrer"
            title="API link"
          >
            <i class="iconify size-5 lucide--database"></i>
          </a>
        {/if}
      </div>
    </div>
    <div class="flex items-center gap-3">
      {#if seriesYear}
        <div
          class="rounded-md border border-border bg-badge-bg px-2 py-0.5 text-sm font-bold text-text-muted"
        >
          {seriesYear}
        </div>
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4 landscape:grid-cols-4">
    {#each figures as fig, index (index)}
      {@const optImg = getOptimizedImage(fig.imagePath)}
      <div class="flex flex-col rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
        <div
          class="image-box relative mb-4 aspect-4/5 w-full rounded-xl border border-border/50 bg-app-bg"
        >
          {#if optImg}
            <enhanced:img src={optImg} alt={fig.name} sizes="(min-width: 640px) 160px, 144px" />
          {:else}
            <img src={fig.imagePath} alt={fig.name} loading="lazy" />
          {/if}
        </div>

        <div class="mt-auto flex flex-col border-t border-border/40 pt-3">
          <h4 class="mb-1 text-lg leading-tight font-black text-text-main">
            {fig.name}
          </h4>
          <p
            class="line-clamp-3 text-sm leading-tight text-text-muted"
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
