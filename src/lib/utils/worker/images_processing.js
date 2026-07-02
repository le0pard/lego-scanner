const STRIDES_LIGHT = [-3, -2, -1, 1, 2, 3];
const STRIDES_HEAVY = [-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7];
const RESIZE_MATRIX_SIZE = 700;
const DOWNSCALE_PROCESSING_SIZE = 600;

const canvasPool = {};

const clearCanvas = (poolEntry) => {
  if (poolEntry.ctx.reset) {
    poolEntry.ctx.reset();
  } else {
    const { width } = poolEntry.canvas;
    poolEntry.canvas.width = width; // Legacy fallback
  }
};

const getPooledCanvas = (key, width, height) => {
  if (!canvasPool[key]) {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    canvasPool[key] = { canvas, ctx };
  } else {
    const entry = canvasPool[key];
    if (entry.canvas.width !== width || entry.canvas.height !== height) {
      entry.canvas.width = width;
      entry.canvas.height = height;
    } else {
      clearCanvas(entry); // Use the safe helper here
    }
  }
  return canvasPool[key];
};

/**
 * Applies a 1D morphology shift using exact canvas bounding boxes
 */
const applyMorphology = ({ ctx, snapshot, mode, type = 'vertical', w, h, strides } = {}) => {
  const isVertical = type === 'vertical';
  ctx.imageSmoothingEnabled = false;

  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(snapshot, 0, 0, w, h, 0, 0, w, h);

  ctx.globalCompositeOperation = mode;
  for (const offset of strides) {
    ctx.drawImage(snapshot, 0, 0, w, h, isVertical ? 0 : offset, isVertical ? offset : 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over'; // Revert to baseline
};

/**
 * Merges Horizontal & Vertical repair logic into one DRY function
 */
const repairScratches = async (
  baseBmp,
  targetScratchType = 'horizontal',
  strides = STRIDES_LIGHT
) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(RESIZE_MATRIX_SIZE / width, RESIZE_MATRIX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const morphologyType = targetScratchType === 'horizontal' ? 'vertical' : 'horizontal';
  const prefix = targetScratchType === 'horizontal' ? 'h' : 'v';

  const basePool = getPooledCanvas(`scratch_${prefix}_base`, canvasWidth, canvasHeight);
  const tempPool = getPooledCanvas(`scratch_${prefix}_temp`, canvasWidth, canvasHeight);

  // Binarize the image FIRST
  basePool.ctx.filter = 'grayscale(100%) contrast(300%) brightness(90%)';
  basePool.ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);
  const grayscaleSnapshot = await createImageBitmap(basePool.canvas);

  // Dilate pass
  tempPool.ctx.filter = 'none';
  applyMorphology({
    ctx: tempPool.ctx,
    snapshot: grayscaleSnapshot,
    mode: 'darken',
    type: morphologyType,
    w: canvasWidth,
    h: canvasHeight,
    strides
  });
  const dilatedSnapshot = await createImageBitmap(tempPool.canvas);

  // Erode pass
  clearCanvas(basePool);
  basePool.ctx.filter = 'none';
  applyMorphology({
    ctx: basePool.ctx,
    snapshot: dilatedSnapshot,
    mode: 'lighten',
    type: morphologyType,
    w: canvasWidth,
    h: canvasHeight,
    strides
  });

  grayscaleSnapshot.close();
  dilatedSnapshot.close();

  return await createImageBitmap(basePool.canvas);
};

export const repairHorizontalScratchesLight = (baseBmp) =>
  repairScratches(baseBmp, 'horizontal', STRIDES_LIGHT);
export const repairVerticalScratchesLight = (baseBmp) =>
  repairScratches(baseBmp, 'vertical', STRIDES_LIGHT);
export const repairHorizontalScratchesHeavy = (baseBmp) =>
  repairScratches(baseBmp, 'horizontal', STRIDES_HEAVY);
export const repairVerticalScratchesHeavy = (baseBmp) =>
  repairScratches(baseBmp, 'vertical', STRIDES_HEAVY);
export const imageScratchRepairFullProcessing = async (baseBmp) =>
  repairHorizontalScratchesLight(baseBmp);

export const imageMacroCropScratchRepairProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const cropWidth = Math.floor(width * 0.6);
  const cropHeight = Math.floor(height * 0.6);
  const cropX = Math.floor((width - cropWidth) / 2);
  const cropY = Math.floor((height - cropHeight) / 2);

  const ratio = Math.min(RESIZE_MATRIX_SIZE / cropWidth, RESIZE_MATRIX_SIZE / cropHeight);
  const canvasWidth = Math.round(cropWidth * ratio);
  const canvasHeight = Math.round(cropHeight * ratio);

  const basePool = getPooledCanvas('macro_base', canvasWidth, canvasHeight);
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

  const croppedBmp = await createImageBitmap(basePool.canvas);
  const processedBmp = await repairHorizontalScratchesLight(croppedBmp);
  croppedBmp.close();

  return processedBmp;
};

export const imageIlluminationFlattenProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(RESIZE_MATRIX_SIZE / width, RESIZE_MATRIX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const sharpPool = getPooledCanvas('flatten_sharp', canvasWidth, canvasHeight);
  sharpPool.ctx.filter = 'grayscale(100%) contrast(140%)';
  sharpPool.ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  const blurPool = getPooledCanvas('flatten_blur', canvasWidth, canvasHeight);
  blurPool.ctx.filter = 'grayscale(100%) blur(25px)';
  blurPool.ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  const diffPool = getPooledCanvas('flatten_diff', canvasWidth, canvasHeight);
  diffPool.ctx.filter = 'none';
  diffPool.ctx.globalCompositeOperation = 'source-over';
  diffPool.ctx.drawImage(
    sharpPool.canvas,
    0,
    0,
    canvasWidth,
    canvasHeight,
    0,
    0,
    canvasWidth,
    canvasHeight
  );
  diffPool.ctx.globalCompositeOperation = 'difference';
  diffPool.ctx.drawImage(
    blurPool.canvas,
    0,
    0,
    canvasWidth,
    canvasHeight,
    0,
    0,
    canvasWidth,
    canvasHeight
  );
  const lowContrastSnapshot = await createImageBitmap(diffPool.canvas);

  const finalPool = getPooledCanvas('flatten_final', canvasWidth, canvasHeight);
  finalPool.ctx.filter = 'none';
  finalPool.ctx.globalCompositeOperation = 'source-over';
  finalPool.ctx.fillStyle = '#ffffff';
  finalPool.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  finalPool.ctx.globalCompositeOperation = 'difference';
  finalPool.ctx.drawImage(
    lowContrastSnapshot,
    0,
    0,
    canvasWidth,
    canvasHeight,
    0,
    0,
    canvasWidth,
    canvasHeight
  );
  lowContrastSnapshot.close();

  const balancedSnapshot = await createImageBitmap(finalPool.canvas);
  clearCanvas(finalPool);
  finalPool.ctx.filter = 'contrast(250%) brightness(95%)';
  finalPool.ctx.drawImage(
    balancedSnapshot,
    0,
    0,
    canvasWidth,
    canvasHeight,
    0,
    0,
    canvasWidth,
    canvasHeight
  );
  balancedSnapshot.close();

  return await createImageBitmap(finalPool.canvas);
};

export const imageUnsharpMaskSharpenProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(RESIZE_MATRIX_SIZE / width, RESIZE_MATRIX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const { canvas, ctx } = getPooledCanvas('sharpen_base', canvasWidth, canvasHeight);
  ctx.filter = 'grayscale(100%) contrast(140%)';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  const sharpSnapshot = await createImageBitmap(canvas);
  ctx.globalCompositeOperation = 'overlay';
  ctx.filter = 'blur(1px) invert(100%)';
  ctx.drawImage(sharpSnapshot, 0, 0, canvasWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight);

  sharpSnapshot.close();
  return await createImageBitmap(canvas);
};

export const imageAdaptiveThresholdProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(RESIZE_MATRIX_SIZE / width, RESIZE_MATRIX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const { canvas, ctx } = getPooledCanvas('threshold_base', canvasWidth, canvasHeight);
  ctx.filter = 'grayscale(100%) contrast(200%) brightness(95%)';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  return await createImageBitmap(canvas);
};

export const imageDownscaleProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(DOWNSCALE_PROCESSING_SIZE / width, DOWNSCALE_PROCESSING_SIZE / height);
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);

  const { canvas, ctx } = getPooledCanvas('downscale_base', targetWidth, targetHeight);
  ctx.filter = 'none';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, targetWidth, targetHeight);

  return await createImageBitmap(canvas);
};

export const imageHighContrastProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(RESIZE_MATRIX_SIZE / width, RESIZE_MATRIX_SIZE / height);
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);

  const { canvas, ctx } = getPooledCanvas('contrast_base', targetWidth, targetHeight);
  ctx.filter = 'grayscale(100%) contrast(250%)';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, targetWidth, targetHeight);

  return await createImageBitmap(canvas);
};

export const imageProcessingPipeline = [
  imageDownscaleProcessing,
  imageUnsharpMaskSharpenProcessing,
  repairHorizontalScratchesLight,
  repairVerticalScratchesLight,
  repairHorizontalScratchesHeavy,
  repairVerticalScratchesHeavy,
  imageIlluminationFlattenProcessing,
  imageAdaptiveThresholdProcessing,
  imageHighContrastProcessing
];
