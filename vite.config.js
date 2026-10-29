import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { ZXING_WASM_VERSION } from 'zxing-wasm/reader';
import readPackageProperty from 'node:fs';
import { createRequire } from 'node:module';

const pkg = JSON.parse(readPackageProperty.readFileSync('./package.json', 'utf-8'));

const ZXING_WASM_DIR = 'static/wasm/zxing';

// Copies the installed zxing_reader.wasm to the versioned path scanner-worker.js requests.
// Runs before SvelteKit lists static/, so the service worker still precaches it.
const zxingWasm = () => ({
  name: 'zxing-wasm',
  enforce: 'pre',
  config: {
    order: 'pre',
    handler() {
      const source = createRequire(import.meta.url).resolve('zxing-wasm/reader/zxing_reader.wasm');
      const targetDir = `${ZXING_WASM_DIR}/${ZXING_WASM_VERSION}`;

      readPackageProperty.rmSync(ZXING_WASM_DIR, { recursive: true, force: true });
      readPackageProperty.mkdirSync(targetDir, { recursive: true });
      readPackageProperty.copyFileSync(source, `${targetDir}/zxing_reader.wasm`);
    }
  }
});

export default defineConfig({
  plugins: [
    zxingWasm(),
    tailwindcss(),
    enhancedImages(),
    sveltekit({
      compilerOptions: {
        runes: true
      },
      paths: {
        origin: 'https://lego-scanner.leopard.in.ua',
        relative: false
      },
      adapter: adapter({
        pages: 'build',
        assets: 'build',
        fallback: '404.html',
        strict: true,
        precompress: false
      }),
      // Inline only small CSS files (< 2 KB)
      inlineStyleThreshold: 2048
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    reportCompressedSize: false
  }
});
