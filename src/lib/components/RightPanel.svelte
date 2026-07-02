<script>
  import { scanResultState } from '$lib/states/scanResult.svelte.js';
  import { useTiks } from '@rexa-developer/tiks/svelte';
  import { extractFieldsFromDataMatrix } from '$lib/utils/lego_data.js';
  import { db } from '$lib/utils/db';
  import ScanResult from './ScanResult.svelte';
  import InfoPanel from './InfoPanel.svelte';
  import ScanError from './ScanError.svelte';

  const { success: successTick, error: errorTick } = useTiks({ theme: 'crisp', volume: 1.0 });

  let minifig = $state(null);
  let searchCompleted = $state(false);

  $effect(() => {
    // Stale guard indicator tracks if this specific execution cycle is still valid
    let isCurrent = true;

    const performDatabaseLookup = async () => {
      if (scanResultState.result) {
        let legoData = $derived(extractFieldsFromDataMatrix(scanResultState.result));

        if (!legoData || !legoData.key) {
          if (!isCurrent) return; // Discard state mutations if a newer scan has already started
          minifig = null;
          errorTick();
          searchCompleted = true;
          return;
        }

        try {
          const found = await db.minifigures
            .where('searchKeys')
            .anyOf(legoData.key, legoData.code)
            .first();

          // Verify that the parent scan context hasn't changed while we were awaiting IndexedDB
          if (!isCurrent) return;

          if (found) {
            minifig = found;
            successTick();
          } else {
            minifig = null;
            errorTick();
          }
        } catch (err) {
          console.error('Database query failed:', err);
          if (!isCurrent) return;

          minifig = null;
          errorTick();
        } finally {
          if (isCurrent) {
            searchCompleted = true;
          }
        }
      } else if (scanResultState.errorMessage && scanResultState.errorMessage.length > 0) {
        if (!isCurrent) return;

        searchCompleted = false;
        minifig = null;
        errorTick();
      } else {
        if (!isCurrent) return;

        searchCompleted = false;
        minifig = null;
      }
    };

    // Safely fire the un-awaited microtask line
    performDatabaseLookup();

    // Instantly invalidates this lookup run when a new token arrives
    return () => {
      isCurrent = false;
    };
  });
</script>

<article
  class="mt-4 mb-0 landscape:mt-0 landscape:w-1/2 flex-1 min-h-70 landscape:min-h-0 landscape:h-fit flex flex-col justify-start"
>
  {#if scanResultState.errorMessage && scanResultState.errorMessage.length > 0}
    <ScanError errorMessage={scanResultState.errorMessage} />
  {:else if scanResultState.result}
    <ScanResult {minifig} {searchCompleted} />
  {:else}
    <InfoPanel />
  {/if}
</article>
