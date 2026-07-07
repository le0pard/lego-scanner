import { expose } from 'comlink';
import { readBarcodes, prepareZXingModule, ZXING_WASM_VERSION } from 'zxing-wasm/reader';
import {
  imageProcessingPipeline,
  imageScratchRepairFullProcessing,
  imageMacroCropScratchRepairProcessing
} from '$lib/utils/worker/images_processing';

const BINARIZER_TIERS = ['LocalAverage', 'GlobalHistogram'];

let liveFrameSequenceCounter = 0;
let sharedCanvas = null;
let sharedCtx = null;

/**
 * Utility helper converting an active ImageBitmap into standard ImageData
 * with active context re-binding safeguards.
 */
const convertBitmapToImageData = (bitmap) => {
  if (!sharedCanvas) {
    sharedCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    sharedCtx = sharedCanvas.getContext('2d', { willReadFrequently: true });
  }
  // If dimensions change, resize AND re-acquire the context handle
  else if (sharedCanvas.width !== bitmap.width || sharedCanvas.height !== bitmap.height) {
    sharedCanvas.width = bitmap.width;
    sharedCanvas.height = bitmap.height;
    sharedCtx = sharedCanvas.getContext('2d', { willReadFrequently: true });
  }

  if (!sharedCtx) {
    throw new Error('Could not allocate persistent transformation context');
  }

  sharedCtx.drawImage(bitmap, 0, 0);
  return sharedCtx.getImageData(0, 0, bitmap.width, bitmap.height);
};

const api = {
  async init(basePath = '/') {
    const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

    await prepareZXingModule({
      overrides: {
        locateFile: (path, prefix) => {
          if (path.endsWith('.wasm')) {
            return `${cleanBase}/wasm/zxing/${ZXING_WASM_VERSION}/${path}`;
          }
          return `${prefix}${path}`;
        }
      },
      fireImmediately: true
    });
  },

  /**
   * Balanced real-time video stream processor
   */
  async detect(imageBitmap) {
    let processedFrameBitmap = imageBitmap;
    let separateTextureGenerated = false;

    try {
      liveFrameSequenceCounter = (liveFrameSequenceCounter + 1) % 4;
      const framePhase = liveFrameSequenceCounter;
      const isRepairPass = framePhase === 1 || framePhase === 3;

      if (framePhase === 1) {
        try {
          processedFrameBitmap = await imageScratchRepairFullProcessing(imageBitmap);
          separateTextureGenerated = true;
        } catch {
          processedFrameBitmap = imageBitmap;
        }
      } else if (framePhase === 3) {
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
        tryHarder: isRepairPass,
        tryDenoise: isRepairPass,
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
      if (separateTextureGenerated && processedFrameBitmap) {
        processedFrameBitmap.close();
      }
      imageBitmap.close();
    }
  },

  /**
   * Deep file analysis featuring safe conditional loop breaks
   * and clean multi-stage memory deallocation cascades.
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
              tryDenoise: true,
              tryRotate: true,
              maxNumberOfSymbols: 1,
              binarizer
            });

            if (results && results.length > 0) {
              result = results[0].text;
              break; // Break binarizer loop safely
            }
          }
        } catch (err) {
          console.warn(`Pipeline stage failed: ${processingMethod.name}`, err);
        } finally {
          // Explicitly release resources at the conclusion of every step loop
          if (currentBmp && currentBmp !== baseBmp) {
            currentBmp.close();
          }
        }

        // If a result was found, exit the pipeline sequence early without leaking
        if (result !== null) {
          return result;
        }
      }
    } finally {
      baseBmp.close(); // Clean up core image handle
    }

    return result;
  },

  /**
   * Interactive Vision Diagnostics Engine
   */
  async runDiagnosticSuite(file) {
    const baseBmp = await createImageBitmap(file);
    const diagnosticReport = [];

    try {
      for (const processingMethod of imageProcessingPipeline) {
        let currentBmp = null;
        try {
          currentBmp = await processingMethod(baseBmp);

          const debugCanvas = new OffscreenCanvas(currentBmp.width, currentBmp.height);
          const debugCtx = debugCanvas.getContext('2d');
          debugCtx.drawImage(currentBmp, 0, 0);

          const blob = await debugCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
          const imageData = debugCtx.getImageData(0, 0, currentBmp.width, currentBmp.height);

          let testScan = [];
          for (const binarizer of BINARIZER_TIERS) {
            testScan = await readBarcodes(imageData, {
              formats: ['DataMatrix'],
              tryHarder: true,
              tryDenoise: true,
              tryRotate: true,
              maxNumberOfSymbols: 1,
              binarizer
            });
            if (testScan.length > 0) break;
          }

          diagnosticReport.push({
            name: processingMethod.name.replace('image', '').replace('Processing', ''),
            preview: blob,
            success: testScan.length > 0,
            decodedValue: testScan.length > 0 ? testScan[0].text : null
          });
        } catch (err) {
          console.warn(`Diagnostic pass error under ${processingMethod.name}:`, err);
        } finally {
          if (currentBmp && currentBmp !== baseBmp) {
            currentBmp.close();
          }
        }
      }
    } finally {
      baseBmp.close();
    }

    return diagnosticReport;
  }
};

expose(api);
