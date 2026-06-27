const MORPHOLOGICAL_HEALER_CLOSING_OFFSETS = [-4, -3, -2, -1, 1, 2, 3, 4];
const RESIZE_MATRIX_SIZE = 700;
const DOWNSCALE_PROCESSING_SIZE = 600;

// Persistent execution pool mapping filter steps to recycled OffscreenCanvases
const canvasPool = {};

/**
 * High-Performance Context Allocation Recycler
 * Resolves context handles from a static module cache with active safe state resets.
 */
const getPooledCanvas = (key, width, height) => {
  if (!canvasPool[key]) {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    canvasPool[key] = { canvas, ctx };
  } else {
    const entry = canvasPool[key];

    if (entry.canvas.width !== width || entry.canvas.height !== height) {
      entry.canvas.width = width;
      entry.canvas.height = height;
    } else {
      entry.ctx.reset();
    }
  }
  return canvasPool[key];
};

/**
 * Mathematically Symmetric Morphological Vertical Closing Filter (Full Frame)
 * Employs clean state isolation stages to heal dropouts with zero module blurring.
 */
export const imageScratchRepairFullProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(RESIZE_MATRIX_SIZE / width, RESIZE_MATRIX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const basePool = getPooledCanvas('scratch_base', canvasWidth, canvasHeight);

  // Build Pristine Grayscale Source
  basePool.ctx.filter = 'grayscale(100%) contrast(170%) brightness(95%)';
  basePool.ctx.globalCompositeOperation = 'source-over';
  basePool.ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);
  const grayscaleSnapshot = await createImageBitmap(basePool.canvas);

  // Execute Pure Dilation Pass (Darken)
  basePool.ctx.reset();
  basePool.ctx.globalCompositeOperation = 'source-over';
  basePool.ctx.drawImage(grayscaleSnapshot, 0, 0);
  basePool.ctx.globalCompositeOperation = 'darken';
  for (const offset of MORPHOLOGICAL_HEALER_CLOSING_OFFSETS) {
    basePool.ctx.drawImage(grayscaleSnapshot, 0, offset);
  }
  const dilatedSnapshot = await createImageBitmap(basePool.canvas);

  // Execute Pure Erosion Pass (Lighten)
  basePool.ctx.reset();
  basePool.ctx.globalCompositeOperation = 'source-over';
  basePool.ctx.drawImage(dilatedSnapshot, 0, 0);
  basePool.ctx.globalCompositeOperation = 'lighten';
  for (const offset of MORPHOLOGICAL_HEALER_CLOSING_OFFSETS) {
    basePool.ctx.drawImage(dilatedSnapshot, 0, offset);
  }

  grayscaleSnapshot.close();
  dilatedSnapshot.close();

  // Boost Final Edge Profiles
  const finalPool = getPooledCanvas('scratch_final', canvasWidth, canvasHeight);
  finalPool.ctx.filter = 'contrast(250%)';
  finalPool.ctx.drawImage(basePool.canvas, 0, 0);

  return await createImageBitmap(finalPool.canvas);
};

/**
 * Digital Zoom + Isolated Morphological Healer
 * Magnifies the frame center and cross-stitches intermediate print dropouts
 * using an un-compounded horizontal track alignment system.
 */
export const imageMacroCropScratchRepairProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;

  const cropWidth = Math.floor(width * 0.55);
  const cropHeight = Math.floor(height * 0.55);
  const cropX = Math.floor((width - cropWidth) / 2);
  const cropY = Math.floor((height - cropHeight) / 2);

  const ratio = Math.min(RESIZE_MATRIX_SIZE / cropWidth, RESIZE_MATRIX_SIZE / cropHeight);
  const canvasWidth = Math.round(cropWidth * ratio);
  const canvasHeight = Math.round(cropHeight * ratio);

  const basePool = getPooledCanvas('macro_base', canvasWidth, canvasHeight);

  basePool.ctx.filter = 'grayscale(100%) contrast(170%) brightness(95%)';
  basePool.ctx.globalCompositeOperation = 'source-over';
  basePool.ctx.drawImage(
    baseBmp,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    canvasWidth,
    canvasHeight
  );
  const grayscaleSnapshot = await createImageBitmap(basePool.canvas);

  basePool.ctx.reset();
  basePool.ctx.globalCompositeOperation = 'source-over';
  basePool.ctx.drawImage(grayscaleSnapshot, 0, 0);
  basePool.ctx.globalCompositeOperation = 'darken';
  for (const offset of MORPHOLOGICAL_HEALER_CLOSING_OFFSETS) {
    basePool.ctx.drawImage(grayscaleSnapshot, 0, offset);
  }
  const dilatedSnapshot = await createImageBitmap(basePool.canvas);

  basePool.ctx.reset();
  basePool.ctx.globalCompositeOperation = 'source-over';
  basePool.ctx.drawImage(dilatedSnapshot, 0, 0);
  basePool.ctx.globalCompositeOperation = 'lighten';
  for (const offset of MORPHOLOGICAL_HEALER_CLOSING_OFFSETS) {
    basePool.ctx.drawImage(dilatedSnapshot, 0, offset);
  }

  grayscaleSnapshot.close();
  dilatedSnapshot.close();

  const finalPool = getPooledCanvas('macro_final', canvasWidth, canvasHeight);
  finalPool.ctx.filter = 'contrast(250%)';
  finalPool.ctx.drawImage(basePool.canvas, 0, 0);

  return await createImageBitmap(finalPool.canvas);
};

/**
 * Flat-Field Illumination Normalization Filter
 * Normalizes uneven background lighting without losing contrast on the data modules.
 */
export const imageIlluminationFlattenProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(RESIZE_MATRIX_SIZE / width, RESIZE_MATRIX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const sharpPool = getPooledCanvas('flatten_sharp', canvasWidth, canvasHeight);
  sharpPool.ctx.filter = 'grayscale(100%) contrast(120%)';
  sharpPool.ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  const blurPool = getPooledCanvas('flatten_blur', canvasWidth, canvasHeight);
  blurPool.ctx.filter = 'grayscale(100%) blur(12px)';
  blurPool.ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  const diffPool = getPooledCanvas('flatten_diff', canvasWidth, canvasHeight);
  diffPool.ctx.drawImage(sharpPool.canvas, 0, 0);
  diffPool.ctx.globalCompositeOperation = 'difference';
  diffPool.ctx.drawImage(blurPool.canvas, 0, 0);
  const lowContrastSnapshot = await createImageBitmap(diffPool.canvas);

  const finalPool = getPooledCanvas('flatten_final', canvasWidth, canvasHeight);
  finalPool.ctx.fillStyle = '#ffffff';
  finalPool.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  finalPool.ctx.globalCompositeOperation = 'difference';
  finalPool.ctx.drawImage(lowContrastSnapshot, 0, 0);
  lowContrastSnapshot.close();

  // Apply high contrast to the final combined black-on-white image
  const balancedSnapshot = await createImageBitmap(finalPool.canvas);
  finalPool.ctx.reset();
  finalPool.ctx.filter = 'contrast(300%) brightness(90%)';
  finalPool.ctx.drawImage(balancedSnapshot, 0, 0);
  balancedSnapshot.close();

  return await createImageBitmap(finalPool.canvas);
};

export const imageUnsharpMaskSharpenProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(RESIZE_MATRIX_SIZE / width, RESIZE_MATRIX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const { canvas, ctx } = getPooledCanvas('sharpen_base', canvasWidth, canvasHeight);

  ctx.filter = 'grayscale(100%) contrast(150%)';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  const sharpSnapshot = await createImageBitmap(canvas);
  ctx.globalCompositeOperation = 'overlay';
  ctx.filter = 'blur(1.5px) invert(100%) brightness(90%)';
  ctx.drawImage(sharpSnapshot, 0, 0);

  sharpSnapshot.close();
  return await createImageBitmap(canvas);
};

export const imageAdaptiveThresholdProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(RESIZE_MATRIX_SIZE / width, RESIZE_MATRIX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const { canvas, ctx } = getPooledCanvas('threshold_base', canvasWidth, canvasHeight);

  ctx.filter = 'grayscale(100%) blur(0.6px) contrast(250%) brightness(90%)';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  return await createImageBitmap(canvas);
};

export const imageDownscaleProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(DOWNSCALE_PROCESSING_SIZE / width, DOWNSCALE_PROCESSING_SIZE / height);
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);

  const { canvas, ctx } = getPooledCanvas('downscale_base', targetWidth, targetHeight);

  ctx.drawImage(baseBmp, 0, 0, targetWidth, targetHeight);

  return await createImageBitmap(canvas);
};

export const imageHighContrastProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(RESIZE_MATRIX_SIZE / width, RESIZE_MATRIX_SIZE / height);
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);

  const { canvas, ctx } = getPooledCanvas('contrast_base', targetWidth, targetHeight);

  ctx.filter = 'grayscale(100%) contrast(300%)';
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
