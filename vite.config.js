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
    // three.js plus its post-processing add-ons is ~800 kB minified
    // (~210 kB gzipped); that's expected, not a problem.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Some tests build whole maps (3-5 s each on a busy CI runner): 5 s
    // timed out the deploys after Session 14.
    testTimeout: 30000,
  },
}));
