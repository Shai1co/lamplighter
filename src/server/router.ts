/**
 * Lamplighter — method+path dispatch, the JSON body reader, and every
 * `/api/*` + `/stories/**` handler, composed into the flat middleware list
 * `storygen-plugin.ts` mounts on both the dev and preview server.
 *
 * Status-code rule, stated once (design doc §4): anything wrong with the
 * REQUEST is a JSON 4xx before any stream opens. Anything that goes wrong
 * DURING generation is HTTP 200 text/event-stream terminated by an SSE
 * `error` event. `/api/generate-story` is the seam where that split lives —
 * everything up to and including the provider/config check below it is a
 * synchronous 4xx; everything after is the job's problem to report.
 */

import type { ServerResponse } from 'node:http';
import type { Connect } from 'vite';
import { runArt } from './art';
import { defaultModelFor, geminiImageModel, isConfigured, resolveImageBackend } from './env';
import { runPipeline } from './pipeline';
import { resolveProvider } from './providers';
import { pipeJobToSse, startSse } from './sse';
import type { Job } from './sse';
import type { ServerContext } from './storygen-plugin';
import { isStoriesDirWritable, listStories, readStoryRecord } from './stories';
import { serveStoryFile } from './static';
import type {
  ApiError,
  ApiErrorBody,
  EvDone,
  EvHello,
  GenerateAssetsRequest,
  GenerateStoryRequest,
  ProviderHealth,
  ProviderId,
  StoriesResponse,
  StorygenHealth,
  StoryLength,
} from './types';

/* ─────────────────────────────  small HTTP helpers  ───────────────────────────── */

function urlPath(req: Connect.IncomingMessage): string {
  const u = req.url ?? '';
  const q = u.indexOf('?');
  return q === -1 ? u : u.slice(0, q);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(text));
  res.end(text);
}

function sendApiError(res: ServerResponse, status: number, error: ApiError): void {
  sendJson(res, status, { error } satisfies ApiErrorBody);
}

class BodyError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Reads the whole request body, capped at `maxBytes`; rejects with a `BodyError` on overflow or malformed JSON. */
function readJsonBody(req: Connect.IncomingMessage, maxBytes: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks: Buffer[] = [];
    let settled = false;
    req.on('data', (chunk: Buffer) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        settled = true;
        reject(new BodyError(413, `Request body exceeds ${maxBytes} bytes.`));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new BodyError(400, 'Request body is not valid JSON.'));
      }
    });
    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(new BodyError(400, err instanceof Error ? err.message : 'Failed to read request body.'));
    });
  });
}

/* ─────────────────────────────  GET /api/health  ───────────────────────────── */

function makeHealthHandler(ctx: ServerContext): Connect.NextHandleFunction {
  const PROVIDER_IDS: ProviderId[] = ['gemini', 'xai', 'openai-compatible', 'anthropic', 'mock'];
  return async (req, res, next) => {
    if (req.method !== 'GET' || urlPath(req) !== '/api/health') {
      next();
      return;
    }
    const providers = {} as Record<ProviderId, ProviderHealth>;
    for (const p of PROVIDER_IDS) {
      providers[p] = { configured: isConfigured(ctx.env, p), defaultModel: defaultModelFor(ctx.env, p) };
    }
    const { provider: defaultProvider, model: defaultModel } = resolveProvider(ctx.env);
    const backend = resolveImageBackend(ctx.env);
    const [writable, records] = await Promise.all([isStoriesDirWritable(ctx.storiesDir), listStories(ctx.storiesDir)]);
    const body: StorygenHealth = {
      ok: true,
      api: '1.0',
      defaultProvider,
      defaultModel,
      providers,
      art: { available: backend !== 'none', backend, imageModel: geminiImageModel(ctx.env) },
      stories: { dir: ctx.storiesDir, writable, count: records.length },
      proxy: ctx.proxy.proxy ? { configured: true, honored: ctx.proxy.honored } : null,
    };
    sendJson(res, 200, body);
  };
}

/* ─────────────────────────────  GET /api/stories  ───────────────────────────── */

function makeStoriesHandler(ctx: ServerContext): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (req.method !== 'GET' || urlPath(req) !== '/api/stories') {
      next();
      return;
    }
    const stories = await listStories(ctx.storiesDir);
    sendJson(res, 200, { api: '1.0', stories } satisfies StoriesResponse);
  };
}

/* ─────────────────────────────  POST /api/generate-story  ───────────────────────────── */

const PROVIDER_ID_SET = new Set<ProviderId>(['gemini', 'xai', 'openai-compatible', 'anthropic', 'mock']);
const LENGTH_SET = new Set<StoryLength>(['short', 'standard', 'long']);
const MODEL_ID_RE = /^[A-Za-z0-9._:-]{1,80}$/;

type ParseResult = { ok: true; value: GenerateStoryRequest } | { ok: false; message: string };

function parseGenerateStoryRequest(raw: unknown): ParseResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }
  const b = raw as Record<string, unknown>;
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : '';
  if (prompt.length < 8 || prompt.length > 2000) {
    return { ok: false, message: 'prompt must be 8-2000 characters after trimming.' };
  }
  const value: GenerateStoryRequest = { prompt };

  if (b.title !== undefined) {
    if (typeof b.title !== 'string' || b.title.length > 64) {
      return { ok: false, message: 'title must be a string of at most 64 characters.' };
    }
    const t = b.title.trim();
    if (t) value.title = t;
  }

  if (b.options !== undefined) {
    if (typeof b.options !== 'object' || b.options === null || Array.isArray(b.options)) {
      return { ok: false, message: 'options must be an object.' };
    }
    const o = b.options as Record<string, unknown>;
    const options: NonNullable<GenerateStoryRequest['options']> = {};
    if (o.provider !== undefined) {
      if (typeof o.provider !== 'string' || !PROVIDER_ID_SET.has(o.provider as ProviderId)) {
        return { ok: false, message: `options.provider must be one of: ${[...PROVIDER_ID_SET].join(', ')}.` };
      }
      options.provider = o.provider as ProviderId;
    }
    if (o.model !== undefined) {
      if (typeof o.model !== 'string' || !MODEL_ID_RE.test(o.model)) {
        return { ok: false, message: 'options.model must be 1-80 characters of [A-Za-z0-9._:-].' };
      }
      options.model = o.model;
    }
    if (o.art !== undefined) {
      if (typeof o.art !== 'boolean') return { ok: false, message: 'options.art must be a boolean.' };
      options.art = o.art;
    }
    if (o.length !== undefined) {
      if (typeof o.length !== 'string' || !LENGTH_SET.has(o.length as StoryLength)) {
        return { ok: false, message: `options.length must be one of: ${[...LENGTH_SET].join(', ')}.` };
      }
      options.length = o.length as StoryLength;
    }
    if (Object.keys(options).length) value.options = options;
  }

  return { ok: true, value };
}

const MAX_BODY_BYTES = 32 * 1024;

function makeGenerateStoryHandler(ctx: ServerContext): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (req.method !== 'POST' || urlPath(req) !== '/api/generate-story') {
      next();
      return;
    }

    let bodyRaw: unknown;
    try {
      bodyRaw = await readJsonBody(req, MAX_BODY_BYTES);
    } catch (err) {
      const status = err instanceof BodyError ? err.status : 400;
      sendApiError(res, status, { code: 'bad_request', message: err instanceof Error ? err.message : 'Malformed request body.', retryable: false });
      return;
    }

    const parsed = parseGenerateStoryRequest(bodyRaw);
    if (!parsed.ok) {
      sendApiError(res, 400, { code: 'bad_request', message: parsed.message, retryable: false });
      return;
    }

    const { provider } = resolveProvider(ctx.env, parsed.value.options?.provider);
    if (!isConfigured(ctx.env, provider)) {
      sendApiError(res, 400, {
        code: 'no_provider',
        message: `No API key is configured for provider "${provider}". Add it to .env.local and restart, or choose "mock" under Advanced.`,
        retryable: false,
      });
      return;
    }

    // From here on the request is fully accepted: open the stream and hand
    // the (detached) job off to the pipeline. Nothing below this line may
    // write another HTTP status — the response is already a 200 stream.
    const job = ctx.jobs.create('story');
    const sse = startSse(res);
    const unsubscribe = pipeJobToSse(job, sse);
    req.on('close', () => {
      unsubscribe();
      sse.close();
    });

    runPipeline(ctx, job, parsed.value).catch((err: unknown) => {
      // runPipeline converts every anticipated failure into an 'error' event
      // and a terminal job state itself; this only catches a genuine bug
      // that slipped past that boundary, and it must never crash the server.
      // eslint-disable-next-line no-console
      console.error('[storygen] pipeline crashed:', err);
      if (job.state === 'running') {
        job.emit('error', { code: 'internal', message: 'Internal error.', retryable: false, stage: 'plan' });
        job.state = 'failed';
        job.endedAt = Date.now();
      }
    });
  };
}

/* ─────────────────────────────  POST /api/generate-assets  ───────────────────────────── */

const ONLY_SET = new Set(['backgrounds', 'characters', 'cg']);

type AssetsParseResult = { ok: true; value: GenerateAssetsRequest } | { ok: false; message: string };

function parseGenerateAssetsRequest(raw: unknown): AssetsParseResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }
  const b = raw as Record<string, unknown>;
  const id = typeof b.id === 'string' ? b.id.trim() : '';
  if (!id) return { ok: false, message: 'id is required.' };
  const value: GenerateAssetsRequest = { id };

  if (b.only !== undefined) {
    if (typeof b.only !== 'string' || !ONLY_SET.has(b.only)) {
      return { ok: false, message: 'only must be one of: backgrounds, characters, cg.' };
    }
    value.only = b.only as GenerateAssetsRequest['only'];
  }
  if (b.force !== undefined) {
    if (typeof b.force !== 'boolean') return { ok: false, message: 'force must be a boolean.' };
    value.force = b.force;
  }
  return { ok: true, value };
}

/**
 * The standalone re-paint job's own tiny envelope: `hello` → (art.ts's own
 * `asset` events, emitted directly on this job) → `done`. Unlike
 * /api/generate-story there is no `ready` — the story already exists and was
 * already playable before this job started — and no terminal `error` on
 * cancellation: `DELETE /api/jobs/:id` still resolves as `done` with
 * whatever finished, exactly like the embedded art run in pipeline.ts and
 * for the same reason (design doc §12.2 — "Stop painting" settles to the
 * done view, not a failure view). A genuinely unexpected throw out of
 * `runArt` (not a per-asset failure — those are already handled inside it)
 * is left to the caller's own crash guard, matching how
 * `makeGenerateStoryHandler` treats `runPipeline`.
 */
async function runAssetsJob(ctx: ServerContext, job: Job, req: GenerateAssetsRequest, title: string): Promise<void> {
  const startedAt = Date.now();
  const backend = resolveImageBackend(ctx.env);
  job.emit('hello', {
    jobId: job.id,
    kind: 'assets',
    provider: backend === 'gemini' ? 'gemini' : 'mock',
    model: backend === 'gemini' ? geminiImageModel(ctx.env) : 'mock-1',
    art: true,
    startedAt,
  } satisfies EvHello);

  const summary = await runArt(ctx, job, { storyId: req.id, only: req.only, force: req.force });

  job.emit('done', {
    id: req.id,
    title,
    durationMs: Date.now() - startedAt,
    warnings: [],
    art: { generated: summary.generated, skipped: summary.skipped, failed: summary.failed },
  } satisfies EvDone);
  job.state = 'done';
  job.endedAt = Date.now();
}

function makeGenerateAssetsHandler(ctx: ServerContext): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (req.method !== 'POST' || urlPath(req) !== '/api/generate-assets') {
      next();
      return;
    }

    let bodyRaw: unknown;
    try {
      bodyRaw = await readJsonBody(req, MAX_BODY_BYTES);
    } catch (err) {
      const status = err instanceof BodyError ? err.status : 400;
      sendApiError(res, status, { code: 'bad_request', message: err instanceof Error ? err.message : 'Malformed request body.', retryable: false });
      return;
    }

    const parsed = parseGenerateAssetsRequest(bodyRaw);
    if (!parsed.ok) {
      sendApiError(res, 400, { code: 'bad_request', message: parsed.message, retryable: false });
      return;
    }

    const record = await readStoryRecord(ctx.storiesDir, parsed.value.id);
    if (!record) {
      sendApiError(res, 404, { code: 'bad_request', message: `No such story "${parsed.value.id}".`, retryable: false });
      return;
    }

    if (ctx.jobs.hasRunningForStory(parsed.value.id)) {
      sendApiError(res, 409, {
        code: 'bad_request',
        message: `An art job is already running for "${parsed.value.id}".`,
        retryable: false,
      });
      return;
    }

    // From here on the request is fully accepted — same rule as
    // /api/generate-story (see the header comment): nothing below this line
    // may write another HTTP status.
    const job = ctx.jobs.create('assets', parsed.value.id);
    const sse = startSse(res);
    const unsubscribe = pipeJobToSse(job, sse);
    req.on('close', () => {
      unsubscribe();
      sse.close();
    });

    runAssetsJob(ctx, job, parsed.value, record.manifest.title).catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('[storygen] assets job crashed:', err);
      if (job.state === 'running') {
        job.emit('error', { code: 'internal', message: 'Internal error.', retryable: false, stage: 'art' });
        job.state = 'failed';
        job.endedAt = Date.now();
      }
    });
  };
}

/* ─────────────────────────────  jobs  ───────────────────────────── */

const JOB_EVENTS_RE = /^\/api\/jobs\/([^/]+)\/events$/;

function makeJobEventsHandler(ctx: ServerContext): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }
    const m = urlPath(req).match(JOB_EVENTS_RE);
    if (!m) {
      next();
      return;
    }
    const job = ctx.jobs.get(decodeURIComponent(m[1]));
    if (!job) {
      sendApiError(res, 404, { code: 'bad_request', message: 'No such job.', retryable: false });
      return;
    }
    const sse = startSse(res);
    const unsubscribe = pipeJobToSse(job, sse);
    req.on('close', () => {
      unsubscribe();
      sse.close();
    });
  };
}

const JOB_RE = /^\/api\/jobs\/([^/]+)$/;

function makeJobDeleteHandler(ctx: ServerContext): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (req.method !== 'DELETE') {
      next();
      return;
    }
    const m = urlPath(req).match(JOB_RE);
    if (!m) {
      next();
      return;
    }
    const job = ctx.jobs.get(decodeURIComponent(m[1]));
    if (job) job.cancel();
    sendJson(res, 200, { cancelled: true });
  };
}

/* ─────────────────────────────  GET /stories/**  ───────────────────────────── */

function makeStaticHandler(ctx: ServerContext): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    const handled = await serveStoryFile(req, res, ctx.storiesDir, '/stories/');
    if (!handled) next();
  };
}

/* ─────────────────────────────  composition  ───────────────────────────── */

export function buildHandlers(ctx: ServerContext): Connect.NextHandleFunction[] {
  return [
    makeHealthHandler(ctx),
    makeStoriesHandler(ctx),
    makeGenerateStoryHandler(ctx),
    makeGenerateAssetsHandler(ctx),
    makeJobEventsHandler(ctx),
    makeJobDeleteHandler(ctx),
    makeStaticHandler(ctx),
  ];
}
