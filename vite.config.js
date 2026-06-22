import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    enhancedImages(),
    sveltekit({
      compilerOptions: {
        runes: true
      },
      adapter: adapter({
        pages: 'build',
        assets: 'build',
        fallback: '404.html',
        strict: true,
        precompress: false
      })
    })
  ]
});
