import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import readPackageProperty from 'node:fs';

const pkg = JSON.parse(readPackageProperty.readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    tailwindcss(),
    enhancedImages(),
    sveltekit({
      compilerOptions: {
        runes: true
      },
      paths: {
        relative: false
      },
      adapter: adapter({
        pages: 'build',
        assets: 'build',
        fallback: '404.html',
        strict: true,
        precompress: false
      })
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    sourcemap: false,
    reportCompressedSize: false
  }
});
