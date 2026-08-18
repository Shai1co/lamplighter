/**
 * Lamplighter — StoryGen wire contract.
 *
 * Every type in this file describes something that crosses the HTTP/SSE
 * boundary between the storygen plugin and the browser. It is imported
 * type-only from both lanes (`import type`), so nothing here may carry
 * runtime code — that keeps it erasable by the browser tsconfig, which never
 * needs to know Node exists. See docs/superpowers/specs/2026-08-18-storygen-design.md
 * §4 (HTTP) and §5 (SSE) for the source of truth this mirrors.
 */

import type { StoryManifest } from '../core/types';

/* ─────────────────────────────  Providers & errors  ───────────────────────────── */

export type ProviderId = 'gemini' | 'xai' | 'openai-compatible' | 'anthropic' | 'mock';
export type StoryLength = 'short' | 'standard' | 'long';

export type ErrorCode =
  | 'bad_request' // malformed body, prompt missing/too long, unknown provider
  | 'no_provider' // requested (or default) provider has no key configured
  | 'provider_auth' // 401/403 from the provider
  | 'provider_rate_limit' // 429, after the one retry
  | 'provider_refused' // safety block / empty candidate / finishReason SAFETY
  | 'provider_error' // any other non-2xx or unparseable provider response
  | 'network'
  | 'tls'
  | 'proxy'
  | 'timeout'
  | 'invalid_json' // no JSON envelope could be extracted from the reply
  | 'invalid_output' // envelope failed validation after the repair budget
  | 'disk' // write/rename failed
  // Not present in the design doc's own §4 ErrorCode listing, but §9 ("...then
  // fail with id_conflict") and §12.4's failure-copy table (a "disk / id_conflict"
  // row with its own copy) both use it as a distinct wire code — added here to
  // match how the rest of the doc actually treats it.
  | 'id_conflict' // every candidate id (through -99) was already taken, or a rename lost a race twice
  | 'cancelled'
  | 'internal';

export interface ApiError {
  code: ErrorCode;
  message: string;
  detail?: string[];
  retryable: boolean;
}
export interface ApiErrorBody {
  error: ApiError;
}

/* ─────────────────────────────  4.1 GET /api/health  ───────────────────────────── */

export interface ProviderHealth {
  configured: boolean;
  defaultModel: string;
}

export interface StorygenHealth {
  ok: true;
  /** Contract version. The client refuses to render Create on a mismatch of the major. */
  api: '1.0';
  defaultProvider: ProviderId;
  defaultModel: string;
  providers: Record<ProviderId, ProviderHealth>; // 'mock' is always { configured: true }
  art: { available: boolean; backend: 'gemini' | 'mock' | 'none'; imageModel: string };
  stories: { dir: string; writable: boolean; count: number };
  proxy: { configured: boolean; honored: boolean } | null;
}

/* ─────────────────────────────  4.2 GET /api/stories  ───────────────────────────── */

/** Path relative to the story dir, e.g. "assets/backgrounds/harbour.png". */
export interface RuntimeAssetFile {
  path: string;
  mtime: number;
  size: number;
}

export interface RuntimeStoryRecord {
  id: string;
  manifest: StoryManifest;
  /** Raw story.pq text. */
  script: string;
  assets: RuntimeAssetFile[];
  /** generation.json present. */
  generated: boolean;
  /** Max mtime across manifest/script. */
  updatedAt: number;
}

export interface StoriesResponse {
  api: '1.0';
  stories: RuntimeStoryRecord[];
}

/* ─────────────────────────────  4.3 POST /api/generate-story  ───────────────────────────── */

export interface GenerateStoryRequest {
  /** 8..2000 chars after trim. */
  prompt: string;
  /** <= 64 chars. */
  title?: string;
  options?: {
    provider?: ProviderId;
    /** <= 80 chars, [A-Za-z0-9._:-]. */
    model?: string;
    /** default: health.art.available. */
    art?: boolean;
    /** default 'standard'. */
    length?: StoryLength;
  };
}

/* ─────────────────────────────  4.4 POST /api/generate-assets  ───────────────────────────── */

export interface GenerateAssetsRequest {
  /** Existing story id. */
  id: string;
  only?: 'backgrounds' | 'characters' | 'cg';
  /** Regenerate existing files. */
  force?: boolean;
}

/* ─────────────────────────────  4.5 Jobs  ───────────────────────────── */

export type JobState = 'running' | 'done' | 'failed' | 'cancelled';

export interface JobSummary {
  id: string;
  kind: 'story' | 'assets';
  state: JobState;
  storyId?: string;
  startedAt: number;
  endedAt?: number;
}

/* ─────────────────────────────  5.1 SSE event payloads  ───────────────────────────── */

export type Stage = 'plan' | 'draft' | 'validate' | 'repair' | 'write' | 'art' | 'done';

export interface EvHello {
  jobId: string;
  kind: 'story' | 'assets';
  provider: ProviderId;
  model: string;
  art: boolean;
  startedAt: number;
}
export interface EvStage {
  stage: Stage;
  message: string;
  step: number;
  steps: number;
}
export interface EvNote {
  level: 'info' | 'warn';
  message: string;
}
export interface EvAsset {
  index: number;
  total: number;
  label: string;
  path: string;
  state: 'start' | 'ok' | 'skip' | 'fail';
  error?: string;
}
/** Files are on disk and the story is playable. Fires BEFORE art finishes. */
export interface EvReady {
  id: string;
  title: string;
  art: 'off' | 'running';
}
export interface EvDone {
  id: string;
  title: string;
  durationMs: number;
  warnings: string[];
  art: { generated: number; skipped: number; failed: number };
}
export interface EvError extends ApiError {
  stage: Stage;
}

export interface StorygenEvents {
  hello: EvHello;
  stage: EvStage;
  note: EvNote;
  asset: EvAsset;
  ready: EvReady;
  done: EvDone;
  error: EvError;
}
