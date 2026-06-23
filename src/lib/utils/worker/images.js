// src/lib/utils/worker/images.js

const DOWNSCALE_MAX_SIZE = 700;

/**
 * Advanced Morphological Vertical Closing Filter
 * Specifically tuned to heal thick factory print-head line dropouts (up to 6px wide).
 * Uses a deep hardware-accelerated composite chain to bridge gaps without module blooming.
 */
export const imageScratchRepairFullProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;

  // Downscale slightly to optimize worker processing speeds
  const ratio = Math.min(DOWNSCALE_MAX_SIZE / width, DOWNSCALE_MAX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not allocate execution canvas context');

  // Boost initial contrast to isolate dark ink modules from cardstock
  ctx.filter = 'grayscale(100%) contrast(180%) brightness(95%)';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  // Cache a clean snapshot blueprint of our high-contrast foundation
  const contrastSnapshot = await createImageBitmap(canvas);

  // DILATION PHASE (Darken)
  // Shift image vertically up to 5px. Dark pixels bleed into the thick white scratch line.
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'darken';

  const dilationOffsets = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
  for (const offset of dilationOffsets) {
    ctx.drawImage(contrastSnapshot, 0, offset);
  }

  // Cache the dilated frame state
  const dilatedSnapshot = await createImageBitmap(canvas);

  // EROSION PHASE (Lighten)
  // Shift back slightly using 'lighten' to restore original vertical module spaces
  ctx.globalCompositeOperation = 'lighten';

  const erosionOffsets = [-2, -1, 1, 2];
  for (const offset of erosionOffsets) {
    ctx.drawImage(dilatedSnapshot, 0, offset);
  }

  // Clean up all texture handles from RAM instantly to avoid garbage collection stutters
  contrastSnapshot.close();
  dilatedSnapshot.close();

  // Final hardening pass to sharpen newly repaired block edges
  const finalCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('Could not allocate final context');

  finalCtx.filter = 'contrast(300%)';
  finalCtx.drawImage(canvas, 0, 0);

  return await createImageBitmap(finalCanvas);
};

/**
 * Adaptive local sharpening threshold filter (Fuses micro hairline splits)
 */
export const imageAdaptiveThresholdProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(DOWNSCALE_MAX_SIZE / width, DOWNSCALE_MAX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not allocate threshold canvas');

  ctx.filter = 'grayscale(100%) blur(0.6px) contrast(250%) brightness(90%)';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  return await createImageBitmap(canvas);
};

/**
 * Standard downscale pass for clear, undamaged boxes
 */
export const imageDownscaleProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(600 / width, 600 / height);
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get normal canvas context');

  ctx.drawImage(baseBmp, 0, 0, targetWidth, targetHeight);
  return await createImageBitmap(canvas);
};

/**
 * High-performance full-frame contrast maximizer
 */
export const imageHighContrastProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(DOWNSCALE_MAX_SIZE / width, DOWNSCALE_MAX_SIZE / height);
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get contrast canvas context');

  ctx.filter = 'grayscale(100%) contrast(300%)';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, targetWidth, targetHeight);

  return await createImageBitmap(canvas);
};

/**
 * Soft smudge blur filter designed to unify dot-matrix style patterns
 */
export const imageDotSmudgeProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(550 / width, 550 / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get smudge context');

  ctx.filter = 'grayscale(100%) blur(1.2px) contrast(200%)';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  return await createImageBitmap(canvas);
};

/**
 * Safe macro-crop targeting a wide 65% center frame to keep border lines safe
 */
export const imageMacroCropProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;

  const cropWidth = Math.floor(width * 0.65);
  const cropHeight = Math.floor(height * 0.65);
  const cropX = Math.floor((width - cropWidth) / 2);
  const cropY = Math.floor((height - cropHeight) / 2);

  const ratio = Math.min(600 / cropWidth, 600 / cropHeight);
  const targetWidth = Math.round(cropWidth * ratio);
  const targetHeight = Math.round(cropHeight * ratio);

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get crop canvas context');

  ctx.drawImage(baseBmp, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
  return await createImageBitmap(canvas);
};

const imageRawProcessing = async (baseBmp) => {
  return baseBmp;
};

/**
 * Processing priority hierarchy.
 * The expanded morphological close filter sits near the top to catch and repair
 * broken factory codes immediately before falling back to alternative scales.
 */
export const imageProcessingPipeline = [
  imageDownscaleProcessing,
  imageScratchRepairFullProcessing, // Handles thick printer lines dropouts
  imageAdaptiveThresholdProcessing, // Handles fine-line scratches
  imageMacroCropProcessing, // Wide crop preserving outer orientation tracks
  imageDotSmudgeProcessing,
  imageHighContrastProcessing,
  imageRawProcessing
];
