<script>
  import { resolve } from '$app/paths';
  import { getOptimizedImage } from '$lib/utils/lego_data.js';
  import { collectionState } from '$lib/states/collection.svelte.js';
  import CollectionToggle from '$lib/components/CollectionToggle.svelte';
  import ReturnButton from '$lib/components/ReturnButton.svelte';

  let { data } = $props();
  let groupedCollections = $derived(data.groupedCollections || []);
</script>

<svelte:head>
  <meta name="description" content="My Lego Minifigure Collection" />
</svelte:head>

<div class="animate-in fade-in mt-4 flex w-full flex-1 flex-col gap-8 pb-8 duration-300">
  <div>
    <h2 class="text-2xl font-black tracking-tight text-text-main">My Collection</h2>
    <p class="mt-0.5 text-sm text-text-muted">
      Figures you have marked as owned, stored securely on your device.
    </p>
  </div>

  <div class="flex flex-col gap-10">
    {#each groupedCollections as group (group.slug)}
      {@const ownedFigures = group.figures.filter((fig) => collectionState.isCollected(fig.slug))}

      {#if ownedFigures.length > 0}
        <section class="flex flex-col gap-4">
          <div class="flex items-end justify-between border-b border-border pb-2">
            <h3 class="text-xl font-bold text-text-main">{group.displayName}</h3>
            <a
              href={resolve(`/catalog/${group.slug}`)}
              class="flex items-center gap-1 text-sm font-bold text-text-muted transition-colors hover:text-text-main"
            >
              View Catalog <i class="iconify size-4 lucide--arrow-right"></i>
            </a>
          </div>

          <div class="grid grid-cols-2 gap-4 landscape:grid-cols-4">
            {#each ownedFigures as fig (fig.slug)}
              {@const optImg = getOptimizedImage(fig.imagePath)}
              <div class="flex flex-col rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
                <div
                  class="image-box relative mb-4 aspect-4/5 w-full rounded-xl border border-border/50 bg-app-bg"
                >
                  {#if optImg}
                    <enhanced:img
                      src={optImg}
                      alt={fig.name}
                      sizes="(min-width: 640px) 240px, 50vw"
                    />
                  {:else}
                    <img src={fig.imagePath} alt={fig.name} loading="lazy" />
                  {/if}
                </div>
                <div class="mt-auto flex flex-col gap-3 border-t border-border/40 pt-3">
                  <h4 class="text-lg leading-tight font-black text-text-main">
                    {fig.name}
                  </h4>

                  <!-- Drop in the extracted component -->
                  <CollectionToggle slug={fig.slug} />
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    {/each}

    <!-- Empty State Fallback -->
    {#if groupedCollections.every((g) => g.figures.filter( (f) => collectionState.isCollected(f.slug) ).length === 0)}
      <div
        class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center text-text-muted"
      >
        <i class="mb-3 iconify size-12 opacity-50 lucide--box"></i>
        <p class="font-bold text-text-main">Your collection is empty</p>
        <p class="mt-1 text-sm">Scan boxes or browse the catalog to add figures.</p>
        <a href={resolve('/catalog')} class="mt-4 text-sm font-bold text-primary hover:underline">
          Browse Catalog
        </a>
      </div>
    {/if}
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
