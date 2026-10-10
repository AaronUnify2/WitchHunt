import { defineConfig } from 'vite';

// GitHub Pages serves this repo at https://<user>.github.io/WitchHunt/,
// so production builds (and `vite preview` of them) need that base path.
// The dev server stays at '/'.
const REPO_BASE = '/WitchHunt/';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? REPO_BASE : '/',
  server: {
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // three.js alone is ~550 kB minified; that's expected, not a problem.
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
}));
