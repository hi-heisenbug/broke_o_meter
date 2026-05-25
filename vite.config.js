import { defineConfig } from 'vite';

/**
 * Vite configuration.
 *
 * The app is a static, dependency-free single page. In development Vite serves
 * `index.html` directly; `vite build` bundles the ES modules and CSS referenced
 * from `index.html` into a hashed, minified `dist/`.
 *
 * Note: the source also runs as native ES modules without bundling (all imports
 * are relative with explicit extensions), so the site can be deployed straight
 * from source if a build step is not desired.
 */
export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: true,
  },
  server: {
    open: true,
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
