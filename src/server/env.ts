/**
 * Lamplighter — StoryGen environment & secrets.
 *
 * The one file that owns every key, model and directory lookup for the
 * feature. Precedence is REQUEST OPTION (resolved by the caller, e.g.
 * pipeline.ts) → `STORYGEN_*` env → provider-specific env → built-in default.
 * `createEnv` implements the merge rule from the design doc §3.2: real
 * process env always wins over the `.env.local` values Vite's `loadEnv`
 * loaded, so a shell export can override a dotfile without editing it.
 *
 * Nothing here ever leaves the server: this module is excluded from the
 * browser tsconfig project, and every value it returns is either a resolved
 * (non-secret) id/path or is passed straight to `net.ts#registerSecret` so it
 * can be scrubbed from logs and error strings — never round-tripped through
 * an HTTP response.
 */

import path from 'node:path';
import type { ProviderId } from './types';

/** The merged, read-only key/value view every lookup in this file reads from. */
export type Env = Record<string, string | undefined>;

/** `{ ...loadEnv result, ...process.env }` — a real shell variable always wins. */
export function createEnv(loadedEnv: Record<string, string>): Env {
  return { ...loadedEnv, ...process.env };
}

function isProviderId(v: string | undefined): v is ProviderId {
  return v === 'gemini' || v === 'xai' || v === 'openai-compatible' || v === 'anthropic' || v === 'mock';
}

/** requested → STORYGEN_PROVIDER → 'gemini'. */
export function resolveProviderId(env: Env, requested?: ProviderId): ProviderId {
  if (requested) return requested;
  if (isProviderId(env.STORYGEN_PROVIDER)) return env.STORYGEN_PROVIDER;
  return 'gemini';
}

export function geminiKey(env: Env): string | undefined {
  return env.GEMINI_KEY || env.GEMINI_API_KEY || undefined;
}
export function geminiTextModel(env: Env): string {
  return env.STORYGEN_MODEL || env.GEMINI_MODEL || 'gemini-3.7-flash';
}
export function geminiImageModel(env: Env): string {
  return env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
}

export function xaiKey(env: Env): string | undefined {
  return env.XAI_API_KEY || env.GROK_API_KEY || undefined;
}
export function xaiModel(env: Env): string {
  return env.STORYGEN_MODEL || env.XAI_MODEL || 'grok-4';
}

export function openaiKey(env: Env): string | undefined {
  return env.OPENAI_API_KEY || undefined;
}
export function openaiBaseUrl(env: Env): string {
  return env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
}
export function openaiModel(env: Env): string {
  return env.STORYGEN_MODEL || env.OPENAI_MODEL || 'gpt-5';
}

export function anthropicKey(env: Env): string | undefined {
  return env.ANTHROPIC_API_KEY || undefined;
}
export function anthropicModel(env: Env): string {
  return env.STORYGEN_MODEL || env.ANTHROPIC_MODEL || 'claude-sonnet-5';
}

/** The provider's own default text model — request-level overrides live above this layer. */
export function defaultModelFor(env: Env, provider: ProviderId): string {
  switch (provider) {
    case 'gemini':
      return geminiTextModel(env);
    case 'xai':
      return xaiModel(env);
    case 'openai-compatible':
      return openaiModel(env);
    case 'anthropic':
      return anthropicModel(env);
    case 'mock':
      return 'mock-1';
  }
}

export function isConfigured(env: Env, provider: ProviderId): boolean {
  switch (provider) {
    case 'gemini':
      return !!geminiKey(env);
    case 'xai':
      return !!xaiKey(env);
    case 'openai-compatible':
      return !!openaiKey(env);
    case 'anthropic':
      return !!anthropicKey(env);
    case 'mock':
      return true;
  }
}

/** Absolute stories root: STORYGEN_STORIES_DIR (resolved against `root`) or `<root>/stories`. */
export function resolveStoriesDir(env: Env, root: string): string {
  const override = env.STORYGEN_STORIES_DIR;
  return override ? path.resolve(root, override) : path.join(root, 'stories');
}

export type ImageBackend = 'gemini' | 'mock' | 'none';

function imageBackendOverride(env: Env): ImageBackend | undefined {
  const v = env.STORYGEN_IMAGE_BACKEND;
  return v === 'gemini' || v === 'mock' || v === 'none' ? v : undefined;
}

/** override → gemini (when a key is configured) → none. Pure config introspection —
 *  reported by /api/health even though PR-1 does not yet run an art job. */
export function resolveImageBackend(env: Env): ImageBackend {
  return imageBackendOverride(env) ?? (geminiKey(env) ? 'gemini' : 'none');
}

/** Every secret value this env could hand out, for net.ts#registerSecret at boot. */
export function allSecrets(env: Env): Array<string | undefined> {
  return [geminiKey(env), xaiKey(env), openaiKey(env), anthropicKey(env)];
}
