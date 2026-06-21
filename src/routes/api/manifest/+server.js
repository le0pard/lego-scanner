import { json } from '@sveltejs/kit';
import { extractJsonFileName } from '$lib/utils/files.js';

export const prerender = true;

const rawFiles = import.meta.glob('/src/lib/data/*.json', {
  query: '?raw',
  import: 'default'
});

// Edge-compatible hashing function (No Node.js 'crypto' required)
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
      const { filename, name } = extractJsonFileName(filePath);

      // Execute the import to get the raw text content
      const content = await rawFiles[filePath]();
      const hash = await getFileHash(content);

      seriesManifest[name] = {
        endpoint: new URL(`/api/collections/${name}`, url.origin).pathname,
        filename,
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
