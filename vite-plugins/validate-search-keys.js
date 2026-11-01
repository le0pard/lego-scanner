import fs from 'node:fs';
import path from 'node:path';
import { buildSearchKeys } from '../src/lib/utils/search_keys.js';

const DATA_DIR = 'src/lib/data';

/**
 * Fails the build when two minifigures share a search key. The scanner looks figures up
 * by key, so a shared key would return whichever figure IndexedDB finds first.
 */
export const validateSearchKeys = () => {
  let dataDir;

  return {
    name: 'validate-search-keys',
    apply: 'build',

    configResolved(config) {
      dataDir = path.join(config.root, DATA_DIR);
    },

    buildStart() {
      /** @type {Map<string, Set<string>>} key -> "slug (file)" of every figure using it */
      const owners = new Map();

      for (const file of fs.readdirSync(dataDir).filter((name) => name.endsWith('.json'))) {
        const filePath = path.join(dataDir, file);
        this.addWatchFile(filePath);

        let collection;
        try {
          collection = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (err) {
          this.error(`Invalid JSON in ${DATA_DIR}/${file}: ${err.message}`);
        }

        for (const { slug, identifiers } of collection.minifigures) {
          for (const key of buildSearchKeys(identifiers)) {
            if (!owners.has(key)) owners.set(key, new Set());
            owners.get(key).add(`${slug} (${file})`);
          }
        }
      }

      const duplicates = [...owners].filter(([, figures]) => figures.size > 1);
      if (duplicates.length > 0) {
        const lines = duplicates.map(([key, figures]) => `  ${key}: ${[...figures].join(', ')}`);
        this.error(`Duplicate search keys in ${DATA_DIR}:\n${lines.join('\n')}`);
      }
    }
  };
};
