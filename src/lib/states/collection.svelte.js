import { db } from '$lib/utils/db.js';

let collectedSlugs = $state(new Set());

export const collectionState = {
  async init() {
    const records = await db.userCollection.toArray();
    collectedSlugs = new Set(records.map((r) => r.slug));
  },

  isCollected(slug) {
    return collectedSlugs.has(slug);
  },

  async toggle(slug) {
    if (collectedSlugs.has(slug)) {
      await db.userCollection.delete(slug);
      const next = new Set(collectedSlugs);
      next.delete(slug);
      collectedSlugs = next;
    } else {
      await db.userCollection.put({ slug, addedAt: new Date().toISOString() });
      const next = new Set(collectedSlugs);
      next.add(slug);
      collectedSlugs = next;
    }
  }
};
