/**
 * Lamplighter — text-generation providers.
 *
 * One function the rest of the server calls: `generateText`. Everything
 * provider-specific (endpoint shape, auth header, JSON-mode incantation,
 * refusal detection) lives in this file and nowhere else, so pipeline.ts
 * never has to know whether it is talking to Gemini or a grocery list.
 *
 * Shape notes that would otherwise cost an afternoon each (design doc §6):
 * - Gemini's system prompt goes in `systemInstruction`, not `contents`; reply
 *   text is `candidates[0].content.parts[].text` joined across ALL parts, not
 *   `parts[0]`; a refusal is `promptFeedback.blockReason` or
 *   `finishReason === 'SAFETY'`.
 * - Anthropic has no JSON mode — when `json: true` we prefill an assistant
 *   turn with "{" and RE-PREPEND that "{" to the response text, or the
 *   result is a truncated JSON object missing its first character.
 * - openai-compatible has no universal default model (the endpoint might be
 *   Ollama/LM Studio/OpenRouter); it falls back to `gpt-5`.
 */

import { anthropicKey, defaultModelFor, geminiKey, isConfigured, openaiBaseUrl, openaiKey, resolveProviderId, xaiKey } from './env';
import type { Env } from './env';
import { mockReplyText } from './mock-story';
import { netFetch, redact } from './net';
import type { NetError } from './net';
import type { ErrorCode, ProviderId } from './types';

export interface GenerateTextRequest {
  system: string;
  user: string;
  model?: string;
  /** default 16000. */
  maxOutputTokens?: number;
  /** default 0.9 draft / 0.35 repair. */
  temperature?: number;
  /** ask for JSON mode where the provider has one. */
  json?: boolean;
  signal?: AbortSignal;
}
export interface GenerateTextResult {
  text: string;
  provider: ProviderId;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

/** A provider-facing error carrying an already-resolved wire ErrorCode. */
export type TaggedError = Error & { code: ErrorCode; hint?: string; detail?: string[] };

function tagged(code: ErrorCode, message: string, extra?: { hint?: string; detail?: string[] }): TaggedError {
  const err = new Error(message) as TaggedError;
  err.code = code;
  if (extra?.hint !== undefined) err.hint = extra.hint;
  if (extra?.detail !== undefined) err.detail = extra.detail;
  return err;
}

function fromNetError(e: NetError): TaggedError {
  return tagged(e.code, e.message, { hint: e.hint });
}

function isNetError(e: unknown): e is NetError {
  return !!e && typeof e === 'object' && 'code' in e;
}

/** requested → STORYGEN_PROVIDER → 'gemini', paired with that provider's own default model. */
export function resolveProvider(env: Env, requested?: ProviderId): { provider: ProviderId; model: string } {
  const provider = resolveProviderId(env, requested);
  return { provider, model: defaultModelFor(env, provider) };
}

export { isConfigured };

function noProviderError(provider: ProviderId): TaggedError {
  return tagged('no_provider', `No API key is configured for provider "${provider}".`, {
    hint: `Add the key to .env.local and restart the dev server, or pick "mock" to try the flow offline.`,
  });
}

/* ─────────────────────────────  envelope extraction  ───────────────────────────── */

function tryParse(candidate: string): unknown | undefined {
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

/** First brace-balanced `{...}` span, respecting JSON string escaping (so `{trust>=3}` inside "script" never breaks the scan). */
function firstBalancedJsonSpan(s: string): string | null {
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Accepts raw JSON, a ```json fence, a fenced block anywhere in prose, or a
 * brace-balanced span. Returns the first parseable object, or throws a
 * `TaggedError` coded 'invalid_json'.
 */
export function extractEnvelope(raw: string): unknown {
  const trimmed = raw.trim();
  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;

  const jsonFence = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (jsonFence) {
    const v = tryParse(jsonFence[1].trim());
    if (v !== undefined) return v;
  }
  const anyFence = trimmed.match(/```\s*([\s\S]*?)```/);
  if (anyFence) {
    const v = tryParse(anyFence[1].trim());
    if (v !== undefined) return v;
  }
  const span = firstBalancedJsonSpan(trimmed);
  if (span) {
    const v = tryParse(span);
    if (v !== undefined) return v;
  }
  throw tagged('invalid_json', 'No parseable JSON object was found in the provider response.');
}

/* ─────────────────────────────  per-provider calls  ───────────────────────────── */

interface GeminiPart {
  text?: string;
}
interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

async function callGemini(env: Env, model: string, req: GenerateTextRequest): Promise<GenerateTextResult> {
  const key = geminiKey(env);
  if (!key) throw noProviderError('gemini');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: req.user }] }],
    systemInstruction: { parts: [{ text: req.system }] },
    generationConfig: {
      maxOutputTokens: req.maxOutputTokens ?? 16000,
      temperature: req.temperature ?? 0.9,
      ...(req.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  let res: Response;
  try {
    res = await netFetch(
      url,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: req.signal },
      { timeoutMs: 150_000 },
    );
  } catch (err) {
    if (isNetError(err)) throw fromNetError(err);
    throw err;
  }
  const json = (await res.json()) as GeminiResponse;
  const blockReason = json.promptFeedback?.blockReason;
  const cand = json.candidates?.[0];
  if (blockReason || cand?.finishReason === 'SAFETY') {
    throw tagged('provider_refused', `Gemini declined this premise (${blockReason || cand?.finishReason}).`);
  }
  if (cand?.finishReason === 'MAX_TOKENS') {
    throw tagged('provider_error', 'Gemini truncated its reply at the token limit.', { hint: 'Try a shorter length.' });
  }
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('');
  if (!text) throw tagged('provider_refused', 'Gemini returned an empty candidate.');
  return {
    text,
    provider: 'gemini',
    model,
    usage: { inputTokens: json.usageMetadata?.promptTokenCount, outputTokens: json.usageMetadata?.candidatesTokenCount },
  };
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

async function callChatCompletions(
  env: Env,
  provider: 'xai' | 'openai-compatible',
  baseUrl: string,
  key: string | undefined,
  model: string,
  req: GenerateTextRequest,
): Promise<GenerateTextResult> {
  if (!key) throw noProviderError(provider);
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const body = {
    model,
    messages: [
      { role: 'system', content: req.system },
      { role: 'user', content: req.user },
    ],
    temperature: req.temperature ?? 0.9,
    max_tokens: req.maxOutputTokens ?? 16000,
    ...(req.json ? { response_format: { type: 'json_object' } } : {}),
  };
  let res: Response;
  try {
    res = await netFetch(
      url,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: req.signal,
      },
      { timeoutMs: 150_000 },
    );
  } catch (err) {
    if (isNetError(err)) throw fromNetError(err);
    throw err;
  }
  const json = (await res.json()) as ChatCompletionResponse;
  const choice = json.choices?.[0];
  if (choice?.finish_reason === 'length') {
    throw tagged('provider_error', `${provider} truncated its reply at the token limit.`, { hint: 'Try a shorter length.' });
  }
  const text = choice?.message?.content ?? '';
  if (!text) throw tagged('provider_refused', `${provider} returned an empty reply.`);
  return {
    text,
    provider,
    model,
    usage: { inputTokens: json.usage?.prompt_tokens, outputTokens: json.usage?.completion_tokens },
  };
}

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function callAnthropic(env: Env, model: string, req: GenerateTextRequest): Promise<GenerateTextResult> {
  const key = anthropicKey(env);
  if (!key) throw noProviderError('anthropic');
  const messages: Array<{ role: string; content: string }> = [{ role: 'user', content: req.user }];
  // No JSON mode — prefill the assistant turn with "{" and re-prepend it below.
  if (req.json) messages.push({ role: 'assistant', content: '{' });
  const body = {
    model,
    system: req.system,
    max_tokens: req.maxOutputTokens ?? 16000,
    temperature: req.temperature ?? 0.9,
    messages,
  };
  let res: Response;
  try {
    res = await netFetch(
      ANTHROPIC_URL,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body),
        signal: req.signal,
      },
      { timeoutMs: 150_000 },
    );
  } catch (err) {
    if (isNetError(err)) throw fromNetError(err);
    throw err;
  }
  const json = (await res.json()) as AnthropicResponse;
  if (json.stop_reason === 'max_tokens') {
    throw tagged('provider_error', 'Anthropic truncated its reply at the token limit.', { hint: 'Try a shorter length.' });
  }
  let text = (json.content ?? [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('');
  if (req.json) text = '{' + text; // re-prepend the assistant-prefill '{' — the classic bug is forgetting this.
  if (!text.trim()) throw tagged('provider_refused', 'Anthropic returned an empty reply.');
  return { text, provider: 'anthropic', model, usage: { inputTokens: json.usage?.input_tokens, outputTokens: json.usage?.output_tokens } };
}

async function callMock(env: Env, req: GenerateTextRequest): Promise<GenerateTextResult> {
  // Draft calls run at temperature 0.9, repairs at 0.35 (pipeline.ts's own
  // convention, mirrored here) — that is the only signal available to tell
  // "first attempt" from "repair attempt" without threading an extra
  // parameter through GenerateTextRequest just for the mock's benefit.
  const isDraftCall = (req.temperature ?? 0.9) >= 0.9 - 1e-9;
  const broken = env.STORYGEN_MOCK_BREAK === 'targets' && isDraftCall;
  return { text: mockReplyText({ broken }), provider: 'mock', model: 'mock-1' };
}

/* ─────────────────────────────  dispatch  ───────────────────────────── */

export async function generateText(env: Env, provider: ProviderId, req: GenerateTextRequest): Promise<GenerateTextResult> {
  const model = req.model || defaultModelFor(env, provider);
  try {
    switch (provider) {
      case 'gemini':
        return await callGemini(env, model, req);
      case 'xai':
        return await callChatCompletions(env, 'xai', 'https://api.x.ai/v1', xaiKey(env), model, req);
      case 'openai-compatible':
        return await callChatCompletions(env, 'openai-compatible', openaiBaseUrl(env), openaiKey(env), model, req);
      case 'anthropic':
        return await callAnthropic(env, model, req);
      case 'mock':
        return await callMock(env, req);
    }
  } catch (err) {
    // Every thrown error crossing this boundary is redacted, even ones that
    // already went through net.ts's own redact() — a provider-specific
    // message built above (finish-reason text, etc.) never touches a key,
    // but this is the one seam every path funnels through, so it is also the
    // cheapest place to guarantee it rather than trust every call site above.
    if (err instanceof Error) err.message = redact(err.message);
    throw err;
  }
}
