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
    watch: {
      // `discoverBundledStories()` (src/engine/registry.ts) reads /stories
      // via `import.meta.glob({ eager: true, ... })`, which — pre-existing
      // behaviour, unrelated to StoryGen — makes every file under /stories
      // a dependency of that glob for Vite's OWN dev-server watcher: add or
      // remove a file there and Vite pushes an unsolicited full-page reload
      // to every open tab, on the theory that the eagerly-imported map
      // needs to change.
      //
      // That is exactly wrong once a story can be written from inside a
      // running page (CreateStory.ts): the moment write-story.ts finishes
      // staging + renaming a new story into place, this fires, and it wins
      // the race against the SAME job's own SSE stream delivering `ready`/
      // `done` back to the Create panel — the tab reloads out from under
      // the in-progress generation before the user ever sees a result,
      // discarding a story the pipeline had already finished writing
      // successfully. Confirmed by hand: without this exclusion, `stories/`
      // gains a fresh folder and the open tab reloads within the same
      // second, aborting the in-flight fetch (net::ERR_ABORTED) — every
      // time.
      //
      // Excluding /stories from the watcher does not cost the feature
      // anything: a FRESH navigation — a manual refresh, or the "Begin"
      // handshake's own `location.reload()` (main.ts, adoptStory) — always
      // re-evaluates `import.meta.glob` from current disk state regardless
      // of watcher history, and a story that shows up while a tab stays
      // open is already covered by the RUNTIME path (`/api/stories`,
      // polled deliberately — see fetchRuntimeStories) rather than by an
      // uncontrolled live-reload of the whole page.
      ignored: ['**/stories/**'],
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
