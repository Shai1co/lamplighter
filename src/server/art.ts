/**
 * Lamplighter — the art job (design doc §10.3).
 *
 * Reads the manifest fresh from DISK (never from the in-memory envelope the
 * pipeline just validated) so a hand-edited manifest is honoured, plans the
 * image jobs with the exact same `tools/lib/asset-plan.mjs` the CLI uses,
 * drives the configured backend ONE IMAGE AT A TIME, emits an `asset` event
 * before and after each, continues past individual failures, and rewrites
 * `generation.json`'s `art` block when it finishes.
 *
 * This file owns no HTTP/SSE envelope of its own (no `hello`/`stage`/`ready`/
 * `done`) — it only emits `asset` events on the `Job` it is handed and
 * returns a summary. The caller (pipeline.ts for a story's own art, or
 * router.ts's `/api/generate-assets` handler for a standalone re-paint)
 * decides what wraps it.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { geminiImageModel, geminiKey, resolveImageBackend } from './env';
import type { Env } from './env';
import { redact } from './net';
import type { Job } from './sse';
import type { ServerContext } from './storygen-plugin';
import type { EvAsset } from './types';
import type { GenerationMeta } from './write-story';
// tools/lib is plain, dependency-free ESM shared with tools/gen-assets.mjs
// (design doc §10.1) — `tools/` is excluded from both tsconfig projects, but
// that only filters the INITIAL file set; TypeScript still follows this
// relative import and typechecks against the sibling `.d.mts` files.
import { composeGeminiPrompt, planAssets } from '../../tools/lib/asset-plan.mjs';
import type { AssetJob } from '../../tools/lib/asset-plan.mjs';
import { generateImage } from '../../tools/lib/gemini-image.mjs';

export interface ArtOptions {
  storyId: string;
  only?: 'backgrounds' | 'characters' | 'cg';
  force?: boolean;
}

export interface ArtSummary {
  generated: number;
  skipped: number;
  failed: number;
  assets: Array<{ path: string; state: 'ok' | 'skip' | 'fail'; error?: string }>;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * `STORYGEN_MOCK_ART_DELAY_MS` — MOCK IMAGE BACKEND ONLY. An artificial
 * per-asset delay in milliseconds so a test can start a generate-story run,
 * disconnect mid-art, and still have something to observe finishing in the
 * background (design doc §14.1 scenario E depends on the art job outliving
 * an instant mock making that unobservable). Never read by the gemini path.
 * Clamped to a sane ceiling so a typo can't hang a job for an hour.
 */
function mockArtDelayMs(env: Env): number {
  const n = Number(env.STORYGEN_MOCK_ART_DELAY_MS ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 60_000) : 0;
}

/** Resolves once `ms` has elapsed OR `signal` aborts, whichever comes first — so cancellation is never stuck behind a mock sleep. */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * The 1x1 PNG the mock backend writes, encoded by hand with Node's builtin
 * `zlib` (deflate + the same CRC32 the PNG spec requires) rather than a
 * hard-coded base64 blob, so it is verifiably a real, valid PNG rather than
 * a string that merely looks like one.
 */
async function writeTinyPng(outPath: string): Promise<number> {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = zlib.crc32(Buffer.concat([typeBuf, data])) >>> 0;
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0); // width
  ihdrData.writeUInt32BE(1, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk('IHDR', ihdrData);
  const raw = Buffer.from([0, 0x3c, 0x46, 0x5a]); // filter byte 0 + one RGB pixel
  const idat = chunk('IDAT', zlib.deflateSync(raw));
  const iend = chunk('IEND', Buffer.alloc(0));
  const png = Buffer.concat([sig, ihdr, idat, iend]);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const partPath = `${outPath}.part`;
  await fs.writeFile(partPath, png);
  await fs.rename(partPath, outPath);
  return png.length;
}

type AssetOutcome = { ok: true } | { ok: false; reason: string };

async function runOneAsset(
  env: Env,
  backend: 'gemini' | 'mock' | 'none',
  job: AssetJob,
  outPath: string,
  signal: AbortSignal,
): Promise<AssetOutcome> {
  if (backend === 'mock') {
    await delay(mockArtDelayMs(env), signal);
    try {
      await writeTinyPng(outPath);
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }

  if (backend === 'gemini') {
    const apiKey = geminiKey(env);
    if (!apiKey) return { ok: false, reason: 'GEMINI_KEY is not configured.' };
    // Aspect follows ASPECT in asset-plan.mjs: backgrounds and cg 16:9,
    // character poses 3:4 (design doc §10.3).
    const aspect: '16:9' | '3:4' = job.kind === 'characters' ? '3:4' : '16:9';
    const result = await generateImage({
      apiKey,
      model: geminiImageModel(env),
      prompt: composeGeminiPrompt(job),
      aspect,
      outPath,
      signal,
    });
    return result.ok ? { ok: true } : { ok: false, reason: redact(result.reason) };
  }

  return { ok: false, reason: 'No image backend is configured. Set GEMINI_KEY, or STORYGEN_IMAGE_BACKEND=mock.' };
}

/** Reads generation.json, rewrites its `art` block, and writes it back — UNLESS the story never had one (a hand-authored story), in which case nothing is written (design doc §9/§10.3). */
async function updateGenerationArt(storyDir: string, art: GenerationMeta['art']): Promise<void> {
  const genPath = path.join(storyDir, 'generation.json');
  let raw: string;
  try {
    raw = await fs.readFile(genPath, 'utf8');
  } catch {
    return; // no generation.json — hand-authored story; do not create one
  }
  let meta: GenerationMeta;
  try {
    meta = JSON.parse(raw) as GenerationMeta;
  } catch (err) {
    // Same "warn once, skip, never crash the caller" rule stories.ts applies
    // to a broken manifest — leave a hand-edited-into-invalid-JSON file alone
    // rather than clobber it.
    // eslint-disable-next-line no-console
    console.warn(`[storygen] could not update ${genPath}: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  meta.art = art;
  // Same redaction pass write-story.ts applies before every generation.json write.
  const redacted = JSON.parse(redact(JSON.stringify(meta))) as GenerationMeta;
  await fs.writeFile(genPath, `${JSON.stringify(redacted, null, 2)}\n`, 'utf8');
}

export async function runArt(ctx: ServerContext, job: Job, o: ArtOptions): Promise<ArtSummary> {
  const storyDir = path.join(ctx.storiesDir, o.storyId);
  const manifestRaw = await fs.readFile(path.join(storyDir, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;

  const backend = resolveImageBackend(ctx.env);
  const planned = planAssets(manifest, { only: o.only ?? null, storyId: o.storyId });
  const total = planned.length;

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const assetsOut: ArtSummary['assets'] = [];

  for (let i = 0; i < total; i++) {
    // Honour the job's abort signal BETWEEN assets — an in-flight request is
    // allowed to finish or fail on its own, but no new one is started once
    // cancellation has been requested (design doc §10.3).
    if (job.controller.signal.aborted) break;

    const asset = planned[i];
    const index = i + 1;
    const relPath = `${asset.targetDir}/${asset.filename}`;
    const outPath = path.join(storyDir, asset.targetDir, asset.filename);

    if (!o.force && (await exists(outPath))) {
      job.emit('asset', { index, total, label: asset.label, path: relPath, state: 'skip' } satisfies EvAsset);
      skipped++;
      assetsOut.push({ path: relPath, state: 'skip' });
      continue;
    }

    job.emit('asset', { index, total, label: asset.label, path: relPath, state: 'start' } satisfies EvAsset);
    const outcome = await runOneAsset(ctx.env, backend, asset, outPath, job.controller.signal);

    if (outcome.ok) {
      job.emit('asset', { index, total, label: asset.label, path: relPath, state: 'ok' } satisfies EvAsset);
      generated++;
      assetsOut.push({ path: relPath, state: 'ok' });
    } else {
      const error = redact(outcome.reason);
      job.emit('asset', { index, total, label: asset.label, path: relPath, state: 'fail', error } satisfies EvAsset);
      failed++;
      assetsOut.push({ path: relPath, state: 'fail', error });
    }
  }

  // 'failed' is reserved for a run that attempted EVERY planned asset and
  // got nothing (no ok, no skip) — a real, total failure. Anything left
  // un-attempted (the loop broke early on cancellation, possibly before
  // touching a single asset) is 'partial': incomplete is not the same claim
  // as broken, and a later run can pick up exactly what is missing.
  const attempted = generated + skipped + failed;
  const state: GenerationMeta['art']['state'] =
    total === 0 || (attempted === total && failed === 0)
      ? 'done'
      : generated > 0 || skipped > 0 || attempted < total
        ? 'partial'
        : 'failed';

  await updateGenerationArt(storyDir, {
    requested: true,
    backend,
    ...(backend === 'gemini' ? { imageModel: geminiImageModel(ctx.env) } : {}),
    state,
    assets: assetsOut,
  });

  return { generated, skipped, failed, assets: assetsOut };
}
