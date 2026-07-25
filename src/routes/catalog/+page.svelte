<script>
  import { resolve } from '$app/paths';
  import { getOptimizedImage } from '$lib/utils/lego_data.js';
  import ReturnButton from '$lib/components/ReturnButton.svelte';

  let { data } = $props();
  let seriesList = $derived(data.seriesList || []);
</script>

<svelte:head>
  <meta name="description" content="Lego Catalog with Minifigures and Codes" />
</svelte:head>

<div class="animate-in fade-in mt-4 flex w-full flex-1 flex-col gap-6 pb-8 duration-300">
  <div>
    <h2 class="text-2xl font-black tracking-tight text-text-main">Lego Minifigures Catalog</h2>
    <p class="mt-0.5 text-sm text-text-muted">
      Browse your locally synchronized collections and codes.
    </p>
  </div>

  <div class="grid grid-cols-1 gap-4 landscape:grid-cols-2">
    {#each seriesList as series (series.slug)}
      {@const optImg = getOptimizedImage(series.coverImage)}
      <a
        href={resolve(`/catalog/${series.slug}`)}
        class="flex items-center gap-4 rounded-2xl border border-border bg-card-bg p-4 shadow-sm transition-colors hover:border-primary active:scale-[0.98]"
      >
        <div
          class="image-wrapper flex size-16 shrink-0 items-center justify-center rounded-xl bg-app-bg p-1.5"
        >
          {#if optImg}
            <enhanced:img src={optImg} alt={series.displayName} />
          {:else}
            <img src={series.coverImage} alt={series.displayName} />
          {/if}
        </div>
        <div class="flex flex-col">
          <h3 class="text-lg leading-tight font-bold text-text-main">{series.displayName}</h3>
          <span class="mt-1 text-sm text-text-muted">{series.releaseYear}</span>
        </div>
        <i class="ml-auto iconify size-5 text-text-muted lucide--chevron-right"></i>
      </a>
    {/each}
  </div>

  <ReturnButton />
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
