import { defineConfig } from 'vite';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// The audio files in public/audio (uploaded from Suno: docs/AUDIO_CUES.md),
// listed at build time as `virtual:audio-files`, so the game only asks for
// files that are there and plays its synthesised placeholder for the rest.
const AUDIO_DIR = 'public/audio';
const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|aac|flac)$/i;
function listAudio(dir = AUDIO_DIR) {
  let out = [];
  let names = [];
  try { names = readdirSync(dir); } catch { return out; }
  for (const n of names) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out = out.concat(listAudio(p));
    else if (AUDIO_EXT.test(n)) out.push(relative(AUDIO_DIR, p).split('\\').join('/'));
  }
  return out.sort();
}
function audioFiles() {
  const id = 'virtual:audio-files';
  return {
    name: 'audio-files',
    resolveId: (s) => (s === id ? '\0' + id : null),
    load: (s) => (s === '\0' + id ? `export default ${JSON.stringify(listAudio())};` : null),
  };
}

// GitHub Pages serves this repo at https://<user>.github.io/WitchHunt/,
// so production builds (and `vite preview` of them) need that base path.
// The dev server stays at '/'.
const REPO_BASE = '/WitchHunt/';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [audioFiles()],
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
