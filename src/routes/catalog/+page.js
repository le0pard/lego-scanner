import { seriesJsonFiles, extractSeriesJsonFromPath } from '$lib/utils/lego_data.js';

export const load = async () => {
  const promises = Object.keys(seriesJsonFiles).map(async (filePath) => {
    const data = await extractSeriesJsonFromPath(filePath);
    const { minifigures, ...rest } = data;
    const collection = minifigures || [];

    // Defensively grab the first figure (Handles if your JSON is an array OR an object)
    const firstFig = Array.isArray(collection) ? collection[0] : collection;

    if (firstFig) {
      return {
        slug: rest.series,
        displayName: firstFig.displayName || rest.series,
        releaseYear: rest.releaseYear,
        coverImage: firstFig.imagePath
      };
    }
    return null;
  });

  let seriesList = await Promise.all(promises);

  // Filter out any empties and sort by newest release year
  seriesList = seriesList
    .filter(Boolean)
    .sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));

  return { seriesList };
};
