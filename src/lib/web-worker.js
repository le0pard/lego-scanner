import { expose } from 'comlink';
import { BarcodeDetector, ZXING_WASM_VERSION, prepareZXingModule } from 'barcode-detector';

let detector = null;

const api = {
	/**
	 * Initialize the WASM module and detector instance inside the worker
	 * @param {string} basePath - Passed dynamically from SvelteKit's main thread
	 */
	async init(basePath = '/') {
		const cleanBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

		prepareZXingModule({
			overrides: {
				locateFile: (path, prefix) => {
					if (path.endsWith('.wasm')) {
						// Dynamically prepend the deployment base path
						return `${cleanBase}/wasm/zxing/${ZXING_WASM_VERSION}/${path}`;
					}
					return `${prefix}${path}`;
				}
			},
			fireImmediately: true
		});

		const supportedFormats = await BarcodeDetector.getSupportedFormats();
		if (!supportedFormats.includes('data_matrix')) {
			throw new Error('Data Matrix format is not supported on this device/browser.');
		}

		detector = new BarcodeDetector({ formats: ['data_matrix'] });
	},

	/**
	 * Process a single transferred ImageBitmap frame
	 * @param {ImageBitmap} imageBitmap
	 */
	async detect(imageBitmap) {
		if (!detector) {
			throw new Error('Worker scanner not initialized. Call init() first.');
		}

		try {
			const barcodes = await detector.detect(imageBitmap);

			// Critical: Close the bitmap inside the worker to immediately free system memory
			imageBitmap.close();

			if (barcodes.length > 0) {
				return barcodes[0].rawValue;
			}
			return null;
		} catch (err) {
			imageBitmap.close();
			console.error('Worker extraction failure:', err);
			return null;
		}
	}
};

expose(api);
