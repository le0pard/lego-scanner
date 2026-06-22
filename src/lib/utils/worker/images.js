const DOWNSCALE_MAX_SIZE = 600;
const CENTER_START_PERCENTAGE = 0.2;
const CENTER_CROP_SIZE_PERCENTAGE = 0.6;
const HIGH_CONTRAST_CROP_COEFFICIENT = 0.5;

// Extreme downscale
const imageDownscaleProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;

  const ratio = Math.min(DOWNSCALE_MAX_SIZE / width, DOWNSCALE_MAX_SIZE / height);
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get 2D context');

  ctx.drawImage(baseBmp, 0, 0, targetWidth, targetHeight);

  return await createImageBitmap(canvas);
};

// Tight Macro Crop (For high-res close-ups)
const imageMacroCropProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;

  // Extract just the dead center 30% of the image
  const cropWidth = Math.floor(width * 0.3);
  const cropHeight = Math.floor(height * 0.3);
  const cropX = Math.floor((width - cropWidth) / 2);
  const cropY = Math.floor((height - cropHeight) / 2);

  // Downscale the cropped barcode so the WASM engine isn't overwhelmed
  const ratio = Math.min(500 / cropWidth, 500 / cropHeight);
  const targetWidth = Math.round(cropWidth * ratio);
  const targetHeight = Math.round(cropHeight * ratio);

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');

  // Draw the cropped section onto the downscaled canvas
  ctx.drawImage(baseBmp, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);
  return await createImageBitmap(canvas);
};

// Advanced Dot Smudge (Crop + Downscale + Blur + Contrast)
const imageDotSmudgeProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;

  // Crop center 50%
  const cropW = Math.floor(width * 0.5);
  const cropH = Math.floor(height * 0.5);
  const startX = Math.floor((width - cropW) / 2);
  const startY = Math.floor((height - cropH) / 2);

  // Squish to 600px max. This physically pushes the inkjet dots closer together!
  const ratio = Math.min(600 / cropW, 600 / cropH);
  const canvasWidth = Math.round(cropW * ratio);
  const canvasHeight = Math.round(cropH * ratio);

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Because the dots are now adjacent from downscaling, a 1.5px blur bridges
  // the gap perfectly. 400% contrast hardens it into a solid black barcode.
  ctx.filter = 'grayscale(100%) blur(1.5px) contrast(400%)';

  ctx.drawImage(baseBmp, startX, startY, cropW, cropH, 0, 0, canvasWidth, canvasHeight);

  return await createImageBitmap(canvas);
};

// Native raw file
const imageRawProcessing = async (baseBmp) => {
  return baseBmp;
};

// Center Zoom
const imageZoomCenterProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const cropX = Math.floor(width * CENTER_START_PERCENTAGE);
  const cropY = Math.floor(height * CENTER_START_PERCENTAGE);
  const cropWidth = Math.floor(width * CENTER_CROP_SIZE_PERCENTAGE);
  const cropHeight = Math.floor(height * CENTER_CROP_SIZE_PERCENTAGE);
  return await createImageBitmap(baseBmp, cropX, cropY, cropWidth, cropHeight);
};

// High Contrast
const imageHighContrastProcessing = async (baseBmp) => {
  const { width, height } = baseBmp;
  const canvasWidth = Math.floor(width * HIGH_CONTRAST_CROP_COEFFICIENT);
  const canvasHeight = Math.floor(height * HIGH_CONTRAST_CROP_COEFFICIENT);
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get 2D context');
  ctx.filter = 'grayscale(100%) contrast(250%)';

  const sourceX = Math.floor((width - canvasWidth) / 2);
  const sourceY = Math.floor((height - canvasHeight) / 2);

  ctx.drawImage(
    baseBmp,
    sourceX,
    sourceY,
    canvasWidth,
    canvasHeight,
    0,
    0,
    canvasWidth,
    canvasHeight
  );

  return await createImageBitmap(canvas);
};

export const imageProcessingPipeline = [
  imageDownscaleProcessing, // Catches medium distance shots
  imageMacroCropProcessing, // Catches raw high-res closeups
  imageDotSmudgeProcessing, // Catches inkjet-dotted closeups
  imageRawProcessing, // Catches digital screenshots
  imageZoomCenterProcessing, // Catches tiny barcodes far away
  imageHighContrastProcessing // Catches poor lighting
];
