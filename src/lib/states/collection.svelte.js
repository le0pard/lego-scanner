import { db } from '$lib/utils/db.js';
import { SvelteSet, SvelteDate } from 'svelte/reactivity';

let collectedSlugs = new SvelteSet();

export const collectionState = {
  async init() {
    const records = await db.userCollection.toArray();

    // Clear and repopulate the reactive set directly
    collectedSlugs.clear();
    for (const record of records) {
      collectedSlugs.add(record.slug);
    }
  },

  isCollected(slug) {
    return collectedSlugs.has(slug);
  },

  async toggle(slug) {
    if (collectedSlugs.has(slug)) {
      await db.userCollection.delete(slug);

      collectedSlugs.delete(slug);
    } else {
      const addedAt = new SvelteDate().toISOString();
      await db.userCollection.put({ slug, addedAt });

      collectedSlugs.add(slug);
    }
  }
};
