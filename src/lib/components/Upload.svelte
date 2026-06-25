<script>
  import { onMount, onDestroy } from 'svelte';
  import classNames from 'classnames';
  import { dev, browser } from '$app/environment';
  import { useTiks } from '@rexa-developer/tiks/svelte';
  import { setScanResult, setScanError, resetScanState } from '$lib/states/scanResult.svelte';

  const { getScanner } = $props();
  const { warning: warningTick } = useTiks({ theme: 'crisp', volume: 1.0 });

  let isProcessing = $state(false);
  let isDragging = $state(false);
  let isDiagnosticsExpanded = $state(false);
  let debugImageStages = $state([]);

  const processFile = async (file) => {
    isProcessing = true;
    debugImageStages = [];

    resetScanState();

    try {
      const result = await getScanner().detectFromFile(file);

      // usage for debug
      if (dev) {
        debugImageStages = await getScanner().runDiagnosticSuite(file);
      }

      if (result) {
        setScanResult(result);
      } else {
        setScanError('Failed to read Data Matrix');
      }
    } catch (err) {
      setScanError('Failed to process image');
      console.error('Failed to process image:', err);
    } finally {
      isProcessing = false;
    }
  };

  const handleFileInput = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
      event.target.value = '';
    }
  };

  // Clipboard Copy Buffer Intersection Handler
  const handlePaste = async (event) => {
    if (isProcessing) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault(); // Stop native text paste behaviors
          await processFile(file);
          break;
        }
      }
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    isDragging = true;
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    isDragging = false;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    isDragging = true;
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    isDragging = false;

    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await processFile(file);
    } else if (file) {
      console.warn('Dropped file payload is invalid.');
      warningTick();
    }
  };

  // Bind window events when the user opens the Upload dashboard view context
  onMount(() => {
    if (!browser) return;

    if (typeof window !== 'undefined') {
      window.addEventListener('paste', handlePaste);
    }

    return () => {
      if (!browser) return;

      if (typeof window !== 'undefined') {
        window.removeEventListener('paste', handlePaste);
      }
    };
  });

  onDestroy(() => {
    resetScanState();
  });
</script>

<div class="w-full flex flex-col gap-4">
  <label
    id="workspace-upload"
    for="file-picker"
    ondragenter={handleDragEnter}
    ondragleave={handleDragLeave}
    ondragover={handleDragOver}
    ondrop={handleDrop}
    class={classNames(
      'w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed shadow-lg rounded-2xl p-6 text-center transition-all duration-200 group focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent outline-none',
      {
        'cursor-wait opacity-70': isProcessing,
        'cursor-pointer': !isProcessing,
        'border-primary bg-primary/5 scale-[0.98]': isDragging,
        'border-border bg-card-bg hover:border-primary': !isDragging
      }
    )}
  >
    <input
      type="file"
      id="file-picker"
      class="sr-only"
      accept="image/*"
      onchange={handleFileInput}
      disabled={isProcessing}
    />

    {#if isProcessing}
      <div class="relative flex items-center justify-center w-16 h-16 mb-4">
        <div
          class="absolute inset-0 rounded-full border-4 border-app-bg border-t-primary animate-spin"
        ></div>
        <i class="iconify lucide--image size-6 text-text-muted animate-pulse"></i>
      </div>
      <p class="text-sm font-bold text-text-main">Analyzing Image...</p>
      <p class="text-xs text-text-muted mt-1">Scanning for Data Matrix codes</p>
    {:else}
      <div
        class={classNames(
          'flex justify-center p-4 rounded-full border mb-4 transition-transform duration-200',
          {
            'bg-primary/20 border-primary/50 scale-110': isDragging,
            'bg-app-bg border-border group-hover:scale-105': !isDragging
          }
        )}
      >
        <i
          class={classNames('iconify size-8 transition-colors', {
            'lucide--clipboard-paste text-primary animate-bounce': isDragging,
            'lucide--image text-text-muted group-hover:text-primary': !isDragging
          })}
        ></i>
      </div>
      <p
        class={classNames('text-sm font-bold', {
          'text-primary': isDragging,
          'text-text-main': !isDragging
        })}
      >
        {isDragging ? 'Release to Scan' : 'Drop, Paste, or Click to Upload'}
      </p>
      <p class="text-xs text-text-muted mt-1">Supports PNG, JPG, or Cmd+V clipboard buffers</p>
    {/if}
  </label>

  {#if dev && debugImageStages.length > 0}
    <div
      class="bg-card-bg border border-border rounded-2xl overflow-hidden shadow-md transition-all"
    >
      <button
        type="button"
        onclick={() => (isDiagnosticsExpanded = !isDiagnosticsExpanded)}
        aria-expanded={isDiagnosticsExpanded}
        class="w-full px-4 py-3 bg-app-bg/50 flex items-center justify-between border-b border-border text-xs font-black text-text-main cursor-pointer outline-none select-none hover:bg-app-bg transition-colors"
      >
        <div class="flex items-center gap-2">
          <i class="iconify lucide--sliders size-4 text-primary"></i>
          <span>PIPELINE DIAGNOSTICS VIEW</span>
        </div>
        <i
          class={classNames(
            'iconify lucide--chevron-down size-4 transition-transform duration-200',
            {
              'rotate-180': isDiagnosticsExpanded
            }
          )}
        ></i>
      </button>

      {#if isDiagnosticsExpanded}
        <div
          class="p-3 flex flex-col gap-3 max-h-85 overflow-y-auto bg-card-bg animate-in fade-in duration-200"
        >
          <p class="text-[11px] text-text-muted leading-relaxed">
            Reviewing step-by-step filter modifications. The Morphological Close stage bridges line
            gaps on code models like batch series <span class="font-mono text-text-main font-bold"
              >444R5</span
            >.
          </p>

          <div class="grid grid-cols-2 gap-2">
            {#each debugImageStages as stage (stage.name)}
              <div
                class={classNames(
                  'p-2 border rounded-xl bg-app-bg/30 flex flex-col gap-1.5 relative',
                  {
                    'border-success-border/60': stage.success,
                    'border-border': !stage.success
                  }
                )}
              >
                <div class="flex items-center justify-between gap-1">
                  <span class="font-mono text-[10px] font-black truncate text-text-main uppercase"
                    >{stage.name}</span
                  >
                  <span
                    class={classNames('text-[9px] font-mono font-bold px-1.5 py-0.5 rounded', {
                      'bg-success-bg text-success-text': stage.success,
                      'bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400':
                        !stage.success
                    })}
                  >
                    {stage.success ? 'PASSED' : 'FAILED'}
                  </span>
                </div>

                <div
                  class="w-full aspect-square bg-black rounded-lg overflow-hidden border border-border relative flex items-center justify-center"
                >
                  <img src={stage.preview} alt={stage.name} class="w-full h-full object-contain" />
                </div>

                {#if stage.success}
                  <p
                    class="text-[9px] font-mono bg-success-bg text-success-text px-1 py-0.5 rounded break-all truncate font-bold text-center"
                  >
                    Value: {stage.decodedValue}
                  </p>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
