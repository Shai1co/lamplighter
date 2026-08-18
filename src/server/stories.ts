/**
 * Lamplighter — the stories/ disk walk behind GET /api/stories, and the
 * "hidden directory" rule shared with static.ts's confinement check.
 *
 * A directory missing either story.pq or manifest.json, or whose manifest is
 * not JSON, is skipped with a one-line server warning rather than failing
 * the whole response — one broken folder must not blank the picker.
 */

import { constants as fsConstants, promises as fs } from 'node:fs';
import path from 'node:path';
import type { StoryManifest } from '../core/types';
import type { RuntimeAssetFile, RuntimeStoryRecord } from './types';

const ASSET_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'mp3', 'ogg', 'wav']);
const ASSET_WALK_MAX_DEPTH = 4;
const ASSET_WALK_MAX_FILES = 400;

/**
 * The same rule registry.ts already applies at build time via
 * `import.meta.glob` (implicitly, by never matching a `_`-prefixed path) —
 * so the runtime surface and the build-time surface describe the same
 * library. `_template` therefore has no runtime surface either.
 */
export function isHiddenName(name: string): boolean {
  return name.startsWith('_') || name.startsWith('.');
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function isStoriesDirWritable(storiesDir: string): Promise<boolean> {
  try {
    await fs.mkdir(storiesDir, { recursive: true });
    await fs.access(storiesDir, fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function walkAssets(dir: string, base: string, depth: number, out: RuntimeAssetFile[]): Promise<void> {
  if (depth > ASSET_WALK_MAX_DEPTH || out.length >= ASSET_WALK_MAX_FILES) return;
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (out.length >= ASSET_WALK_MAX_FILES) return;
    if (isHiddenName(e.name)) continue;
    const abs = path.join(dir, e.name);
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      await walkAssets(abs, rel, depth + 1, out);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).slice(1).toLowerCase();
      if (!ASSET_EXTENSIONS.has(ext)) continue;
      try {
        const st = await fs.stat(abs);
        out.push({ path: `assets/${rel}`, mtime: st.mtimeMs, size: st.size });
      } catch {
        /* races with a concurrent write (e.g. an art job) — the next poll picks it up */
      }
    }
  }
}

export async function readStoryRecord(storiesDir: string, id: string): Promise<RuntimeStoryRecord | null> {
  const dir = path.join(storiesDir, id);
  const manifestPath = path.join(dir, 'manifest.json');
  const scriptPath = path.join(dir, 'story.pq');
  if (!(await exists(manifestPath)) || !(await exists(scriptPath))) return null;

  try {
    const [manifestRaw, scriptRaw, manifestStat, scriptStat, generated] = await Promise.all([
      fs.readFile(manifestPath, 'utf8'),
      fs.readFile(scriptPath, 'utf8'),
      fs.stat(manifestPath),
      fs.stat(scriptPath),
      exists(path.join(dir, 'generation.json')),
    ]);
    const manifest = JSON.parse(manifestRaw) as StoryManifest;
    const assets: RuntimeAssetFile[] = [];
    await walkAssets(path.join(dir, 'assets'), '', 0, assets);
    return {
      id,
      manifest,
      script: scriptRaw,
      assets,
      generated,
      updatedAt: Math.max(manifestStat.mtimeMs, scriptStat.mtimeMs),
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[storygen] skipping stories/${id}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function listStories(storiesDir: string): Promise<RuntimeStoryRecord[]> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(storiesDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const records: RuntimeStoryRecord[] = [];
  for (const e of entries) {
    if (!e.isDirectory() || isHiddenName(e.name)) continue;
    const rec = await readStoryRecord(storiesDir, e.name);
    if (rec) records.push(rec);
  }
  records.sort((a, b) => (a.manifest.title ?? '').localeCompare(b.manifest.title ?? ''));
  return records;
}
