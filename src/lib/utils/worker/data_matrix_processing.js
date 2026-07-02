const STRIDES = [-3, -2, -1, 1, 2, 3];
const RESIZE_MATRIX_SIZE = 700;
const DOWNSCALE_PROCESSING_SIZE = 600;

const canvasPool = {};

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
      if (entry.ctx.reset) {
        entry.ctx.reset();
      } else {
        entry.canvas.width = width; // Legacy reliable way to clear canvas and reset state
      }
    }
  }
  return canvasPool[key];
};

/**
 * Applies a 1D morphology shift using exact canvas bounding boxes
 */
const applyMorphology = ({ ctx, snapshot, mode, type = 'vertical', w, h } = {}) => {
  const isVertical = type === 'vertical';
  ctx.imageSmoothingEnabled = false;

  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(snapshot, 0, 0, w, h, 0, 0, w, h);

  ctx.globalCompositeOperation = mode;
  for (const offset of STRIDES) {
    ctx.drawImage(snapshot, 0, 0, w, h, isVertical ? 0 : offset, isVertical ? offset : 0, w, h);
  }
  // Safeguard: Always revert composite mode back to default baseline
  ctx.globalCompositeOperation = 'source-over';
};

export const applyVerticalMorphology = ({ ctx, snapshot, mode, w, h } = {}) => {
  applyMorphology({ type: 'vertical', ctx, snapshot, mode, w, h });
};

export const applyHorizontalMorphology = ({ ctx, snapshot, mode, w, h } = {}) => {
  applyMorphology({ type: 'horizontal', ctx, snapshot, mode, w, h });
};

export const repairHorizontalScratches = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(RESIZE_MATRIX_SIZE / width, RESIZE_MATRIX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const basePool = getPooledCanvas('scratch_h_base', canvasWidth, canvasHeight);
  const tempPool = getPooledCanvas('scratch_h_temp', canvasWidth, canvasHeight);

  // Binarize the image FIRST so the scratch is absolute white and modules are absolute black
  basePool.ctx.filter = 'grayscale(100%) contrast(300%) brightness(90%)';
  basePool.ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);
  const grayscaleSnapshot = await createImageBitmap(basePool.canvas);

  // Dilate pass: move vertically to seal horizontal cut lines
  tempPool.ctx.filter = 'none';
  applyVerticalMorphology({
    ctx: tempPool.ctx,
    snapshot: grayscaleSnapshot,
    mode: 'darken',
    w: canvasWidth,
    h: canvasHeight
  });
  const dilatedSnapshot = await createImageBitmap(tempPool.canvas);

  // Erode pass: restore geometric sizes
  basePool.ctx.reset();
  basePool.ctx.filter = 'none';
  applyVerticalMorphology({
    ctx: basePool.ctx,
    snapshot: dilatedSnapshot,
    mode: 'lighten',
    w: canvasWidth,
    h: canvasHeight
  });

  grayscaleSnapshot.close();
  dilatedSnapshot.close();

  return await createImageBitmap(basePool.canvas);
};

export const repairVerticalScratches = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(RESIZE_MATRIX_SIZE / width, RESIZE_MATRIX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const basePool = getPooledCanvas('scratch_v_base', canvasWidth, canvasHeight);
  const tempPool = getPooledCanvas('scratch_v_temp', canvasWidth, canvasHeight);

  // Binarize the image FIRST
  basePool.ctx.filter = 'grayscale(100%) contrast(300%) brightness(90%)';
  basePool.ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);
  const grayscaleSnapshot = await createImageBitmap(basePool.canvas);

  // Dilate pass: move horizontally to seal vertical cut lines
  tempPool.ctx.filter = 'none';
  applyHorizontalMorphology({
    ctx: tempPool.ctx,
    snapshot: grayscaleSnapshot,
    mode: 'darken',
    w: canvasWidth,
    h: canvasHeight
  });
  const dilatedSnapshot = await createImageBitmap(tempPool.canvas);

  basePool.ctx.reset();
  basePool.ctx.filter = 'none';
  applyHorizontalMorphology({
    ctx: basePool.ctx,
    snapshot: dilatedSnapshot,
    mode: 'lighten',
    w: canvasWidth,
    h: canvasHeight
  });

  grayscaleSnapshot.close();
  dilatedSnapshot.close();

  return await createImageBitmap(basePool.canvas);
};

export const imageScratchRepairFullProcessing = async (baseBmp) => {
  return await repairHorizontalScratches(baseBmp);
};

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
  const processedBmp = await repairHorizontalScratches(croppedBmp);
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
  finalPool.ctx.reset();
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

// Reordered: Run morphology with robust threshold states directly inside its logic loops
export const imageProcessingPipeline = [
  imageDownscaleProcessing,
  imageUnsharpMaskSharpenProcessing,
  repairHorizontalScratches,
  repairVerticalScratches,
  imageIlluminationFlattenProcessing,
  imageAdaptiveThresholdProcessing,
  imageHighContrastProcessing
];
