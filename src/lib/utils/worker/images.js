const DOWNSCALE_MAX_SIZE = 700;

/**
 * Mathematically Symmetric Morphological Vertical Closing Filter
 * Fuses print-head dropouts while strictly preserving data module proportions.
 */
export const imageScratchRepairFullProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(DOWNSCALE_MAX_SIZE / width, DOWNSCALE_MAX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not allocate execution canvas context');

  ctx.filter = 'grayscale(100%) contrast(170%) brightness(95%)';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  const grayscaleSnapshot = await createImageBitmap(canvas);

  // DILATION PASS: Shift image vertically up to 5px. Dark pixels bleed into the thick white scratch line.
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'darken';
  const dilationOffsets = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
  for (const offset of dilationOffsets) {
    ctx.drawImage(grayscaleSnapshot, 0, offset);
  }

  const dilatedSnapshot = await createImageBitmap(canvas);

  // EROSION PASS: Identical 2px offset array under 'lighten' mode to restore shapes
  ctx.globalCompositeOperation = 'lighten';
  const erosionOffsets = [-2, -1, 1, 2];
  for (const offset of erosionOffsets) {
    ctx.drawImage(dilatedSnapshot, 0, offset);
  }

  grayscaleSnapshot.close();
  dilatedSnapshot.close();

  const finalCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('Could not allocate final context');

  finalCtx.filter = 'contrast(250%)';
  finalCtx.drawImage(canvas, 0, 0);

  return await createImageBitmap(finalCanvas);
};

/**
 * Enhanced Digital Zoom + Symmetric Morphological Healer
 * Magnifies distant data matrix grids before applying shape-safe line healing.
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

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not allocate zoom canvas context');

  ctx.filter = 'grayscale(100%) contrast(170%) brightness(95%)';
  ctx.drawImage(baseBmp, cropX, cropY, cropWidth, cropHeight, 0, 0, canvasWidth, canvasHeight);

  const grayscaleSnapshot = await createImageBitmap(canvas);

  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'darken';
  const symmetricOffsets = [-2, -1, 1, 2];
  for (const offset of symmetricOffsets) {
    ctx.drawImage(grayscaleSnapshot, 0, offset);
  }

  const dilatedSnapshot = await createImageBitmap(canvas);

  ctx.globalCompositeOperation = 'lighten';
  for (const offset of symmetricOffsets) {
    ctx.drawImage(dilatedSnapshot, 0, offset);
  }

  grayscaleSnapshot.close();
  dilatedSnapshot.close();

  const finalCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('Could not allocate final zoom context');

  finalCtx.filter = 'contrast(250%)';
  finalCtx.drawImage(canvas, 0, 0);

  return await createImageBitmap(finalCanvas);
};

/**
 * Flat-Field Illumination Normalization Filter
 * Neutralizes uneven background shadows and harsh retail packaging glare
 * by executing an isolated multi-canvas low-frequency subtraction pass.
 */
export const imageIlluminationFlattenProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(DOWNSCALE_MAX_SIZE / width, DOWNSCALE_MAX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  // Setup isolated canvas contexts to prevent sequential filter bleeding
  const canvasSharp = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctxSharp = canvasSharp.getContext('2d');
  ctxSharp.filter = 'grayscale(100%) contrast(120%)';
  ctxSharp.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  const canvasBlur = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctxBlur = canvasBlur.getContext('2d');
  ctxBlur.filter = 'grayscale(100%) blur(12px)';
  ctxBlur.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  // Isolate high-frequency matrix shapes via difference calculation
  const canvasDiff = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctxDiff = canvasDiff.getContext('2d');
  ctxDiff.drawImage(canvasSharp, 0, 0);
  ctxDiff.globalCompositeOperation = 'difference';
  ctxDiff.drawImage(canvasBlur, 0, 0);

  // Invert the difference canvas against a clean solid fill to produce crisp black-on-white structures
  const finalCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('Could not allocate flattener final context');

  finalCtx.fillStyle = '#ffffff';
  finalCtx.fillRect(0, 0, canvasWidth, canvasHeight);
  finalCtx.globalCompositeOperation = 'difference';
  finalCtx.filter = 'contrast(250%) brightness(95%)';
  finalCtx.drawImage(canvasDiff, 0, 0);

  return await createImageBitmap(finalCanvas);
};

export const imageUnsharpMaskSharpenProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const ratio = Math.min(DOWNSCALE_MAX_SIZE / width, DOWNSCALE_MAX_SIZE / height);
  const canvasWidth = Math.round(width * ratio);
  const canvasHeight = Math.round(height * ratio);

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get sharpen context');

  ctx.filter = 'grayscale(100%) contrast(150%)';
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

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not allocate threshold canvas');

  ctx.filter = 'grayscale(100%) blur(0.6px) contrast(250%) brightness(90%)';
  ctx.drawImage(baseBmp, 0, 0, width, height, 0, 0, canvasWidth, canvasHeight);

  return await createImageBitmap(canvas);
};

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

export const imageProcessingPipeline = [
  imageDownscaleProcessing,
  imageScratchRepairFullProcessing,
  imageMacroCropScratchRepairProcessing,
  imageIlluminationFlattenProcessing,
  imageUnsharpMaskSharpenProcessing,
  imageAdaptiveThresholdProcessing,
  imageHighContrastProcessing
];
