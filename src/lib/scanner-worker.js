import { expose } from 'comlink';
import { readBarcodes, prepareZXingModule, ZXING_WASM_VERSION } from 'zxing-wasm/reader';
import {
  imageProcessingPipeline,
  imageScratchRepairFullProcessing
} from '$lib/utils/worker/images';

const BINARIZER_TIERS = ['LocalAverage', 'GlobalHistogram'];

// Global stream sequence tracker for interleaving execution modes
let liveFrameSequenceCounter = 0;

/**
 * Utility helper converting an active ImageBitmap into standard ImageData
 * to conform perfectly with zxing-wasm's required memory allocation types.
 * @param {ImageBitmap} bitmap
 * @returns {ImageData}
 */
const convertBitmapToImageData = (bitmap) => {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not allocate temporary transformation context');

  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
};

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
  },

  /**
   * Process a single transferred ImageBitmap frame
   * @param {ImageBitmap} imageBitmap
   */
  async detect(imageBitmap) {
    let processedFrameBitmap = imageBitmap;
    let separateTextureGenerated = false;

    try {
      liveFrameSequenceCounter++;

      // Interleave modes: Odd frames trigger the morphological line repair pass
      if (liveFrameSequenceCounter % 2 === 1) {
        try {
          processedFrameBitmap = await imageScratchRepairFullProcessing(imageBitmap);
          separateTextureGenerated = true;
        } catch (filterError) {
          // Fall back to the raw image frame if the GPU context is busy
          processedFrameBitmap = imageBitmap;
          separateTextureGenerated = false;
        }
      }

      // Safe input structure conversion for zxing-wasm
      const targetImageData = convertBitmapToImageData(processedFrameBitmap);

      const results = await readBarcodes(targetImageData, {
        formats: ['DataMatrix'],
        tryHarder: liveFrameSequenceCounter % 2 === 1, // Devote more CPU cycles only on repair frames
        tryRotate: true,
        maxNumberOfSymbols: 1,
        binarizer: 'LocalAverage'
      });

      if (results && results.length > 0) {
        return results[0].text;
      }
      return null;
    } catch (err) {
      console.error('Live camera scan error:', err);
      return null;
    } finally {
      // Prevent web worker memory leaks by clearing generated resources
      if (separateTextureGenerated && processedFrameBitmap) {
        processedFrameBitmap.close();
      }
      imageBitmap.close();
    }
  },

  /**
   * Deep file analysis combining your custom canvas morphological pipeline
   * with variable engine binarization profiles for extreme resilience.
   * @param {File} file
   */
  async detectFromFile(file) {
    const baseBmp = await createImageBitmap(file);
    let result = null;

    try {
      for (const processingMethod of imageProcessingPipeline) {
        let currentBmp = null;

        try {
          currentBmp = await processingMethod(baseBmp);

          const imageData = convertBitmapToImageData(currentBmp);
          for (const binarizer of BINARIZER_TIERS) {
            const results = await readBarcodes(imageData, {
              formats: ['DataMatrix'],
              tryHarder: true,
              tryRotate: true,
              maxNumberOfSymbols: 1,
              binarizer
            });

            if (results && results.length > 0) {
              result = results[0].text;
              return result;
            }
          }
        } catch (err) {
          // Fall back gracefully to the next filter pipeline stage
        } finally {
          if (currentBmp && currentBmp !== baseBmp) {
            currentBmp.close();
          }
        }
      }
    } finally {
      baseBmp.close();
    }

    return result;
  },

  /**
   * Interactive Vision Diagnostics Engine
   * Keeps your layout debugging tray operational with advanced settings active.
   */
  async runDiagnosticSuite(file) {
    const baseBmp = await createImageBitmap(file);
    const diagnosticReport = [];

    for (const processingMethod of imageProcessingPipeline) {
      let currentBmp = null;
      try {
        currentBmp = await processingMethod(baseBmp);

        // Snapshot texture context into visual data URLs
        const debugCanvas = new OffscreenCanvas(currentBmp.width, currentBmp.height);
        const debugCtx = debugCanvas.getContext('2d');
        debugCtx.drawImage(currentBmp, 0, 0);

        const blob = await debugCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
        const reader = new FileReaderSync();
        const dataUrl = reader.readAsDataURL(blob);
        const imageData = debugCtx.getImageData(0, 0, currentBmp.width, currentBmp.height);

        let testScan = [];
        for (const binarizer of BINARIZER_TIERS) {
          testScan = await readBarcodes(imageData, {
            formats: ['DataMatrix'],
            tryHarder: true,
            tryRotate: true,
            maxNumberOfSymbols: 1,
            binarizer
          });
          if (testScan.length > 0) break;
        }

        diagnosticReport.push({
          name: processingMethod.name.replace('image', '').replace('Processing', ''),
          preview: dataUrl,
          success: testScan.length > 0,
          decodedValue: testScan.length > 0 ? testScan[0].text : null
        });
      } catch (err) {
        console.warn(`Diagnostic pass error under ${processingMethod.name}:`, err);
      } finally {
        if (currentBmp && currentBmp !== baseBmp) currentBmp.close();
      }
    }

    baseBmp.close();
    return diagnosticReport;
  }
};

expose(api);
