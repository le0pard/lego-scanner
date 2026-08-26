<script>
  import classNames from 'classnames';
  import { resolve } from '$app/paths';
  import { syncState } from '$lib/states/sync.svelte.js';
  import { formatDateTime } from '$lib/utils/date.js';
  import { triggerDatabaseSync } from '$lib/utils/sync_manager.js';
  import dataMatrixCodeExampleImg from '$lib/assets/howto/data-matrix-example.jpg?enhanced';

  // Prevent multiple clicks while syncing
  let isManualSyncing = $state(false);

  const handleManualSync = async () => {
    if (isManualSyncing) return;

    isManualSyncing = true;
    await triggerDatabaseSync(resolve('/'));
    isManualSyncing = false;
  };
</script>

<div class="flex h-full flex-col justify-between gap-6 p-2 md:p-4">
  <div class="flex flex-col gap-3">
    <div
      class="flex aspect-video w-full items-center justify-center overflow-hidden border border-border bg-black"
    >
      <enhanced:img
        src={dataMatrixCodeExampleImg}
        fetchpriority="high"
        alt="Lego Minifigure box bottom with Data Matrix highlighted"
        class="h-full w-full object-cover"
      />
    </div>

    <p class="text-sm leading-relaxed text-text-muted">
      Locate the bottom flap of any blind LEGO Minifigure mystery box. Next to the standard linear
      barcode, you will see a tiny square <strong>Data Matrix</strong> code. Align this square code within
      the camera frame or upload a snapshot to decode its signatures instantly.
    </p>

    <div
      class="flex items-start gap-2 rounded-xl border border-border bg-badge-bg px-3 py-2.5 text-xs text-badge-text"
    >
      <i class="mt-0.5 iconify size-4 shrink-0 opacity-80 lucide--info"></i>
      <span class="leading-normal">
        Works with <strong>Series 25 & newer</strong> boxes.
        <a
          href={resolve('/howto')}
          class="ml-0.5 font-bold text-text-main underline transition-colors hover:text-primary"
        >
          View compatibility guide
        </a>
      </span>
    </div>
  </div>

  <div class="flex flex-col gap-3 border-t border-border pt-4">
    <div
      class="flex items-center justify-between rounded-xl border border-border bg-app-bg p-3 text-xs"
    >
      <div class="flex items-center gap-2.5 text-left">
        {#if syncState.status === 'syncing'}
          <i class="iconify size-6 animate-spin text-primary lucide--refresh-cw"></i>
          <div>
            <p class="text-base font-bold text-text-main">Syncing Collection...</p>
            <p class="text-xs text-text-muted">Fetching latest JSON signatures</p>
          </div>
        {:else if syncState.status === 'error'}
          <i class="iconify size-6 text-error-text lucide--alert-triangle"></i>
          <div>
            <p class="text-base font-bold text-error-text">Sync Deferred</p>
            <p class="text-xs text-text-muted">Running in local offline query mode</p>
          </div>
        {:else}
          <i class="iconify size-6 text-success-text lucide--check-circle"></i>
          <div>
            <p class="text-base font-bold text-text-main">Database Sync Active</p>
            <p class="text-xs text-text-muted">
              DB latest update: {formatDateTime(syncState.lastSynced)}
            </p>
          </div>
        {/if}
      </div>

      <span
        class={classNames(
          'rounded-md border px-2 py-0.5 font-mono text-xs font-bold tracking-wider uppercase',
          {
            'border-primary/20 bg-primary/10 text-primary': syncState.status === 'syncing',
            'border-success-border bg-success-bg text-success-text':
              syncState.status === 'synced' || syncState.status === 'idle',
            'border-error-border bg-error-bg text-error-text': syncState.status === 'error'
          }
        )}
      >
        {syncState.status}
      </span>
    </div>

    <button
      onclick={handleManualSync}
      disabled={isManualSyncing || syncState.status === 'syncing'}
      class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card-bg px-4 py-3 text-sm font-bold text-text-main shadow-sm transition-all hover:border-primary/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
    >
      <i
        class={classNames('iconify size-4', {
          'animate-spin lucide--loader-circle': isManualSyncing || syncState.status === 'syncing',
          'lucide--refresh-cw': !isManualSyncing && syncState.status !== 'syncing'
        })}
      ></i>
      {isManualSyncing || syncState.status === 'syncing'
        ? 'Checking for updates...'
        : 'Check for Updates'}
    </button>
  </div>
</div>
