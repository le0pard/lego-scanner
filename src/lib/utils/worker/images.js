// src/lib/utils/worker/images.js

const DOWNSCALE_MAX_SIZE = 700;

// Persistent execution pool mapping filter steps to recycled OffscreenCanvases
const canvasPool = {};

/**
 * High-Performance Context Allocation Recycler
 * Resolves context handles from a static module cache with active safe state resets.
 * @param {string} key - Unique identifier tracking the specific pipeline texture phase
 * @param {number} width - Targeted execution context matrix width
 * @param {number} height - Targeted execution context matrix height
 * @returns {{canvas: OffscreenCanvas, ctx: OffscreenCanvasRenderingContext2D}}
 */
const getPooledCanvas = (key, width, height) => {
  if (!canvasPool[key]) {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    canvasPool[key] = { canvas, ctx };
  } else {
    const entry = canvasPool[key];

    // Dynamic resizing natively resets canvas backings and clears pixel arrays
    if (entry.canvas.width !== width || entry.canvas.height !== height) {
      entry.canvas.width = width;
      entry.canvas.height = height;
    } else {
      // Clears pixel data and forces context variables
      // back to standard defaults to protect against mid-pipeline crashes.
      entry.ctx.reset();
    }
  }
  return canvasPool[key];
};

/**
 * Mathematically Symmetric Morphological Vertical Closing Filter (Full Frame)
 * Employs a recycled canvas pool buffer to heal line dropouts with zero memory allocation overhead.
 */
export const imageScratchRepairFullProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(DOWNSCALE_MAX_SIZE / width, DOWNSCALE_MAX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const { canvas, ctx } = getPooledCanvas('scratch_base', canvasWidth, canvasHeight);

  // Defensively reset context properties to prevent cumulative filter mutations
  ctx.filter = 'grayscale(100%) contrast(170%) brightness(95%)';
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  const grayscaleSnapshot = await createImageBitmap(canvas);

  // Balanced 2px Dilation Pass (GPU Darken Blend Mode)
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'darken';
  const closingOffsets = [-2, -1, 1, 2];
  for (const offset of closingOffsets) {
    ctx.drawImage(grayscaleSnapshot, 0, offset);
  }

  const dilatedSnapshot = await createImageBitmap(canvas);

  // Perfect Mirror 2px Erosion Pass (GPU Lighten Blend Mode)
  ctx.globalCompositeOperation = 'lighten';
  for (const offset of closingOffsets) {
    ctx.drawImage(dilatedSnapshot, 0, offset);
  }

  grayscaleSnapshot.close();
  dilatedSnapshot.close();

  const finalPool = getPooledCanvas('scratch_final', canvasWidth, canvasHeight);
  finalPool.ctx.filter = 'contrast(250%)';
  finalPool.ctx.globalCompositeOperation = 'source-over';
  finalPool.ctx.drawImage(canvas, 0, 0);

  return await createImageBitmap(finalPool.canvas);
};

/**
 * Enhanced Digital Zoom + Symmetric Morphological Healer
 * Magnifies the center 55% of the frame and applies a symmetrical closing tier using pooled memory space.
 */
export const imageMacroCropScratchRepairProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;

  const cropWidth = Math.floor(width * 0.55);
  const cropHeight = Math.floor(height * 0.55);
  const cropX = Math.floor((width - cropWidth) / 2);
  const cropY = Math.floor((height - cropHeight) / 2);

  const ratio = Math.min(DOWNSCALE_MAX_SIZE / cropWidth, DOWNSCALE_MAX_SIZE / cropHeight);
  const canvasWidth = Math.round(cropWidth * ratio);
  const canvasHeight = Math.round(cropHeight * ratio);

  const { canvas, ctx } = getPooledCanvas('macro_base', canvasWidth, canvasHeight);

  ctx.filter = 'grayscale(100%) contrast(170%) brightness(95%)';
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(baseBmp, cropX, cropY, cropWidth, cropHeight, 0, 0, canvasWidth, canvasHeight);

  const grayscaleSnapshot = await createImageBitmap(canvas);

  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'darken';
  const closingOffsets = [-2, -1, 1, 2];
  for (const offset of closingOffsets) {
    ctx.drawImage(grayscaleSnapshot, 0, offset);
  }

  const dilatedSnapshot = await createImageBitmap(canvas);

  ctx.globalCompositeOperation = 'lighten';
  for (const offset of closingOffsets) {
    ctx.drawImage(dilatedSnapshot, 0, offset);
  }

  grayscaleSnapshot.close();
  dilatedSnapshot.close();

  const finalPool = getPooledCanvas('macro_final', canvasWidth, canvasHeight);
  finalPool.ctx.filter = 'contrast(250%)';
  finalPool.ctx.globalCompositeOperation = 'source-over';
  finalPool.ctx.drawImage(canvas, 0, 0);

  return await createImageBitmap(finalPool.canvas);
};

/**
 * Flat-Field Illumination Normalization Filter
 * Uses an completely isolated multi-canvas low-frequency subtraction pass via the cache pool.
 */
export const imageIlluminationFlattenProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(DOWNSCALE_MAX_SIZE / width, DOWNSCALE_MAX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const sharpPool = getPooledCanvas('flatten_sharp', canvasWidth, canvasHeight);
  sharpPool.ctx.filter = 'grayscale(100%) contrast(120%)';
  sharpPool.ctx.globalCompositeOperation = 'source-over';
  sharpPool.ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  const blurPool = getPooledCanvas('flatten_blur', canvasWidth, canvasHeight);
  blurPool.ctx.filter = 'grayscale(100%) blur(12px)';
  blurPool.ctx.globalCompositeOperation = 'source-over';
  blurPool.ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  const diffPool = getPooledCanvas('flatten_diff', canvasWidth, canvasHeight);
  diffPool.ctx.filter = 'none';
  diffPool.ctx.globalCompositeOperation = 'source-over';
  diffPool.ctx.drawImage(sharpPool.canvas, 0, 0);
  diffPool.ctx.globalCompositeOperation = 'difference';
  diffPool.ctx.drawImage(blurPool.canvas, 0, 0);

  const finalPool = getPooledCanvas('flatten_final', canvasWidth, canvasHeight);
  finalPool.ctx.globalCompositeOperation = 'source-over';
  finalPool.ctx.fillStyle = '#ffffff';
  finalPool.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  finalPool.ctx.globalCompositeOperation = 'difference';
  finalPool.ctx.filter = 'contrast(250%) brightness(95%)';
  finalPool.ctx.drawImage(diffPool.canvas, 0, 0);

  return await createImageBitmap(finalPool.canvas);
};

export const imageUnsharpMaskSharpenProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(DOWNSCALE_MAX_SIZE / width, DOWNSCALE_MAX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const { canvas, ctx } = getPooledCanvas('sharpen_base', canvasWidth, canvasHeight);

  ctx.filter = 'grayscale(100%) contrast(150%)';
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  const sharpSnapshot = await createImageBitmap(canvas);

  ctx.globalCompositeOperation = 'overlay';
  ctx.filter = 'blur(1.5px) invert(100%) brightness(90%)';
  ctx.drawImage(sharpSnapshot, 0, 0);

  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  sharpSnapshot.close();

  return await createImageBitmap(canvas);
};

export const imageAdaptiveThresholdProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(DOWNSCALE_MAX_SIZE / width, DOWNSCALE_MAX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const { canvas, ctx } = getPooledCanvas('threshold_base', canvasWidth, canvasHeight);

  ctx.filter = 'grayscale(100%) blur(0.6px) contrast(250%) brightness(90%)';
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  return await createImageBitmap(canvas);
};

export const imageDownscaleProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(600 / width, 600 / height);
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);

  const { canvas, ctx } = getPooledCanvas('downscale_base', targetWidth, targetHeight);

  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(baseBmp, 0, 0, targetWidth, targetHeight);

  return await createImageBitmap(canvas);
};

export const imageHighContrastProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(DOWNSCALE_MAX_SIZE / width, DOWNSCALE_MAX_SIZE / height);
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);

  const { canvas, ctx } = getPooledCanvas('contrast_base', targetWidth, targetHeight);

  ctx.filter = 'grayscale(100%) contrast(300%)';
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, targetWidth, targetHeight);

  return await createImageBitmap(canvas);
};

export const imageProcessingPipeline = [
  imageDownscaleProcessing,
  imageScratchRepairFullProcessing,
  imageMacroCropScratchRepairProcessing,
  imageIlluminationFlattenProcessing,
  imageUnsharpMaskSharpenProcessing,
  imageAdaptiveThresholdProcessing,
  imageHighContrastProcessing
];
