import { json } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const prerender = true;

const DATA_DIR = path.resolve('static/data');

function getFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function GET() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      return json({ seriesManifest: {} });
    }

    const files = fs.readdirSync(DATA_DIR);
    const seriesFiles = files.filter(
      (file) => file.startsWith('series-') && file.endsWith('.json')
    );

    const seriesManifest = {};

    for (const filename of seriesFiles) {
      // Extract series identifier (e.g. "series-29.json" -> "29")
      const match = filename.match(/series-(\d+)\.json/);
      if (!match) continue;
      const seriesId = match[1];

      const filePath = path.join(DATA_DIR, filename);
      const hash = getFileHash(filePath);

      seriesManifest[seriesId] = {
        filename,
        hash // The client will check this hash to see if it needs an update
      };
    }

    return json({
      updatedAt: new Date().toISOString().split('T')[0],
      seriesManifest
    });
  } catch (err) {
    return json({ error: 'Failed to generate manifest', details: err.message }, { status: 500 });
  }
}
