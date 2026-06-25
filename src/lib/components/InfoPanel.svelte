<script>
  import classNames from 'classnames';
  import { syncState } from '$lib/states/sync.svelte.js';
  import { formatTime } from '$lib/utils/date.js';
</script>

<div class="h-full flex flex-col justify-between gap-6 p-2 md:p-4">
  <div class="flex flex-col gap-1">
    <div class="flex justify-between items-start">
      <h2 class="text-lg font-bold leading-tight">Scanner Engine</h2>
      <span
        class="text-xs font-mono bg-success-bg text-success-text border border-success-border px-2 py-0.5 rounded-md font-bold animate-pulse"
      >
        READY
      </span>
    </div>
    <div class="w-full bg-border text-text-muted font-bold py-3.5 px-4 text-sm">
      Waiting for Code...
    </div>
    <p class="text-sm text-text-muted">
      Select input mode above. Flash control helps resolve specular glare reflections on slick
      plastic bricks.
    </p>
  </div>

  <div class="border-t border-border pt-4 flex flex-col gap-3">
    <div class="flex items-center gap-2 text-sm font-bold text-text-main">
      <i class="iconify lucide--database size-4 text-text-muted"></i>
      <h3>Lego Catalog Database</h3>
    </div>

    <div
      class="p-3 bg-app-bg border border-border rounded-xl flex items-center justify-between text-xs"
    >
      <div class="flex items-center gap-2.5 text-left">
        {#if syncState.status === 'syncing'}
          <i class="iconify lucide--refresh-cw size-4 text-primary animate-spin"></i>
          <div>
            <p class="font-bold text-text-main">Syncing Collection...</p>
            <p class="text-[10px] text-text-muted">Fetching latest JSON signatures</p>
          </div>
        {:else if syncState.status === 'error'}
          <i class="iconify lucide--alert-triangle size-4 text-error-text"></i>
          <div>
            <p class="font-bold text-error-text">Sync Deferred</p>
            <p class="text-[10px] text-text-muted">Running in local offline query mode</p>
          </div>
        {:else}
          <i class="iconify lucide--check-circle size-4 text-success-text"></i>
          <div>
            <p class="font-bold text-text-main">Database Sync Active</p>
            <p class="text-[10px] text-text-muted">
              Last verified: {formatTime(syncState.lastSynced)}
            </p>
          </div>
        {/if}
      </div>

      <span
        class={classNames(
          'font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border',
          {
            'bg-primary/10 text-primary border-primary/20': syncState.status === 'syncing',
            'bg-success-bg text-success-text border-success-border':
              syncState.status === 'synced' || syncState.status === 'idle',
            'bg-error-bg text-error-text border-error-border': syncState.status === 'error'
          }
        )}
      >
        {syncState.status}
      </span>
    </div>
  </div>
</div>
