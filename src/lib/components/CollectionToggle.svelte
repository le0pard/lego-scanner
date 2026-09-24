<script>
  import { collectionState } from '$lib/states/collection.svelte.js';

  let { slug } = $props();
</script>

<button
  onclick={() => collectionState.toggle(slug)}
  class="flex w-full items-center justify-center gap-1 rounded-xl border px-4 py-2 text-sm font-bold transition-all active:scale-95 {collectionState.isCollected(
    slug
  )
    ? 'border-success-border bg-success-bg/20 text-success-text hover:border-error-border hover:bg-error-bg hover:text-error-text'
    : 'border-border bg-app-bg text-text-main hover:border-primary'}"
>
  {#if collectionState.isCollected(slug)}
    <i class="iconify size-4 lucide--check-circle"></i>
    <span>Collected</span>
  {:else}
    <i class="iconify size-4 lucide--plus-circle"></i>
    <span>Collect</span>
  {/if}
</button>
