/**
 * Picture Quest — story registry / auto-discovery.
 *
 * Uses Vite's `import.meta.glob` to find every story folder under /stories,
 * parse its script, and resolve manifest asset references to real bundled URLs
 * by filename convention. Unmatched assets are simply left out — subsystems are
 * responsible for tasteful procedural placeholders, so the app runs before any
 * art exists. Folders whose name starts with `_` (e.g. `_template`) are skipped.
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
 * Discover every story bundled under /stories at build time.
 * Returns bundles sorted by manifest title.
 */
export async function discoverStories(): Promise<StoryBundle[]> {
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

    const script = parse(src);
    const prefix = `/stories/${id}/`;
    const urlMap: Record<string, string> = {};
    for (const [p, u] of Object.entries(images)) if (p.startsWith(prefix)) urlMap[p] = u;
    for (const [p, u] of Object.entries(audio)) if (p.startsWith(prefix)) urlMap[p] = u;

    bundles.push({ manifest, script, assets: buildAssetTable(manifest, urlMap) });
  }

  bundles.sort((a, b) => (a.manifest.title ?? '').localeCompare(b.manifest.title ?? ''));
  return bundles;
}
