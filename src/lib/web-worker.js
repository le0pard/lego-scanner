import { expose } from 'comlink';
import { BarcodeDetector, ZXING_WASM_VERSION, prepareZXingModule } from 'barcode-detector';
import { imageProcessingPipeline } from '$lib/utils/worker/images'

let detector = null;

const api = {
  /**
   * Initialize the WASM module and detector instance inside the worker
   * @param {string} basePath - Passed dynamically from SvelteKit's main thread
   */
  async init(basePath = '/') {
    const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

    prepareZXingModule({
      overrides: {
        locateFile: (path, prefix) => {
          if (path.endsWith('.wasm')) {
            // Dynamically prepend the deployment base path
            return `${cleanBase}/wasm/zxing/${ZXING_WASM_VERSION}/${path}`;
          }
          return `${prefix}${path}`;
        }
      },
      fireImmediately: true
    });

    const supportedFormats = await BarcodeDetector.getSupportedFormats();
    if (!supportedFormats.includes('data_matrix')) {
      throw new Error('Data Matrix format is not supported on this device/browser.');
    }

    detector = new BarcodeDetector({ formats: ['data_matrix'] });
  },

  /**
   * Process a single transferred ImageBitmap frame
   * @param {ImageBitmap} imageBitmap
   */
  async detect(imageBitmap) {
    if (!detector) {
      throw new Error('Worker scanner not initialized.');
    }

    try {
      const barcodes = await detector.detect(imageBitmap);
      if (barcodes.length > 0) {
        return barcodes[0].rawValue;
      }

      return null;
    } catch (err) {
      console.error('Worker extraction failure:', err);
      return null;
    } finally {
      // Close the bitmap inside the worker to immediately free system memory
      imageBitmap.close();
    }
  },

  /**
   * Process a file
   * @param {File} file
   */
  async detectFromFile(file) {
    if (!detector) {
      throw new Error('Worker scanner not initialized.');
    }

    const baseBmp = await createImageBitmap(file);
    let result = null;

    try {
      // Loop through pipeline sequentially (saves RAM, stops early if found)
      for (const processingMethod of imageProcessingPipeline) {
        let currentBmp = null;

        try {
          currentBmp = await processingMethod(baseBmp);
          const barcodes = await detector.detect(currentBmp);

          if (barcodes.length > 0) {
            result = barcodes[0].rawValue;
            break;
          }
        } catch (err) {
          console.warn('Worker pass failed:', err);
        } finally {
          // Close the intermediate bitmap to prevent GPU memory leaks.
          // (Make sure we don't close the baseBmp by accident if the pass returned it)
          if (currentBmp && currentBmp !== baseBmp) {
            currentBmp.close();
          }
        }
      }
    } finally {
      baseBmp.close();
    }

    return result;
  }
};

expose(api);
