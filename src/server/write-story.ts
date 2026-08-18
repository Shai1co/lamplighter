/**
 * Lamplighter — writes a validated envelope to stories/<id>/ (design doc §9).
 *
 * Everything is written to a staging directory first, then moved into place
 * with one atomic `fs.rename`. This matters more than it looks: Vite's
 * watcher and our own `/api/stories` walker both scan `stories/`
 * continuously, and a directory that exists for 40ms with a manifest.json
 * and no story.pq yet is a story that appears broken in the picker. The `_`
 * prefix on the staging dir name means it is invisible to both discovery
 * paths (see stories.ts#isHiddenName) for its whole short life, and rename
 * within one filesystem is atomic.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { redact } from './net';
import type { ServerContext } from './storygen-plugin';
import type { ProviderId, StoryLength } from './types';
import type { StoryEnvelope } from './validate';

export interface WriteResult {
  id: string;
  dir: string;
  renamedFrom?: string;
}

export interface GenerationMeta {
  schema: 1;
  createdAt: string; // ISO
  prompt: string; // the user's premise, verbatim
  title?: string;
  length: StoryLength;
  provider: ProviderId;
  model: string;
  promptVersion: string;
  durationMs: number;
  attempts: Array<{ index: number; ok: boolean; issues: string[] }>; // codes only
  warnings: string[];
  art: {
    requested: boolean;
    backend: 'gemini' | 'mock' | 'none';
    imageModel?: string;
    state: 'off' | 'running' | 'done' | 'partial' | 'failed';
    assets: Array<{ path: string; state: 'ok' | 'skip' | 'fail'; error?: string }>;
  };
}

const RESERVED_IDS = new Set(['', '_template', 'assets', 'node_modules']);
const VALID_ID = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

function isReserved(id: string): boolean {
  return RESERVED_IDS.has(id) || id.startsWith('_') || id.startsWith('.');
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function idConflict(message: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = 'id_conflict';
  return err;
}

function diskError(message: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = 'disk';
  return err;
}

/** rawId → itself if free, else `-2`..`-99`. Reserved ids fail immediately (no suffix attempt). */
async function resolveTargetId(storiesDir: string, rawId: string): Promise<string> {
  if (isReserved(rawId)) throw idConflict(`"${rawId}" is a reserved story id.`);
  for (let n = 1; n <= 99; n++) {
    const candidate = n === 1 ? rawId : `${rawId}-${n}`.slice(0, 40);
    if (isReserved(candidate)) continue; // pathological, but stay defensive
    if (!(await exists(path.join(storiesDir, candidate)))) return candidate;
  }
  throw idConflict(`Every id from "${rawId}" through "${rawId}-99" is already taken.`);
}

function normalizeScript(script: string): string {
  const lf = script.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return `${lf.replace(/\n+$/, '')}\n`;
}

/** Provenance passes through the same redaction as every other server error path. */
function redactMeta(meta: GenerationMeta): GenerationMeta {
  return JSON.parse(redact(JSON.stringify(meta))) as GenerationMeta;
}

/** The .gitkeep skeleton, matching tools/new-story.mjs's asset folders — one
 *  subdirectory per DECLARED character, since that is where registry.ts's
 *  buildAssetTable actually resolves pose art (`assets/characters/<char>/<pose>`). */
async function writeAssetSkeleton(dir: string, manifest: StoryEnvelope['manifest']): Promise<void> {
  const mkKept = async (rel: string): Promise<void> => {
    const d = path.join(dir, 'assets', rel);
    await fs.mkdir(d, { recursive: true });
    await fs.writeFile(path.join(d, '.gitkeep'), '', 'utf8');
  };
  await mkKept('backgrounds');
  await mkKept('cg');
  await mkKept('audio');
  for (const charKey of Object.keys(manifest.characters ?? {})) await mkKept(`characters/${charKey}`);
}

export async function writeStory(ctx: ServerContext, env: StoryEnvelope, meta: GenerationMeta): Promise<WriteResult> {
  if (typeof env.manifest.id !== 'string' || !VALID_ID.test(env.manifest.id)) {
    // Should be unreachable — only a validate.ts `ok:true` envelope ever
    // reaches here, and that already guarantees a well-formed id. Kept as a
    // cheap assertion rather than trusting the contract silently.
    throw diskError(`writeStory received a manifest with an invalid id: "${String(env.manifest.id)}".`);
  }

  let id = await resolveTargetId(ctx.storiesDir, env.manifest.id);
  env.manifest.id = id; // folder name and manifest.id can never disagree

  const stagingDir = path.join(ctx.storiesDir, `_gen-${id}-${Math.random().toString(36).slice(2, 8)}`);
  try {
    await fs.mkdir(stagingDir, { recursive: true });
    await fs.writeFile(path.join(stagingDir, 'story.pq'), normalizeScript(env.script), 'utf8');
    await fs.writeFile(path.join(stagingDir, 'manifest.json'), `${JSON.stringify(env.manifest, null, 2)}\n`, 'utf8');
    await fs.writeFile(path.join(stagingDir, 'generation.json'), `${JSON.stringify(redactMeta(meta), null, 2)}\n`, 'utf8');
    await writeAssetSkeleton(stagingDir, env.manifest);

    let finalDir = path.join(ctx.storiesDir, id);
    try {
      await fs.rename(stagingDir, finalDir);
      return { id, dir: finalDir };
    } catch (renameErr) {
      // A racing second job could win the same id between resolveTargetId and
      // here. Retry id resolution exactly once, then report id_conflict.
      const retryId = await resolveTargetId(ctx.storiesDir, id);
      if (retryId === id) {
        throw diskError(`Could not move the staged story into place: ${renameErr instanceof Error ? renameErr.message : String(renameErr)}`);
      }
      env.manifest.id = retryId;
      await fs.writeFile(path.join(stagingDir, 'manifest.json'), `${JSON.stringify(env.manifest, null, 2)}\n`, 'utf8');
      finalDir = path.join(ctx.storiesDir, retryId);
      try {
        await fs.rename(stagingDir, finalDir);
      } catch {
        throw idConflict(`Could not claim either "${id}" or "${retryId}" — another job won the race twice.`);
      }
      return { id: retryId, dir: finalDir, renamedFrom: id };
    }
  } catch (err) {
    await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    if (err instanceof Error && 'code' in err && ((err as { code?: unknown }).code === 'id_conflict' || (err as { code?: unknown }).code === 'disk')) {
      throw err;
    }
    throw diskError(`Failed to write story: ${err instanceof Error ? err.message : String(err)}`);
  }
}
