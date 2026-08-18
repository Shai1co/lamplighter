/**
 * Lamplighter — draft → validate → repair(≤2) → write → art. Owns the stage
 * events (design doc §5, §8.3, §10.3).
 *
 * Art runs INSIDE this same detached job, after `ready` fires — never
 * before: `ready` means "files are on disk and the story is playable", and
 * §5.1's ordering table guarantees it fires before art finishes, not before
 * art starts. Once `ready` has fired the story itself is already a complete,
 * successful result, so everything from here to `done` is strictly additive:
 * a structural art failure or a mid-run cancellation (`DELETE
 * /api/jobs/:id`) still resolves as `done` with whatever art progress there
 * is, never a terminal `error` — nothing in §5.1's table describes an
 * `error` following a `ready`, and §12.2's "Stop painting… settles to the
 * done view" is the client-facing half of the same decision.
 */

import { runArt } from './art';
import type { ArtSummary } from './art';
import { geminiImageModel, resolveImageBackend } from './env';
import { redact } from './net';
import { buildRepairMessage, buildUserMessage, LENGTH_PROFILES, PROMPT_VERSION, SYSTEM_PROMPT } from './prompt';
import { extractEnvelope, generateText, resolveProvider } from './providers';
import type { TaggedError } from './providers';
import type { ServerContext } from './storygen-plugin';
import type { Job } from './sse';
import type { ApiError, ErrorCode, EvDone, EvError, EvHello, EvReady, EvStage, GenerateStoryRequest, Stage, StoryLength } from './types';
import { validateEnvelope } from './validate';
import type { Issue, StoryEnvelope } from './validate';
import { writeStory } from './write-story';
import type { GenerationMeta } from './write-story';

const ALL_ERROR_CODES = new Set<ErrorCode>([
  'bad_request',
  'no_provider',
  'provider_auth',
  'provider_rate_limit',
  'provider_refused',
  'provider_error',
  'network',
  'tls',
  'proxy',
  'timeout',
  'invalid_json',
  'invalid_output',
  'disk',
  'id_conflict',
  'cancelled',
  'internal',
]);

/** Codes the Create panel offers a bare "Try again" for (design doc §12.4). */
const RETRYABLE_CODES = new Set<ErrorCode>([
  'network',
  'tls',
  'proxy',
  'timeout',
  'provider_rate_limit',
  'invalid_output',
  'invalid_json',
  'disk',
  'id_conflict',
]);

function isErrorCode(x: unknown): x is ErrorCode {
  return typeof x === 'string' && ALL_ERROR_CODES.has(x as ErrorCode);
}

function toApiError(err: unknown): ApiError {
  if (err && typeof err === 'object' && 'code' in err) {
    const e = err as Partial<TaggedError>;
    if (isErrorCode(e.code)) {
      const message = e.hint || (err instanceof Error ? err.message : 'Something went wrong.');
      const out: ApiError = { code: e.code, message: redact(message), retryable: RETRYABLE_CODES.has(e.code) };
      if (e.detail) out.detail = e.detail;
      return out;
    }
  }
  return { code: 'internal', message: redact(err instanceof Error ? err.message : String(err)), retryable: false };
}

function tagInvalidOutput(issues: Issue[]): TaggedError {
  const err = new Error('The draft did not pass validation after the repair budget.') as TaggedError;
  err.code = 'invalid_output';
  err.detail = issues.slice(0, 5).map((i) => `[${i.code}] ${i.message}`);
  return err;
}

export async function runPipeline(ctx: ServerContext, job: Job, req: GenerateStoryRequest): Promise<void> {
  const startedAt = Date.now();
  const { provider, model: defaultModel } = resolveProvider(ctx.env, req.options?.provider);
  const model = req.options?.model || defaultModel;
  // The mock provider always returns the same fixed envelope (mock-story.ts's
  // "Signal Hill"), which the design doc calibrates — and §14.2 unit-tests —
  // against the `short` profile specifically, not `standard`. Since mock
  // already "ignores the premise" unconditionally (§6.1), ignoring a
  // mismatched length request the same way is what keeps it deterministic
  // and always-succeeding offline: a mock that sometimes fails validation
  // depending on the caller's `length` would defeat the point of having one.
  const length: StoryLength = provider === 'mock' ? 'short' : (req.options?.length ?? 'standard');

  // Resolved once, up front, from env + the request — never from anything
  // that could still change (health.art.available is this same computation,
  // reported for the client's own toggle default; here it decides for real).
  const imageBackend = resolveImageBackend(ctx.env);
  const artAvailable = imageBackend !== 'none';
  const wantArt = req.options?.art ?? artAvailable;
  const doArt = wantArt && artAvailable;

  job.emit('hello', { jobId: job.id, kind: 'story', provider, model, art: doArt, startedAt } satisfies EvHello);

  let currentStage: Stage = 'plan';
  const stage = (s: Stage, message: string, step: number): void => {
    currentStage = s;
    job.emit('stage', { stage: s, message, step, steps: 5 } satisfies EvStage);
  };
  const bail = (err: unknown, stageAt: Stage): void => {
    const apiErr = toApiError(err);
    job.emit('error', { ...apiErr, stage: stageAt } satisfies EvError);
    job.state = 'failed';
    job.endedAt = Date.now();
  };
  const cancelled = (): boolean => {
    if (!job.controller.signal.aborted) return false;
    job.emit('error', { code: 'cancelled', message: 'Cancelled.', retryable: false, stage: currentStage } satisfies EvError);
    job.state = 'cancelled';
    job.endedAt = Date.now();
    return true;
  };

  if (cancelled()) return;
  stage('plan', 'Reading your premise…', 1);

  const profile = LENGTH_PROFILES[length];
  const userMessage = buildUserMessage({ prompt: req.prompt, title: req.title, length });

  let envelope: StoryEnvelope | undefined;
  let lastRaw = '';
  let fatalIssues: Issue[] = [];
  const attempts: GenerationMeta['attempts'] = [];
  let warnings: string[] = [];

  for (let attempt = 0; attempt <= 2; attempt++) {
    if (cancelled()) return;
    if (attempt === 0) stage('draft', 'Writing the story…', 2);
    else stage('repair', `Fixing a few loose ends (attempt ${attempt} of 2)…`, 3);

    let raw: string;
    try {
      const result = await generateText(ctx.env, provider, {
        system: SYSTEM_PROMPT,
        user: attempt === 0 ? userMessage : buildRepairMessage(lastRaw, fatalIssues),
        model,
        temperature: attempt === 0 ? 0.9 : 0.35,
        json: true,
        signal: job.controller.signal,
      });
      raw = result.text;
    } catch (err) {
      if (cancelled()) return;
      bail(err, attempt === 0 ? 'draft' : 'repair');
      return;
    }
    lastRaw = raw;
    if (cancelled()) return;
    stage('validate', 'Checking the script…', 3);

    let parsedRaw: unknown;
    try {
      parsedRaw = extractEnvelope(raw);
    } catch {
      fatalIssues = [
        {
          code: 'ENVELOPE_SHAPE',
          severity: 'fatal',
          message: `Your reply was not a single JSON object. First 400 characters: ${raw.slice(0, 400)}`,
        },
      ];
      attempts.push({ index: attempt, ok: false, issues: ['ENVELOPE_SHAPE'] });
      if (attempt === 2) {
        bail(tagInvalidOutput(fatalIssues), 'validate');
        return;
      }
      continue;
    }

    const result = validateEnvelope(parsedRaw, profile);
    if (result.ok && result.envelope) {
      envelope = result.envelope;
      warnings = result.issues.filter((i) => i.severity === 'warn').map((i) => `[${i.code}] ${i.message}`);
      attempts.push({ index: attempt, ok: true, issues: result.issues.map((i) => i.code) });
      break;
    }
    fatalIssues = result.issues.filter((i) => i.severity === 'fatal');
    attempts.push({ index: attempt, ok: false, issues: fatalIssues.map((i) => i.code) });
    if (attempt === 2) {
      bail(tagInvalidOutput(fatalIssues), 'validate');
      return;
    }
  }

  if (!envelope) {
    // Defensive backstop — every path through the loop above either breaks
    // with an envelope or bails+returns on the final attempt.
    bail(tagInvalidOutput(fatalIssues), 'validate');
    return;
  }

  if (cancelled()) return;
  stage('write', 'Saving the story…', 4);

  const meta: GenerationMeta = {
    schema: 1,
    createdAt: new Date().toISOString(),
    prompt: req.prompt,
    length,
    provider,
    model,
    promptVersion: PROMPT_VERSION,
    durationMs: Date.now() - startedAt,
    attempts,
    warnings,
    art: doArt
      ? {
          requested: true,
          backend: imageBackend,
          ...(imageBackend === 'gemini' ? { imageModel: geminiImageModel(ctx.env) } : {}),
          state: 'running',
          assets: [],
        }
      : { requested: wantArt, backend: 'none', state: 'off', assets: [] },
  };
  if (req.title) meta.title = req.title;

  let writeResult: Awaited<ReturnType<typeof writeStory>>;
  try {
    writeResult = await writeStory(ctx, envelope, meta);
  } catch (err) {
    bail(err, 'write');
    return;
  }

  job.emit('ready', { id: writeResult.id, title: envelope.manifest.title, art: doArt ? 'running' : 'off' } satisfies EvReady);

  let art: EvDone['art'] = { generated: 0, skipped: 0, failed: 0 };
  if (doArt) {
    stage('art', 'Painting the art…', 5);
    try {
      const summary: ArtSummary = await runArt(ctx, job, { storyId: writeResult.id });
      art = { generated: summary.generated, skipped: summary.skipped, failed: summary.failed };
    } catch (err) {
      // Structural failure (e.g. the manifest vanished from disk between the
      // write above and here) — NOT an ordinary per-asset failure, which
      // runArt already absorbs, continues past, and reports through its own
      // summary. The story is still safely on disk and playable, so this
      // still resolves as `done` reporting zero art progress rather than a
      // terminal `error` this late (see the file header for why).
      // eslint-disable-next-line no-console
      console.error('[storygen] art job crashed after ready:', err);
    }
  }

  job.emit('done', {
    id: writeResult.id,
    title: envelope.manifest.title,
    durationMs: Date.now() - startedAt,
    warnings,
    art,
  } satisfies EvDone);
  job.state = 'done';
  job.endedAt = Date.now();
}
