<script>
  import { onMount, onDestroy } from 'svelte';
  import classNames from 'classnames';
  import { dev, browser } from '$app/environment';
  import { useTiks } from '@rexa-developer/tiks/svelte';
  import { setScanResult, setScanError, resetScanState } from '$lib/states/scanResult.svelte.js';

  const { getScanner } = $props();
  const { warning: warningTick } = useTiks({ theme: 'crisp', volume: 1.0 });

  let isProcessing = $state(false);
  let isDragging = $state(false);
  let isDiagnosticsExpanded = $state(false);
  let debugImageStages = $state([]);

  const clearDebugUrls = () => {
    debugImageStages.forEach((stage) => {
      if (stage.preview) {
        URL.revokeObjectURL(stage.preview);
      }
    });
    debugImageStages = [];
  };

  const processFile = async (file) => {
    isProcessing = true;
    clearDebugUrls();
    resetScanState();

    try {
      const result = await getScanner().detectFromFile(file);

      // usage for debug
      if (dev) {
        const rawStages = await getScanner().runDiagnosticSuite(file);
        debugImageStages = rawStages.map((stage) => ({
          ...stage,
          preview: URL.createObjectURL(stage.preview)
        }));
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
    clearDebugUrls();
    resetScanState();
  });
</script>

<div class="flex w-full flex-col gap-4">
  <label
    id="workspace-upload"
    for="file-picker"
    ondragenter={handleDragEnter}
    ondragleave={handleDragLeave}
    ondragover={handleDragOver}
    ondrop={handleDrop}
    class={classNames(
      'group flex aspect-square w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center shadow-lg transition-all duration-200 outline-none focus-within:border-transparent focus-within:ring-2 focus-within:ring-primary',
      {
        'cursor-wait opacity-70': isProcessing,
        'cursor-pointer': !isProcessing,
        'scale-[0.98] border-primary bg-primary/5': isDragging,
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
      <div class="relative mb-4 flex h-16 w-16 items-center justify-center">
        <div
          class="absolute inset-0 animate-spin rounded-full border-4 border-app-bg border-t-primary"
        ></div>
        <i class="iconify size-6 animate-pulse text-text-muted lucide--image"></i>
      </div>
      <p class="text-base font-bold text-text-main">Analyzing Image...</p>
      <p class="mt-1 text-sm text-text-muted">Scanning for Data Matrix codes</p>
    {:else}
      <div
        class={classNames(
          'mb-4 flex justify-center rounded-full border p-4 transition-transform duration-200',
          {
            'scale-110 border-primary/50 bg-primary/20': isDragging,
            'border-border bg-app-bg group-hover:scale-105': !isDragging
          }
        )}
      >
        <i
          class={classNames('iconify size-8 transition-colors', {
            'animate-bounce text-primary lucide--clipboard-paste': isDragging,
            'text-text-muted lucide--image group-hover:text-primary': !isDragging
          })}
        ></i>
      </div>
      <p
        class={classNames('text-base font-bold', {
          'text-primary': isDragging,
          'text-text-main': !isDragging
        })}
      >
        {isDragging ? 'Release to Scan' : 'Drop, Paste, or Click to Upload'}
      </p>
      <p class="mt-1 text-sm text-text-muted">Supports PNG, JPG, or Cmd+V clipboard buffers</p>
    {/if}
  </label>

  {#if dev && debugImageStages.length > 0}
    <div
      class="overflow-hidden rounded-2xl border border-border bg-card-bg shadow-md transition-all"
    >
      <button
        type="button"
        onclick={() => (isDiagnosticsExpanded = !isDiagnosticsExpanded)}
        aria-expanded={isDiagnosticsExpanded}
        class="flex w-full cursor-pointer items-center justify-between border-b border-border bg-app-bg/50 px-4 py-3 text-xs font-black text-text-main transition-colors outline-none select-none hover:bg-app-bg"
      >
        <div class="flex items-center gap-2">
          <i class="iconify size-4 text-primary lucide--sliders"></i>
          <span>PIPELINE DIAGNOSTICS VIEW</span>
        </div>
        <i
          class={classNames(
            'iconify size-4 transition-transform duration-200 lucide--chevron-down',
            {
              'rotate-180': isDiagnosticsExpanded
            }
          )}
        ></i>
      </button>

      {#if isDiagnosticsExpanded}
        <div
          class="animate-in fade-in flex max-h-85 flex-col gap-3 overflow-y-auto bg-card-bg p-3 duration-200"
        >
          <p class="text-xs leading-relaxed text-text-muted">
            Reviewing step-by-step filter modifications. The Morphological Close stage bridges line
            gaps on code models like batch series <span class="font-mono font-bold text-text-main"
              >444R5</span
            >.
          </p>

          <div class="grid grid-cols-2 gap-2">
            {#each debugImageStages as stage (stage.name)}
              <div
                class={classNames(
                  'relative flex flex-col gap-1.5 rounded-xl border bg-app-bg/30 p-2',
                  {
                    'border-success-border/60': stage.success,
                    'border-border': !stage.success
                  }
                )}
              >
                <div class="flex items-center justify-between gap-1">
                  <span class="truncate font-mono text-xs font-black text-text-main uppercase"
                    >{stage.name}</span
                  >
                  <span
                    class={classNames('rounded px-1.5 py-0.5 font-mono text-xs font-bold', {
                      'bg-success-bg text-success-text': stage.success,
                      'bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400':
                        !stage.success
                    })}
                  >
                    {stage.success ? 'PASSED' : 'FAILED'}
                  </span>
                </div>

                <div
                  class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-black"
                >
                  <img src={stage.preview} alt={stage.name} class="h-full w-full object-contain" />
                </div>

                {#if stage.success}
                  <p
                    class="truncate rounded bg-success-bg px-1 py-0.5 text-center font-mono text-xs font-bold break-all text-success-text"
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
