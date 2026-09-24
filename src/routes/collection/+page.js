import { seriesJsonFiles, extractSeriesJsonFromPath } from '$lib/utils/lego_data.js';

export const load = async () => {
  const promises = Object.keys(seriesJsonFiles).map(async (filePath) => {
    const data = await extractSeriesJsonFromPath(filePath);
    return {
      slug: data.series,
      displayName: data.displayName || data.series,
      figures: data.minifigures || []
    };
  });

  const groupedCollections = await Promise.all(promises);

  return {
    title: 'My Collection',
    groupedCollections
  };
};
