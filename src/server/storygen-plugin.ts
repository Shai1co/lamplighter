/**
 * Lamplighter — the Vite plugin: builds the server context once, mounts the
 * same handler list on both `vite dev` and `vite preview` (design doc §3.1).
 *
 * Registering via the direct `configureServer(server) { ... }` form (rather
 * than returning a function from it) matters for `/stories/**`: it runs
 * BEFORE Vite's own internal middleware, so our handler is the only thing
 * that ever answers a /stories/ URL, in dev and preview alike — one code
 * path, one traversal policy, one set of headers, in both modes.
 *
 * `apply: () => true` is required: a plugin defaults to `serve` + `build`,
 * and `configurePreviewServer` only fires for `vite preview`, which Vite
 * classifies separately from both of those.
 */

import type { Connect, Plugin, ResolvedConfig } from 'vite';
import { allSecrets, createEnv, resolveStoriesDir } from './env';
import type { Env } from './env';
import { probeProxy, proxyHint, registerSecret } from './net';
import type { NetProbe } from './net';
import { buildHandlers } from './router';
import { JobRegistry } from './sse';

export interface StorygenOptions {
  /** Result of vite loadEnv(mode, cwd, ''). Merged under process.env (real env wins). */
  env: Record<string, string>;
  /** Absolute stories root. Default <viteRoot>/stories. Overridable for tests. */
  storiesDir?: string;
}

/** Everything a request handler needs, built once at `configResolved` and shared by every route. */
export interface ServerContext {
  root: string;
  storiesDir: string;
  env: Env;
  jobs: JobRegistry;
  /** Computed once at startup; reused by /api/health rather than re-probed per request. */
  proxy: NetProbe;
}

function createContext(root: string, opts: StorygenOptions): ServerContext {
  const env = createEnv(opts.env);
  for (const secret of allSecrets(env)) registerSecret(secret);

  const storiesDir = opts.storiesDir ?? resolveStoriesDir(env, root);
  const proxy = probeProxy(env);
  if (proxy.proxy && !proxy.honored) {
    // The single most likely first-run failure, and the least diagnosable —
    // logged once here rather than discovered forty seconds into a hung
    // provider call.
    // eslint-disable-next-line no-console
    console.warn(`[storygen] ${proxyHint(proxy)}`);
  }
  return { root, storiesDir, env, jobs: new JobRegistry(), proxy };
}

export function storygen(opts: StorygenOptions): Plugin {
  let ctx: ServerContext;
  const mount = (mw: Connect.Server): void => {
    for (const h of buildHandlers(ctx)) mw.use(h);
  };

  return {
    name: 'lamplighter:storygen',
    apply: () => true, // dev + preview; a no-op in `vite build`
    configResolved(cfg: ResolvedConfig) {
      ctx = createContext(cfg.root, opts);
    },
    configureServer(server) {
      mount(server.middlewares);
      // Jobs are in-memory and session-scoped. Dispose them when the HTTP
      // server itself closes rather than relying on the plugin's `buildEnd`
      // hook — that only fires for a build, and `vite dev`'s server doesn't
      // go through a build lifecycle at all. Jobs also simply die with the
      // process either way, so this is a courtesy cleanup, not a
      // correctness requirement.
      server.httpServer?.once('close', () => ctx.jobs.dispose());
    },
    configurePreviewServer(server) {
      mount(server.middlewares);
      server.httpServer?.once('close', () => ctx.jobs.dispose());
    },
  };
}
