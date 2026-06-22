<script>
  import { onDestroy } from 'svelte';
  import { useTiks } from '@rexa-developer/tiks/svelte';
  import { setScanResult, setScanError, resetScanState } from '$lib/states/scanResult.svelte';

  const { getScanner } = $props();
  const { warning: warningTick } = useTiks({ theme: 'crisp', volume: 1.0 });

  let isProcessing = $state(false);
  let isDragging = $state(false);

  const processFile = async (file) => {
    isProcessing = true;
    resetScanState();
    try {
      const result = await getScanner().detectFromFile(file);
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

  onDestroy(() => {
    resetScanState();
  });
</script>

<label
  id="workspace-upload"
  for="file-picker"
  ondragenter={handleDragEnter}
  ondragleave={handleDragLeave}
  ondragover={handleDragOver}
  ondrop={handleDrop}
  class="w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed shadow-lg rounded-2xl p-6 text-center transition-all duration-200 group focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent
    {isProcessing ? 'cursor-wait opacity-70' : 'cursor-pointer'}
    {isDragging
    ? 'border-primary bg-primary/5 scale-[0.98]'
    : 'border-border bg-card-bg hover:border-primary'}"
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
      class="p-4 rounded-full border mb-4 transition-transform duration-200 {isDragging
        ? 'bg-primary/20 border-primary/50 scale-110'
        : 'bg-app-bg border-border group-hover:scale-105'}"
    >
      <svg
        class="w-8 h-8 transition-colors {isDragging
          ? 'text-primary'
          : 'text-text-muted group-hover:text-primary'}"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H4a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
    <p class="text-sm font-bold {isDragging ? 'text-primary' : 'text-text-main'}">
      {isDragging ? 'Release to Scan' : 'Drop Lego image here'}
    </p>
    <p class="text-xs text-text-muted mt-1">Supports PNG, JPG up to 10MB</p>
  {/if}
</label>
