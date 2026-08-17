import { defineConfig } from 'vite';

// Picture Quest — Vite config.
// Stories live in /stories and are auto-discovered at runtime via import.meta.glob.
// Shaders are authored as TS template literals (no glsl plugin needed).
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: false,
    fs: {
      // Allow importing story assets that live outside /src.
      allow: ['..', '.'],
    },
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
  assetsInclude: ['**/*.mp3', '**/*.wav', '**/*.ogg'],
});
