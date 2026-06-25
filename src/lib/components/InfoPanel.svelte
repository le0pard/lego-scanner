<script>
  import classNames from 'classnames';
  import { resolve } from '$app/paths';
  import { syncState } from '$lib/states/sync.svelte.js';
  import { formatTime } from '$lib/utils/date.js';
  import dataMatrixCodeExampleImg from '$lib/assets/howto/data-matrix-example.jpg?enhanced';
</script>

<div class="h-full flex flex-col justify-between gap-6 p-2 md:p-4">
  <div class="flex flex-col gap-3">
    <div
      class="w-full overflow-hidden border border-border bg-black aspect-video flex items-center justify-center"
    >
      <enhanced:img
        src={dataMatrixCodeExampleImg}
        alt="Lego Minifigure box bottom with Data Matrix highlighted"
        class="w-full h-full object-cover"
      />
    </div>

    <p class="text-sm text-text-muted leading-relaxed">
      Locate the bottom flap of any blind LEGO Minifigure mystery box. Next to the standard linear
      barcode, you will see a tiny square <strong>Data Matrix</strong> code. Align this square code within
      the camera frame or upload a snapshot to decode its signatures instantly.
    </p>

    <div
      class="text-xs flex items-start gap-2 bg-badge-bg text-badge-text px-3 py-2.5 rounded-xl border border-border"
    >
      <i class="iconify lucide--info size-4 shrink-0 mt-0.5 opacity-80"></i>
      <span class="leading-normal">
        Works with <strong>Series 25 & newer</strong> boxes.
        <a
          href={resolve('/howto')}
          class="underline font-bold text-text-main hover:text-primary transition-colors ml-0.5"
        >
          View compatibility guide
        </a>
      </span>
    </div>
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
