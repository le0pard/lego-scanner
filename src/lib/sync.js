import { db } from './db';
import { resolve } from '$app/paths';

export async function syncDatabase() {
	try {
		// 1. Fetch from your new direct SvelteKit API endpoint
		const manifestResponse = await fetch(resolve(`/api/manifest?t=${Date.now()}`));
		if (!manifestResponse.ok) throw new Error('Could not fetch remote manifest');

		const { seriesManifest } = await manifestResponse.json();

		// 2. Pull local sync metadata maps out of IndexedDB
		const localMetaArray = await db.syncMeta.toArray();
		const localMetaMap = Object.fromEntries(localMetaArray.map((m) => [m.key, m.hash]));

		// 3. Differential match loops
		for (const [seriesId, remoteInfo] of Object.entries(seriesManifest)) {
			const localHash = localMetaMap[seriesId];

			// If hashes do not match, the file has been modified or is brand new!
			if (localHash !== remoteInfo.hash) {
				console.log(`🔄 Diff detected for Series ${seriesId}. Downloading fresh pack...`);

				const dataResponse = await fetch(resolve(`/data/${remoteInfo.filename}`));
				if (!dataResponse.ok) continue;

				const minifigsData = await dataResponse.json();

				// Atomically update local database entries
				await db.minifigs.bulkPut(minifigsData);

				// Save the new hash down to the tracking table
				await db.syncMeta.put({
					key: seriesId,
					hash: remoteInfo.hash,
					lastSynced: new Date().toISOString()
				});
			}
		}
		console.log('✅ Database sync analysis finished.');
	} catch (error) {
		console.warn('⚠️ Sync deferred. Using offline cached data stores:', error);
	}
}
