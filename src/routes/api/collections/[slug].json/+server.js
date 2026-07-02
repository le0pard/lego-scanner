import { json, error } from '@sveltejs/kit';
import { seriesEntries, seriesJsonFiles, extractSeriesJsonFromPath } from '$lib/utils/lego_data.js';

export const prerender = true;
export const entries = seriesEntries;

export const GET = async ({ params }) => {
  const { slug } = params;

  // Construct the exact path Vite mapped in the glob object
  const targetPath = `/src/lib/data/${slug}.json`;

  // Check if the file exists in our mapped object
  if (!seriesJsonFiles[targetPath]) {
    // If someone requests /api/collections/fake-series, return a 404
    throw error(404, `Collection '${slug}' not found.`);
  }

  try {
    const jsonData = await extractSeriesJsonFromPath(targetPath);
    const { minifigures, ...rest } = jsonData;

    const processedMinifigures = minifigures.map((fig) => {
      const generatedSearchKeys = fig.identifiers
        .map((id) => [
          ...new Set([[id.code, id.factory, id.year].filter(Boolean).join('_'), id.code])
        ])
        .flat();

      return {
        ...fig,
        ...rest,
        searchKeys: generatedSearchKeys
      };
    });

    return json(processedMinifigures);
  } catch {
    throw error(500, 'Error processing the JSON data.');
  }
};
