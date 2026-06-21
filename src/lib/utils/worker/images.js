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

  if (!ctx) throw new Error("Could not get 2D context");

  ctx.drawImage(baseBmp, 0, 0, targetWidth, targetHeight);

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

  if (!ctx) throw new Error("Could not get 2D context");

  ctx.filter = 'grayscale(100%) contrast(250%)';

  // Calculate top-left starting coordinates to perfectly center the crop
  const sourceX = Math.floor((width - canvasWidth) / 2);
  const sourceY = Math.floor((height - canvasHeight) / 2);

  ctx.drawImage(
    baseBmp,
    sourceX, sourceY, canvasWidth, canvasHeight, // Source clipping coordinates
    0, 0, canvasWidth, canvasHeight              // Destination canvas coordinates
  );

  return await createImageBitmap(canvas);
};

export const imageProcessingPipeline = [
  imageDownscaleProcessing,
  imageRawProcessing,
  imageZoomCenterProcessing,
  imageHighContrastProcessing
];
