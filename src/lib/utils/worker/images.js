// src/lib/utils/worker/images.js

const DOWNSCALE_MAX_SIZE = 700;

/**
 * Advanced Morphological Vertical Closing Filter (Full Frame)
 * Tuned to heal thick factory print-head line dropouts on close-up boxes.
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
 * Enhanced Digital Zoom + Morphological Closing Filter
 * Emulates a hardware zoom lens by cropping the center 55% of the frame first.
 * Magnifies small, distant barcodes so the stitch loops can repair them cleanly.
 */
export const imageMacroCropScratchRepairProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;

  // Perform a 55% center area crop to execute a pristine digital zoom step
  const cropWidth = Math.floor(width * 0.55);
  const cropHeight = Math.floor(height * 0.55);
  const cropX = Math.floor((width - cropWidth) / 2);
  const cropY = Math.floor((height - cropHeight) / 2);

  const ratio = Math.min(DOWNSCALE_MAX_SIZE / cropWidth, DOWNSCALE_MAX_SIZE / cropHeight);
  const canvasWidth = Math.round(cropWidth * ratio);
  const canvasHeight = Math.round(cropHeight * ratio);

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not allocate zoom canvas context');

  // Draw the tight cropped area while applying grayscale and contrast curves
  ctx.filter = 'grayscale(100%) contrast(180%) brightness(95%)';
  ctx.drawImage(baseBmp, cropX, cropY, cropWidth, cropHeight, 0, 0, canvasWidth, canvasHeight);

  const contrastSnapshot = await createImageBitmap(canvas);

  // DILATION PHASE: Stitch separate elements back together vertically
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'darken';
  const dilationOffsets = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
  for (const offset of dilationOffsets) {
    ctx.drawImage(contrastSnapshot, 0, offset);
  }

  const dilatedSnapshot = await createImageBitmap(canvas);

  // EROSION PHASE: Trim module edges back to original widths
  ctx.globalCompositeOperation = 'lighten';
  const erosionOffsets = [-2, -1, 1, 2];
  for (const offset of erosionOffsets) {
    ctx.drawImage(dilatedSnapshot, 0, offset);
  }

  contrastSnapshot.close();
  dilatedSnapshot.close();

  const finalCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('Could not allocate final zoom context');

  finalCtx.filter = 'contrast(300%)';
  finalCtx.drawImage(canvas, 0, 0);

  return await createImageBitmap(finalCanvas);
};

/**
 * Hardware-Accelerated High-Pass Sharpening Filter
 * Uses a digital unsharp mask curve to restore sharp module borders on out-of-focus captures.
 */
export const imageUnsharpMaskSharpenProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(DOWNSCALE_MAX_SIZE / width, DOWNSCALE_MAX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get sharpen context');

  // Step 1: Draw high-contrast sharp base frame
  ctx.filter = 'grayscale(100%) contrast(150%)';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  const sharpSnapshot = await createImageBitmap(canvas);

  // Step 2: Superimpose inverted blurred overlay to boost edge contrast
  ctx.globalCompositeOperation = 'overlay';
  ctx.filter = 'blur(1.5px) invert(100%) brightness(90%)';
  ctx.drawImage(sharpSnapshot, 0, 0);

  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  sharpSnapshot.close();

  return await createImageBitmap(canvas);
};

/**
 * Rotational Multi-Angle Search Alignment Pass (+45 Degrees)
 * Aligns skewed data grids with the main detection axes to fix perspective errors.
 */
export const imageRotate45Processing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const maxDim = Math.max(width, height);
  const ratio = Math.min(500 / maxDim, 500 / maxDim);
  const targetSize = Math.round(maxDim * ratio);

  const canvas = new OffscreenCanvas(targetSize, targetSize);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not allocate rotational context');

  ctx.filter = 'grayscale(100%) contrast(140%)';
  ctx.translate(targetSize / 2, targetSize / 2);
  ctx.rotate((45 * Math.PI) / 180); // Rotate canvas exactly 45 degrees around center point
  ctx.drawImage(baseBmp, -targetSize / 2, -targetSize / 2, targetSize, targetSize);

  return await createImageBitmap(canvas);
};

/**
 * Rotational Multi-Angle Search Alignment Pass (-30 Degrees)
 */
export const imageRotateMinus30Processing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const maxDim = Math.max(width, height);
  const ratio = Math.min(500 / maxDim, 500 / maxDim);
  const targetSize = Math.round(maxDim * ratio);

  const canvas = new OffscreenCanvas(targetSize, targetSize);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not allocate rotational context');

  ctx.filter = 'grayscale(100%) contrast(140%)';
  ctx.translate(targetSize / 2, targetSize / 2);
  ctx.rotate((-30 * Math.PI) / 180);
  ctx.drawImage(baseBmp, -targetSize / 2, -targetSize / 2, targetSize, targetSize);

  return await createImageBitmap(canvas);
};

/**
 * Adaptive local sharpening threshold filter
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
 * Zoomed morphological closing added immediately following full-frame repair
 * to process distant defective barcodes.
 */
export const imageProcessingPipeline = [
  imageDownscaleProcessing,
  imageScratchRepairFullProcessing,
  imageMacroCropScratchRepairProcessing,
  imageUnsharpMaskSharpenProcessing,
  imageAdaptiveThresholdProcessing,
  imageRotate45Processing,
  imageRotateMinus30Processing,
  imageMacroCropProcessing,
  imageDotSmudgeProcessing,
  imageHighContrastProcessing,
  imageRawProcessing
];
