import { defineConfig, loadEnv } from 'vite';
import { storygen } from './src/server/storygen-plugin';

// Lamplighter — Vite config.
// Stories live in /stories and are auto-discovered at runtime via import.meta.glob,
// and (in dev/preview) via the storygen plugin's /api/stories walk of the same
// directory — see src/server/storygen-plugin.ts and docs/superpowers/specs/
// 2026-08-18-storygen-design.md §3.
export default defineConfig(({ mode }) => ({
  base: './',
  // Empty prefix: loadEnv normally only surfaces VITE_*-prefixed keys, and every
  // key this feature needs is deliberately UN-prefixed so it can never be reached
  // by `import.meta.env` from browser code. The object is handed to the plugin and
  // nowhere else — it is never spread into `define`, and never into process.env.
  plugins: [storygen({ env: loadEnv(mode, process.cwd(), '') })],
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
}));
