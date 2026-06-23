import { json } from '@sveltejs/kit';

export const prerender = true;

const rawFiles = import.meta.glob('/src/lib/data/*.json', {
  query: '?raw',
  import: 'default'
});

const getFileHash = async (content) => {
  const msgBuffer = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const GET = async ({ url }) => {
  try {
    const seriesManifest = {};

    for (const filePath in rawFiles) {
      // Execute the import to get the raw text content
      const content = await rawFiles[filePath]();
      const hash = await getFileHash(content);
      const jsonData = JSON.parse(content);

      seriesManifest[jsonData.series] = {
        endpoint: new URL(`/api/collections/${jsonData.series}.json`, url.origin).pathname,
        hash
      };
    }

    return json({
      updatedAt: new Date().toISOString().split('T')[0],
      seriesManifest
    });
  } catch (err) {
    return json({ error: 'Failed to generate manifest', details: err.message }, { status: 500 });
  }
};
