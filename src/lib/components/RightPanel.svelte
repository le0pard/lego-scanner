<script>
  import { scanResultState } from '$lib/states/scanResult.svelte';
  import { useTiks } from '@rexa-developer/tiks/svelte';
  import { extractFieldsFromDataMatrix } from '$lib/utils/lego_data.js';
  import { db } from '$lib/utils/db';
  import ScanResult from './ScanResult.svelte';
  import InfoPanel from './InfoPanel.svelte';
  import ScanError from './ScanError.svelte';

  const { success: successTick, error: errorTick } = useTiks({ theme: 'crisp', volume: 1.0 });

  let minifig = $state(null);
  let searchCompleted = $state(false);

  $effect(async () => {
    if (scanResultState.result) {
      const legoData = extractFieldsFromDataMatrix(scanResultState.result);
      if (!legoData || !legoData.key) {
        minifig = null;
        errorTick();
        searchCompleted = true;
        return;
      }

      try {
        const [fullSearchRes, codeSearchRes] = await Promise.all([
          db.minifigures.where({ searchKeys: legoData.key }).first(),
          db.minifigures.where({ searchKeys: legoData.code }).first()
        ]);

        const found = fullSearchRes || codeSearchRes;
        if (found) {
          minifig = found;
          successTick();
        } else {
          minifig = null;
          errorTick();
        }
      } catch (err) {
        console.error('Database query failed:', err);
        minifig = null;
        errorTick();
      } finally {
        searchCompleted = true;
      }
    } else if (scanResultState.errorMessage && scanResultState.errorMessage.length > 0) {
      searchCompleted = false;
      minifig = null;
      errorTick();
    } else {
      searchCompleted = false;
      minifig = null;
    }
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
