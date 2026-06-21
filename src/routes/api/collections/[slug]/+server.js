import { json, error } from '@sveltejs/kit';

export const prerender = true;

const jsonFiles = import.meta.glob('/src/lib/data/*.json');

const extractJsonFromPath = async (filePath) => {
  const module = await jsonFiles[filePath]();
  return module.default;
};

export const entries = async () => {
  const promises = Object.keys(jsonFiles).map(async (filePath) => {
    const jsonData = await extractJsonFromPath(filePath);
    return { slug: jsonData.series };
  });

  return await Promise.all(promises);
};

export const GET = async ({ params }) => {
  const { slug } = params;

  // Construct the exact path Vite mapped in the glob object
  const targetPath = `/src/lib/data/${slug}.json`;

  // Check if the file exists in our mapped object
  if (!jsonFiles[targetPath]) {
    // If someone requests /api/collections/fake-series, return a 404
    throw error(404, `Collection '${slug}' not found.`);
  }

  try {
    const jsonData = await extractJsonFromPath(targetPath);

    const processedMinifigures = jsonData.minifigures.map((fig) => {
      const generatedSearchKeys = fig.identifiers.map((id) =>
        [id.code, id.factory, id.year].filter(Boolean).join('_')
      );

      return {
        ...fig,
        searchKeys: generatedSearchKeys
      };
    });

    const responsePayload = {
      series: jsonData.series,
      displayName: jsonData.displayName,
      releaseYear: jsonData.releaseYear,
      minifigures: processedMinifigures
    };

    return json(responsePayload);
  } catch (err) {
    throw error(500, 'Error processing the JSON data.');
  }
};
