import { error } from '@sveltejs/kit';
import { seriesEntries, seriesJsonFiles } from '$lib/utils/lego_data.js';

export const entries = seriesEntries;

export const load = async ({ params }) => {
  const { slug } = params;

  const targetPath = `/src/lib/data/${slug}.json`;
  const fileLoader = seriesJsonFiles[targetPath];

  // Defensively throw a 404 if a user types a series that doesn't exist
  if (!fileLoader) {
    error(404, { message: `Series "${slug}" not found in local records.` });
  }

  // Await the lazy-loaded JSON module resolution
  const module = await fileLoader();
  const data = module.default;

  const { minifigures = [], ...seriesMetadata } = data;

  // Map metadata traits down into each figure object for easy access
  const collection = minifigures.map((figure) => ({
    ...figure,
    ...seriesMetadata
  }));

  return {
    figures: collection,
    metadata: seriesMetadata
  };
};
