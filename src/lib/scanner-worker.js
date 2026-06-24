import { expose } from 'comlink';
import { readBarcodes, prepareZXingModule, ZXING_WASM_VERSION } from 'zxing-wasm/reader';
import {
  imageProcessingPipeline,
  imageScratchRepairFullProcessing,
  imageMacroCropScratchRepairProcessing
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
   * Balanced real-time video stream processor with a 4-phase frame cycle.
   * Phase 0 & 2: Lightning fast raw frame paths.
   * Phase 1: Full-frame morphological closing pass.
   * Phase 3: Zoomed macro-crop morphological closing pass.
   * @param {ImageBitmap} imageBitmap
   */
  async detect(imageBitmap) {
    let processedFrameBitmap = imageBitmap;
    let separateTextureGenerated = false;

    try {
      // Bounds the value between 0 and 3 immediately so it never grows infinitely
      liveFrameSequenceCounter = (liveFrameSequenceCounter + 1) % 4;
      const framePhase = liveFrameSequenceCounter;

      if (framePhase === 1) {
        // Run full-frame line repair on close up boxes
        try {
          processedFrameBitmap = await imageScratchRepairFullProcessing(imageBitmap);
          separateTextureGenerated = true;
        } catch {
          processedFrameBitmap = imageBitmap;
        }
      } else if (framePhase === 3) {
        // Run zoomed macro center repair on distant boxes
        try {
          processedFrameBitmap = await imageMacroCropScratchRepairProcessing(imageBitmap);
          separateTextureGenerated = true;
        } catch {
          processedFrameBitmap = imageBitmap;
        }
      }

      const targetImageData = convertBitmapToImageData(processedFrameBitmap);

      const results = await readBarcodes(targetImageData, {
        formats: ['DataMatrix'],
        tryHarder: framePhase === 1 || framePhase === 3, // Enable deep engine validation only on repair passes
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
        } catch {
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
