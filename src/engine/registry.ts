/**
 * Lamplighter — story registry / auto-discovery.
 *
 * Uses Vite's `import.meta.glob` to find every story folder under /stories,
 * parse its script, and resolve manifest asset references to real bundled URLs
 * by filename convention. Unmatched assets are simply left out — subsystems are
 * responsible for tasteful procedural placeholders, so the app runs before any
 * art exists. Folders whose name starts with `_` (e.g. `_template`) are skipped.
 *
 * Two discovery paths, merged. `discoverBundledStories` is the original,
 * build-time path: `import.meta.glob` freezes whatever was on disk when Vite
 * last (re)scanned. `fetchRuntimeStories` is new — dev/preview only, reading
 * `/api/stories` (src/server/stories.ts), which walks the real disk at
 * REQUEST time. The runtime path is what makes a story generated this session
 * (src/ui/CreateStory.ts) show up at all without a full page rebuild, and what
 * makes a story hand-edited since the page loaded come back correct rather
 * than stale. It is also entirely optional: on a static `dist/` deploy there
 * is no server behind `/api/stories`, `fetchRuntimeStories` resolves to `[]`,
 * and `discoverStories()` is byte-for-byte what it was before this feature
 * existed. See docs/superpowers/specs/2026-08-18-storygen-design.md §11.
 */

import type {
  AssetTable,
  AudioDef,
  BackgroundDef,
  CgDef,
  CharacterDef,
  CharacterPose,
  ResolvedBackground,
  StoryBundle,
  StoryManifest,
} from '../core/types';
// Type-only — erased at emit, and types.ts itself has no Node dependency (see
// its own doc comment), so this does not pull anything server-side into the
// browser bundle. See src/engine/index.ts and tsconfig.json §3.4.
import type { RuntimeStoryRecord, StoriesResponse } from '../server/types';
import { parse } from './parser';

const IMG_EXT = ['png', 'jpg', 'jpeg', 'webp'];
const AUD_EXT = ['mp3', 'ogg', 'wav'];

/**
 * Build a load-ready AssetTable from a manifest and a map of discovered URLs.
 * `urlMap` keys may be absolute (`/stories/<id>/assets/...`) or already relative
 * (`assets/...`); both are normalized. Pure and side-effect-free (testable).
 */
export function buildAssetTable(manifest: StoryManifest, urlMap: Record<string, string>): AssetTable {
  // Normalize every key so it starts at "assets/...".
  const lookup: Record<string, string> = {};
  for (const [key, url] of Object.entries(urlMap)) {
    const idx = key.indexOf('/assets/');
    const rel = idx >= 0 ? key.slice(idx + 1) : key.startsWith('assets/') ? key : key.replace(/^\/+/, '');
    lookup[rel] = url;
  }

  const withExt = (base: string, exts: string[]): string | undefined => {
    for (const e of exts) {
      const u = lookup[`${base}.${e}`];
      if (u) return u;
    }
    return undefined;
  };
  /** Resolve a path that may or may not already carry a file extension. */
  const resolve = (path: string, exts: string[]): string | undefined => {
    const direct = lookup[path];
    if (direct) return direct;
    if (!/\.[A-Za-z0-9]+$/.test(path)) return withExt(path, exts);
    return undefined;
  };
  const collectLayers = (base: string): string[] => {
    const out: string[] = [];
    for (let i = 0; i < 8; i++) {
      const u = withExt(`${base}.${i}`, IMG_EXT);
      if (!u) break;
      out.push(u);
    }
    return out;
  };

  /* ── backgrounds ── */
  const backgrounds: Record<string, ResolvedBackground> = {};
  for (const [bgId, rawDef] of Object.entries(manifest.backgrounds ?? {})) {
    const def = rawDef as BackgroundDef;
    const dir = 'assets/backgrounds';
    let layers: string[] = [];
    if (def.files && def.files.length) {
      for (const f of def.files) {
        const u = resolve(`${dir}/${f}`, IMG_EXT);
        if (u) layers.push(u);
      }
    } else if (def.file) {
      const u = resolve(`${dir}/${def.file}`, IMG_EXT);
      if (u) layers.push(u);
    } else {
      const single = withExt(`${dir}/${bgId}`, IMG_EXT);
      layers = single ? [single] : collectLayers(`${dir}/${bgId}`);
    }
    backgrounds[bgId] = {
      id: bgId,
      layers,
      parallax: def.parallax ?? 0.04,
      focus: def.focus ?? 0.5,
    };
  }

  /* ── characters ── */
  const characters: Record<string, Record<string, string>> = {};
  for (const [charKey, rawDef] of Object.entries(manifest.characters ?? {})) {
    const def = rawDef as CharacterDef;
    const map: Record<string, string> = {};
    for (const [pose, rawPose] of Object.entries(def.poses ?? {})) {
      const pdef = rawPose as CharacterPose;
      let url: string | undefined;
      if (pdef.file) url = resolve(`assets/characters/${pdef.file}`, IMG_EXT);
      if (!url) url = withExt(`assets/characters/${charKey}/${pose}`, IMG_EXT);
      if (!url) url = withExt(`assets/characters/${charKey}_${pose}`, IMG_EXT);
      if (url) map[pose] = url;
    }
    characters[charKey] = map;
  }

  /* ── cg ── */
  const cg: Record<string, string> = {};
  for (const [key, rawDef] of Object.entries(manifest.cg ?? {})) {
    const def = rawDef as CgDef;
    let url: string | undefined;
    if (def.file) url = resolve(`assets/cg/${def.file}`, IMG_EXT);
    if (!url) url = withExt(`assets/cg/${key}`, IMG_EXT);
    if (url) cg[key] = url;
  }

  /* ── audio groups ── */
  const buildAudio = (group?: Record<string, AudioDef>): Record<string, { url?: string; def: AudioDef }> => {
    const out: Record<string, { url?: string; def: AudioDef }> = {};
    for (const [id, rawDef] of Object.entries(group ?? {})) {
      const def = rawDef as AudioDef;
      let url: string | undefined;
      if (def.file) url = resolve(`assets/audio/${def.file}`, AUD_EXT);
      if (!url) url = withExt(`assets/audio/${id}`, AUD_EXT);
      out[id] = url ? { url, def } : { def };
    }
    return out;
  };

  return {
    backgrounds,
    characters,
    cg,
    music: buildAudio(manifest.music),
    sfx: buildAudio(manifest.sfx),
    ambience: buildAudio(manifest.ambience),
  };
}

/**
 * Manifest + raw script + a discovered-URL map -> a load-ready bundle. Both
 * discovery paths below end here, which is what guarantees a runtime story
 * and a bundled one are parsed by the exact same function — the same one the
 * server validated the script with (src/server/validate.ts imports the same
 * parser, never `engine/index.ts`; see design doc §2) — so a story cannot
 * come out parsed differently depending on which path found it.
 */
export function buildBundle(manifest: StoryManifest, src: string, urlMap: Record<string, string>): StoryBundle {
  return { manifest, script: parse(src), assets: buildAssetTable(manifest, urlMap) };
}

/**
 * Discover every story bundled under /stories at build time. Returns bundles
 * sorted by manifest title. Unchanged behaviour from before this feature —
 * `import.meta.glob` freezes whatever was on disk when Vite last (re)scanned,
 * which is exactly what a static `dist/` needs and all it can ever have.
 */
export function discoverBundledStories(): StoryBundle[] {
  const manifests = import.meta.glob('/stories/*/manifest.json', {
    eager: true,
    import: 'default',
  }) as unknown as Record<string, StoryManifest>;
  const scripts = import.meta.glob('/stories/*/story.pq', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as unknown as Record<string, string>;
  const images = import.meta.glob('/stories/*/assets/**/*.{png,jpg,jpeg,webp}', {
    eager: true,
    query: '?url',
    import: 'default',
  }) as unknown as Record<string, string>;
  const audio = import.meta.glob('/stories/*/assets/**/*.{mp3,ogg,wav}', {
    eager: true,
    query: '?url',
    import: 'default',
  }) as unknown as Record<string, string>;

  const bundles: StoryBundle[] = [];
  for (const [manifestPath, manifest] of Object.entries(manifests)) {
    const m = manifestPath.match(/^\/stories\/([^/]+)\/manifest\.json$/);
    if (!m) continue;
    const id = m[1];
    if (id.startsWith('_')) continue;

    const src = scripts[`/stories/${id}/story.pq`];
    if (typeof src !== 'string') continue;

    const prefix = `/stories/${id}/`;
    const urlMap: Record<string, string> = {};
    for (const [p, u] of Object.entries(images)) if (p.startsWith(prefix)) urlMap[p] = u;
    for (const [p, u] of Object.entries(audio)) if (p.startsWith(prefix)) urlMap[p] = u;

    bundles.push(buildBundle(manifest, src, urlMap));
  }

  bundles.sort((a, b) => (a.manifest.title ?? '').localeCompare(b.manifest.title ?? ''));
  return bundles;
}

/** How long fetchRuntimeStories waits before giving up and reporting "no server". */
const RUNTIME_STORIES_TIMEOUT_MS = 2500;

/** One runtime record -> a bundle, with the ?v=mtime cache-buster on every asset URL. */
function buildRuntimeBundle(rec: RuntimeStoryRecord): StoryBundle {
  const urlMap: Record<string, string> = {};
  for (const f of rec.assets) {
    // The key stays a clean relative path (buildAssetTable normalizes it via
    // its own /assets/ split); the value carries the cache-buster. This is
    // not decoration: art can arrive AFTER a story is first discovered (the
    // art job keeps running after "ready" — see CreateStory's "Begin now"),
    // and a regenerated asset lands at the exact same path. Without a
    // buster the browser — or an intermediary — would happily keep serving
    // the previous bytes (or the 404 it cached for a not-yet-painted one)
    // forever. See design doc §11.
    urlMap[f.path] = `/stories/${rec.id}/${f.path}?v=${f.mtime}`;
  }
  return buildBundle(rec.manifest, rec.script, urlMap);
}

/**
 * Runtime, dev+preview only. Resolves to `[]` on ANY failure — 404 (no
 * plugin mounted, i.e. a static `dist/`), a network error, a timeout, a
 * non-JSON body, or a contract-version mismatch — and never logs one. A
 * static deployment is not a fault condition; see design doc §11 and §16.
 */
export async function fetchRuntimeStories(o?: { timeoutMs?: number }): Promise<StoryBundle[]> {
  try {
    const res = await fetch('/api/stories', {
      signal: AbortSignal.timeout(o?.timeoutMs ?? RUNTIME_STORIES_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as Partial<StoriesResponse>;
    if (body.api !== '1.0' || !Array.isArray(body.stories)) return [];

    const bundles: StoryBundle[] = [];
    for (const rec of body.stories) {
      try {
        bundles.push(buildRuntimeBundle(rec));
      } catch {
        // The server already skips a directory missing story.pq/manifest.json
        // (design doc §4.2) — this only guards against a genuinely malformed
        // record still reaching here (a stale cache, a future field slipping
        // out of sync). One bad record must not blank the whole merge.
      }
    }
    return bundles;
  } catch {
    return [];
  }
}

/**
 * Bundled first, runtime overwrites by id, sorted by title.
 *
 * Runtime wins deliberately. In dev a story created this session is
 * discovered TWICE — `import.meta.glob` re-evaluates on the next full
 * reload, and `/api/stories` reads the disk right now — and the runtime
 * record is the one actually read from disk at request time, so it is the
 * one that is correct if the story has been hand-edited since the page
 * first loaded.
 */
export function mergeStories(bundled: StoryBundle[], runtime: StoryBundle[]): StoryBundle[] {
  const byId = new Map<string, StoryBundle>();
  for (const b of bundled) byId.set(b.manifest.id, b);
  for (const r of runtime) byId.set(r.manifest.id, r);
  const merged = [...byId.values()];
  merged.sort((a, b) => (a.manifest.title ?? '').localeCompare(b.manifest.title ?? ''));
  return merged;
}

/**
 * Unchanged signature — every existing caller (main.ts) keeps working
 * untouched. Now: merge(bundled, await runtime), run in parallel since
 * neither depends on the other's result.
 */
export async function discoverStories(): Promise<StoryBundle[]> {
  const [bundled, runtime] = await Promise.all([discoverBundledStories(), fetchRuntimeStories()]);
  return mergeStories(bundled, runtime);
}
