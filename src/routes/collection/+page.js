import { seriesJsonFiles, extractSeriesJsonFromPath } from '$lib/utils/lego_data.js';

export const load = async () => {
  const promises = Object.keys(seriesJsonFiles).map(async (filePath) => {
    const data = await extractSeriesJsonFromPath(filePath);
    return {
      slug: data.series,
      displayName: data.displayName || data.series,
      releaseYear: data.releaseYear,
      figures: data.minifigures || []
    };
  });

  const groupedCollectionsRes = await Promise.all(promises);

  const groupedCollections = groupedCollectionsRes.filter(Boolean).sort((a, b) => {
    const yearDiff = (b.releaseYear || 0) - (a.releaseYear || 0);
    if (yearDiff !== 0) return yearDiff;

    return a.displayName.localeCompare(b.displayName);
  });

  return {
    title: 'My Collection',
    groupedCollections
  };
};
