import { json, error } from '@sveltejs/kit';

export const prerender = true;

const jsonFiles = import.meta.glob('/src/lib/data/*.json');

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
    // Execute the dynamic import function for that specific file
    const module = await jsonFiles[targetPath]();

    // Vite wraps JSON imports in a default export, so we extract it here
    const rawData = module.default;

    const processedMinifigures = rawData.minifigures.map((fig) => {
      const generatedSearchKeys = fig.identifiers.map(
        (id) => `${id.code}_${id.factory}_${id.year}`
      );

      return {
        ...fig,
        searchKeys: generatedSearchKeys
      };
    });

    const responsePayload = {
      collectionId: rawData.collectionId,
      displayName: rawData.displayName,
      releaseYear: rawData.releaseYear,
      minifigures: processedMinifigures
    };

    return json(responsePayload);
  } catch (err) {
    throw error(500, 'Error processing the JSON data.');
  }
};
