export const optimizedImageModules = import.meta.glob(
  '/src/lib/assets/minifigures/**/*.{avif,AVIF,gif,GIF,heif,HEIF,jpeg,JPEG,jpg,JPG,png,PNG,tiff,TIFF,webp,WEBP}',
  {
    query: {
      enhanced: true,
      // Generates 1x (160px), 2x (320px), and 3x (480px) asset variations
      w: '160;320;480'
    },
    import: 'default',
    eager: true
  }
);

export const getOptimizedImage = (imagePath) => {
  if (!imagePath) return null;
  // Convert standard static asset paths into the Vite source path needed for the glob object
  const resolvedSourceKey = imagePath.replace('/assets/', '/src/lib/assets/');
  return optimizedImageModules[resolvedSourceKey] || null;
};

export const extractFieldsFromDataMatrix = (dataMatrix = '') => {
  const parts = dataMatrix.split(' ');
  // safety check
  if (parts.length < 2) {
    return null;
  }

  const productionCode = parts[1];
  // safety check
  if (productionCode.length < 5) {
    return null;
  }

  const code = parts[0];
  const factory = productionCode[3];
  const year = productionCode[4];

  return {
    code,
    factory,
    year,
    key: [code, factory, year].filter(Boolean).join('_')
  };
};
