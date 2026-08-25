import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The site is published to GitHub Pages under a project path, so every asset
 * URL has to carry the repository name.
 */
export default defineConfig({
  base: '/second-shelf-prototype/',
  plugins: [react()],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    assetsDir: 'assets',
    sourcemap: false,
  },
});
