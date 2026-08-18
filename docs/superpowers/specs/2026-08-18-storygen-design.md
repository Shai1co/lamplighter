# Lamplighter — In-App Story Generation (StoryGen)

**Date:** 2026-08-18
**Status:** Design approved for build. Extends `2026-08-17-picture-quest-design.md`; nothing in that spec is retired.
**Scope:** the anthology becomes *writable from inside the app*. Title screen → **Create a Story** → a premise → an LLM writes a complete branching PQScript story → it is validated against the real parser → it is written to `stories/<id>/` → it appears in the picker and plays immediately on every existing shader, weather system and synth → its art is optionally painted by the Gemini image model.

---

## 1. Vision

Lamplighter's founding promise is *"a story is one folder; drop it in and it appears."* Today that folder is written by a human with a text editor. This feature keeps the promise exactly as it is and adds a second author: the app itself.

Three properties are non-negotiable, because they are what make the feature honest rather than a demo:

1. **The generated story is a first-class story.** Same `story.pq`, same `manifest.json`, same contract in `docs/AUTHORING.md`. It is indistinguishable on disk from one a person wrote, editable by hand afterwards, and it plays through the unmodified `Runtime`, `Stage` and `AudioManager`. No "generated story" code path exists anywhere below the registry.
2. **The engine never trusts the model.** Every envelope is parsed by the *real* `parse()` and cross-referenced against its own manifest before a single byte lands in `stories/`. A story that would soft-lock, jump to a label that does not exist, or name a character it never declared is rejected and repaired, not shipped.
3. **Nothing about the offline experience regresses.** A static `dist/` with no server behind it boots, lists Lumen, and plays it exactly as it does today. The Create entry simply is not there.

The signature mechanic is the thing worth generating. A `>` / `>!` pair with an `@set` behind each and a guard downstream that *notices* is the whole game; a model that produces six choice menus that reconverge with no consequence has produced a corridor with doors painted on it. Section 8's validator therefore checks for state that is written **and read back**, and section 7's system prompt spends its longest paragraph on it.

---

## 2. Architecture at a glance

```
  BROWSER                                    NODE (vite dev  |  vite preview)
  ┌──────────────────────────────┐           ┌───────────────────────────────────────┐
  │ TitleScreen                  │           │ storygen-plugin.ts                    │
  │   └ CreateStory (modal)      │           │   configureServer / configurePreview  │
  │        │ fetch + SSE reader  │──POST────▶│   ┌ router.ts ────────────────────┐   │
  │        ▼                     │◀─events───│   │ /api/health                   │   │
  │   sse-client.ts              │           │   │ /api/stories                  │   │
  │                              │           │   │ /api/generate-story  (SSE)    │   │
  │ registry.discoverStories()   │──GET─────▶│   │ /api/generate-assets (SSE)    │   │
  │   ├ import.meta.glob (build) │           │   │ /api/jobs/:id/events, DELETE  │   │
  │   └ /api/stories  (runtime)  │           │   │ /stories/**  (static, safe)   │   │
  │         └ merge, runtime wins│           │   └───────────────┬───────────────┘   │
  │                              │           │                   ▼                   │
  │ main.ts  (AppHost)           │           │  pipeline.ts ──▶ providers.ts ──▶ LLM │
  │   storygenHealth()           │           │      │  ▲            (gemini/xai/…)   │
  │   adoptStory(id) ─ reload ───┼──────────▶│      ▼  │ repair ≤2                   │
  └──────────────────────────────┘           │  validate.ts ─▶ parse()  ← src/engine │
                                             │      │                                │
                                             │      ▼                                │
                                             │  write-story.ts ──▶ stories/<id>/     │
                                             │      │                                │
                                             │      ▼                                │
                                             │  art.ts ─▶ tools/lib/gemini-image.mjs │
                                             └───────────────────────────────────────┘
```

Two things to notice about the shape. First, the server imports `src/engine/parser.ts` **directly** — never `src/engine/index.ts`, because that barrel re-exports `registry.ts`, which calls `import.meta.glob` and only exists inside a Vite browser bundle. `parser.ts → lexer.ts → core/types.ts` is a pure, DOM-free, dependency-free chain that esbuild inlines into the config bundle without complaint. Second, the client's only new dependency on the server is *optional*: `discoverStories()` merges runtime results in when they arrive and shrugs when they do not.

---

## 3. The server plugin

### 3.1 Mounting

`src/server/storygen-plugin.ts` exports a factory. `vite.config.ts` becomes:

```ts
import { defineConfig, loadEnv } from 'vite';
import { storygen } from './src/server/storygen-plugin';

export default defineConfig(({ mode }) => ({
  base: './',
  // Empty prefix: loadEnv normally only surfaces VITE_*-prefixed keys, and every
  // key this feature needs is deliberately UN-prefixed so it can never be reached
  // by `import.meta.env` from browser code. The object is handed to the plugin and
  // nowhere else — it is never spread into `define`, and never into process.env.
  plugins: [storygen({ env: loadEnv(mode, process.cwd(), '') })],
  server: { port: 5173, host: '127.0.0.1', strictPort: false, fs: { allow: ['..', '.'] } },
  build: { outDir: 'dist', assetsInlineLimit: 0, target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 2000 },
  assetsInclude: ['**/*.mp3', '**/*.wav', '**/*.ogg'],
}));
```

```ts
export interface StorygenOptions {
  /** Result of vite loadEnv(mode, cwd, ''). Merged under process.env (real env wins). */
  env: Record<string, string>;
  /** Absolute stories root. Default <viteRoot>/stories. Overridable for tests. */
  storiesDir?: string;
}

export function storygen(opts: StorygenOptions): Plugin;
```

The plugin body is small on purpose:

```ts
export function storygen(opts: StorygenOptions): Plugin {
  let ctx: ServerContext;                     // built in configResolved
  const mount = (mw: Connect.Server) => { for (const h of buildHandlers(ctx)) mw.use(h); };
  return {
    name: 'lamplighter:storygen',
    apply: () => true,                        // dev + preview; a no-op in `vite build`
    configResolved(cfg) { ctx = createContext(cfg.root, opts); },
    configureServer(server) { mount(server.middlewares); },
    configurePreviewServer(server) { mount(server.middlewares); },
    buildEnd() { ctx?.jobs.dispose(); },
  };
}
```

**Middleware ordering matters and the choice is deliberate.** `configureServer(server) { ... }` registers *before* Vite's own internal middleware; returning a function from it registers *after*. We use the direct form. For `/api/*` it makes no difference (Vite would 404 them), but for `/stories/**` it is the whole point: in dev, Vite's static middleware would happily serve the same bytes with different headers and a different traversal policy, and the requirement is **one code path in both modes**. Registering first guarantees our handler is the only thing that ever answers a `/stories/` URL, in dev and in preview alike.

`apply: () => true` is required — a plugin defaults to `serve` + `build`, and `configurePreviewServer` only fires for `vite preview`, which Vite classifies separately.

### 3.2 Environment and secrets

`src/server/env.ts` owns every key lookup. Precedence is **request option → `STORYGEN_*` env → provider-specific env → built-in default**, and the merged source is `{ ...opts.env, ...process.env }` so a real shell variable always beats a dotfile.

| Purpose | Variable | Default |
|---|---|---|
| Default provider | `STORYGEN_PROVIDER` | `gemini` |
| Default text model | `STORYGEN_MODEL` | the provider's own default |
| Gemini key | `GEMINI_KEY` (fallback `GEMINI_API_KEY`) | — |
| Gemini text model | `GEMINI_MODEL` | `gemini-3.7-flash` (quality: `gemini-3.1-pro-preview`) |
| Gemini image model | `GEMINI_IMAGE_MODEL` | `gemini-3.1-flash-image` |
| xAI key | `XAI_API_KEY` (fallback `GROK_API_KEY`) | — |
| xAI model | `XAI_MODEL` | `grok-4` |
| OpenAI-compatible key | `OPENAI_API_KEY` | — |
| OpenAI-compatible base | `OPENAI_BASE_URL` | `https://api.openai.com/v1` |
| OpenAI-compatible model | `OPENAI_MODEL` | `gpt-5` |
| Anthropic key | `ANTHROPIC_API_KEY` | — |
| Anthropic model | `ANTHROPIC_MODEL` | `claude-sonnet-5` |
| Stories root override | `STORYGEN_STORIES_DIR` | `<root>/stories` |
| Image backend override | `STORYGEN_IMAGE_BACKEND` | `gemini` \| `mock` \| `none` (auto) |

Three rules, enforced in code rather than by convention:

- **Keys never cross the wire.** `/api/health` reports `configured: boolean` and a model id, never key material. Nothing in `src/server/` is importable from `src/`-browser code, and no key is ever passed through `define`, `import.meta.env`, an SSE payload, or `generation.json`.
- **Keys never enter an error string.** Gemini takes its key as a **query parameter**, so a naive `err.message` that echoes the request URL leaks it into the terminal, into an SSE `error` event, and into the user's screenshot. `src/server/net.ts` exports `redact(s: string): string` which strips `key=…`, `Bearer …`, `x-api-key: …`, and any literal value of a known secret. Every error path in `providers.ts`, `art.ts` and `pipeline.ts` goes through it. `write-story.ts` runs the same pass over `generation.json` before writing.
- **`.env.example` is committed; `.env*` stays gitignored** (already true in `.gitignore`).

### 3.3 Outbound network: the proxy and TLS quirk

This repo's dev environment routes outbound HTTPS through an agent proxy (`HTTPS_PROXY=http://127.0.0.1:…`) with a custom CA at `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`. Two facts decide the design:

- `NODE_EXTRA_CA_CERTS` **is** honoured by `fetch` — it extends Node's default TLS trust store at bootstrap, and undici uses that store. Nothing special is needed.
- `HTTPS_PROXY` is **not** honoured by `fetch` by default. Node 22.22 ships `--use-env-proxy` / `NODE_USE_ENV_PROXY=1`, which is off unless asked for. Without it, every provider call attempts a direct connection and hangs until it times out — the single most likely first-run failure, and the least diagnosable.

`src/server/net.ts` therefore does three things rather than guessing:

```ts
export interface NetProbe { proxy: string | null; honored: boolean }

/** Reported by /api/health and logged once at plugin start. */
export function probeProxy(env: Env): NetProbe;

export interface NetError extends Error {
  code: 'network' | 'tls' | 'proxy' | 'timeout' | 'provider_auth'
      | 'provider_rate_limit' | 'provider_error';
  status?: number;
  hint?: string;      // one actionable sentence, already redacted
}

/** fetch + AbortSignal.timeout + one retry on 429/5xx + error classification. */
export function netFetch(url: string, init: RequestInit, o?: { timeoutMs?: number; retries?: number }): Promise<Response>;
```

`probeProxy` reports `honored` by checking `process.env.NODE_USE_ENV_PROXY` and `process.execArgv` for `--use-env-proxy`. When a proxy is configured and not honoured, the plugin logs one line at startup:

```
[storygen] HTTPS_PROXY is set (127.0.0.1:44855) but this Node process is not using it.
           Start with NODE_USE_ENV_PROXY=1 (Node >= 22.15) or unset HTTPS_PROXY.
```

…and `netFetch` maps `ECONNREFUSED`/`ENOTFOUND`/`ETIMEDOUT` under that condition to `code: 'proxy'` with that same sentence as `hint`, so the *UI* says it too rather than showing "fetch failed". `UNABLE_TO_VERIFY_LEAF_SIGNATURE` / `SELF_SIGNED_CERT_IN_CHAIN` map to `code: 'tls'` with a hint naming `NODE_EXTRA_CA_CERTS`.

We deliberately do **not** add `undici` as a dependency to build a `ProxyAgent`, and we do **not** rewrite `npm run dev` to set the variable (that needs `cross-env` on Windows, a dependency for a one-line problem). Detect, explain, move on.

### 3.4 Typechecking the Node lane

`tsconfig.json` sets `types: ["three","howler","vite/client"]` and excludes `tools`. Node globals are not visible, and adding `"node"` to that array would pour `process`, `Buffer` and friends into browser code. Instead:

- **New `tsconfig.node.json`** — `include: ["src/server", "vite.config.ts"]`, `types: ["node"]`, same strictness, `noEmit`.
- **`tsconfig.json` gains `"exclude": [..., "src/server"]`** so the browser lane never sees Node APIs.
- **`package.json`**: `"typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json"`, and `tools/build-check.mjs` picks that up unchanged since it shells the script.
- **`@types/node` joins `devDependencies`.**

`src/server/types.ts` is the one file both lanes read, and it contains only interfaces — the client imports it with `import type`, which is erased before any Node type is needed.

---

## 4. HTTP contract

Everything below lives in `src/server/types.ts`.

```ts
export type ProviderId = 'gemini' | 'xai' | 'openai-compatible' | 'anthropic' | 'mock';
export type StoryLength = 'short' | 'standard' | 'long';

export type ErrorCode =
  | 'bad_request'          // malformed body, prompt missing/too long, unknown provider
  | 'no_provider'          // requested (or default) provider has no key configured
  | 'provider_auth'        // 401/403 from the provider
  | 'provider_rate_limit'  // 429, after the one retry
  | 'provider_refused'     // safety block / empty candidate / finishReason SAFETY
  | 'provider_error'       // any other non-2xx or unparseable provider response
  | 'network' | 'tls' | 'proxy' | 'timeout'
  | 'invalid_json'         // no JSON envelope could be extracted from the reply
  | 'invalid_output'       // envelope failed validation after the repair budget
  | 'disk'                 // write/rename failed
  | 'cancelled'
  | 'internal';

export interface ApiError { code: ErrorCode; message: string; detail?: string[]; retryable: boolean }
export interface ApiErrorBody { error: ApiError }
```

**Status-code rule, stated once:** anything wrong with the *request* is a JSON 4xx before the stream opens. Anything that goes wrong *during* generation is HTTP 200 `text/event-stream` terminated by an SSE `error` event. This means the client has exactly one error surface once it is streaming, and never has to reconcile a transport failure against a pipeline failure.

### 4.1 `GET /api/health`

```ts
export interface ProviderHealth { configured: boolean; defaultModel: string }

export interface StorygenHealth {
  ok: true;
  /** Contract version. The client refuses to render Create on a mismatch of the major. */
  api: '1.0';
  defaultProvider: ProviderId;
  defaultModel: string;
  providers: Record<ProviderId, ProviderHealth>;   // 'mock' is always { configured: true }
  art: { available: boolean; backend: 'gemini' | 'mock' | 'none'; imageModel: string };
  stories: { dir: string; writable: boolean; count: number };
  proxy: { configured: boolean; honored: boolean } | null;
}
```

`ok` is always `true` when the route answers at all; the client treats *any* failure (404, network error, timeout, non-JSON) as "no server", which is precisely the static-deploy case.

### 4.2 `GET /api/stories`

```ts
export interface RuntimeAssetFile { path: string; mtime: number; size: number }   // path relative to the story dir

export interface RuntimeStoryRecord {
  id: string;
  manifest: StoryManifest;      // from src/core/types
  script: string;               // raw story.pq text
  assets: RuntimeAssetFile[];   // e.g. { path: 'assets/backgrounds/harbour.png', … }
  generated: boolean;           // generation.json present
  updatedAt: number;            // max mtime across manifest/script
}

export interface StoriesResponse { api: '1.0'; stories: RuntimeStoryRecord[] }
```

The walk skips any directory whose name starts with `_` or `.` — the same rule `registry.ts` already applies, so the runtime surface and the build-time surface describe the same library. A directory missing either `story.pq` or `manifest.json`, or whose manifest is not JSON, is skipped with a one-line server warning rather than failing the whole response: one broken folder must not blank the picker.

Assets are enumerated by a bounded recursive walk of `<story>/assets` (depth ≤ 4, ≤ 400 files, extensions `png|jpg|jpeg|webp|mp3|ogg|wav` only). `mtime` exists so the client can cache-bust a regenerated asset.

### 4.3 `POST /api/generate-story`

```ts
export interface GenerateStoryRequest {
  prompt: string;                 // 8..2000 chars after trim
  title?: string;                 // <= 64 chars
  options?: {
    provider?: ProviderId;
    model?: string;               // <= 80 chars, [A-Za-z0-9._:-]
    art?: boolean;                // default: health.art.available
    length?: StoryLength;         // default 'standard'
  };
}
```

`200 text/event-stream` on success (see §5). `400 ApiErrorBody` for a body that cannot be honoured. `413` for a body over 32 KB.

### 4.4 `POST /api/generate-assets`

```ts
export interface GenerateAssetsRequest {
  id: string;                                        // existing story id
  only?: 'backgrounds' | 'characters' | 'cg';
  force?: boolean;                                   // regenerate existing files
}
```

`200 text/event-stream`. `404` when the story does not exist, `409` when an art job is already running for that id.

### 4.5 Jobs

```
GET    /api/jobs/:jobId/events    → SSE; replays the job's buffered log, then streams live
DELETE /api/jobs/:jobId           → { cancelled: true }; sets the job's abort signal
```

A job is **detached from its response**. `POST /api/generate-story` creates the job, starts it, and returns a stream *subscribed* to it. If the client disconnects — the "Begin now" path reloads the page mid-art — the job keeps running and finishes writing PNGs. This is the only reason the registry exists, and the two endpoints above fall out of it for about fifteen lines.

```ts
export type JobState = 'running' | 'done' | 'failed' | 'cancelled';
export interface JobSummary { id: string; kind: 'story' | 'assets'; state: JobState; storyId?: string; startedAt: number; endedAt?: number }
```

`JobRegistry` keeps at most 32 jobs, evicts finished ones after 30 minutes, caps each event log at 512 entries, and refuses to start a second job for the same story id. It is in-memory and dies with the dev server, which is correct: a job is a session-scoped thing.

### 4.6 `GET /stories/**` — static files

`src/server/static.ts`, one handler, both modes:

1. Reject anything containing `\0` or a `%`-decode that yields one.
2. `decodeURIComponent` → strip the query → `path.posix.normalize`.
3. Reject if any segment is `..`, or begins with `_` or `.`. (`_template` therefore has no runtime surface, matching discovery.)
4. `resolved = path.resolve(storiesDir, rel)`; require `resolved === storiesDir || resolved.startsWith(storiesDir + path.sep)`. Belt and braces after step 3.
5. `stat`; a directory is a **404**, never a listing.
6. Content type from a fixed extension map (`png jpg jpeg webp gif svg mp3 ogg wav json`; `.pq` → `text/plain; charset=utf-8`; anything else → `application/octet-stream`).
7. `ETag: W/"<size>-<mtimeMs>"`, `Last-Modified`, `Cache-Control: no-cache` (must-revalidate — files genuinely change under the app), honour `If-None-Match` with a `304`.
8. Stream with `createReadStream`; on stream error after headers, destroy the socket.

Range requests are not implemented. Howler fetches audio as a whole buffer, and no other consumer seeks; this is noted rather than silently omitted.

---

## 5. SSE contract

Because the request is a `POST` with a JSON body, `EventSource` is unusable (it is GET-only). The client reads the response body directly:

```ts
// src/ui/sse-client.ts
export interface SseMessage { event: string; data: unknown }
export async function* readSse(res: Response, signal?: AbortSignal): AsyncGenerator<SseMessage>;
```

Server side (`src/server/sse.ts`) writes `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`, flushes after every frame, and emits a `: ping` comment every 15 s so no intermediary reaps an idle art job.

### 5.1 Event payloads

```ts
export type Stage = 'plan' | 'draft' | 'validate' | 'repair' | 'write' | 'art' | 'done';

export interface EvHello  { jobId: string; kind: 'story' | 'assets'; provider: ProviderId; model: string; art: boolean; startedAt: number }
export interface EvStage  { stage: Stage; message: string; step: number; steps: number }
export interface EvNote   { level: 'info' | 'warn'; message: string }
export interface EvAsset  { index: number; total: number; label: string; path: string;
                            state: 'start' | 'ok' | 'skip' | 'fail'; error?: string }
/** Files are on disk and the story is playable. Fires BEFORE art finishes. */
export interface EvReady  { id: string; title: string; art: 'off' | 'running' }
export interface EvDone   { id: string; title: string; durationMs: number; warnings: string[];
                            art: { generated: number; skipped: number; failed: number } }
export interface EvError  extends ApiError { stage: Stage }

export interface StorygenEvents {
  hello: EvHello; stage: EvStage; note: EvNote; asset: EvAsset;
  ready: EvReady; done: EvDone; error: EvError;
}
```

Ordering guarantees the client may rely on:

- `hello` is always first.
- `stage` is monotonic in `step`; `repair` may repeat (with `message` naming the attempt).
- `ready` fires exactly once, and only after the story directory exists at its final path.
- With `art: false`, `ready` and `done` arrive back to back.
- `error` is terminal; nothing follows it.
- `done` is terminal.

### 5.2 Stage → copy mapping

The UI never invents copy from a stage id; it reads `message` when present and falls back to this table, which is also what `pipeline.ts` sends:

| `stage` | step/steps | Copy shown | Determinate |
|---|---|---|---|
| `plan` | 1/5 | "Reading your premise…" | no |
| `draft` | 2/5 | "Writing the story…" | no |
| `validate` | 3/5 | "Checking the script…" | no |
| `repair` | 3/5 | "Fixing a few loose ends (attempt 1 of 2)…" | no |
| `write` | 4/5 | "Saving the story…" | no |
| `art` | 5/5 | "Painting {label} ({index} of {total})…" | **yes** |
| `done` | 5/5 | "Ready." | — |

`draft` is the long one — twenty to ninety seconds with no sub-progress available, because we deliberately do not stream tokens (§16). The panel carries a live elapsed timer in the mono micro-label style for exactly this stretch: an honest clock beats a fake bar.

---

## 6. Providers

`src/server/providers.ts` exposes one function and nothing else:

```ts
export interface GenerateTextRequest {
  system: string;
  user: string;
  model?: string;
  maxOutputTokens?: number;   // default 16000
  temperature?: number;       // default 0.9 draft / 0.35 repair
  json?: boolean;             // ask for JSON mode where the provider has one
  signal?: AbortSignal;
}
export interface GenerateTextResult {
  text: string;
  provider: ProviderId;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}
export function generateText(env: Env, provider: ProviderId, req: GenerateTextRequest): Promise<GenerateTextResult>;
export function resolveProvider(env: Env, requested?: ProviderId): { provider: ProviderId; model: string };
export function isConfigured(env: Env, provider: ProviderId): boolean;
```

| Provider | Endpoint | Auth | JSON mode |
|---|---|---|---|
| `gemini` | `POST generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=…` | query param | `generationConfig.responseMimeType: 'application/json'` |
| `xai` | `POST api.x.ai/v1/chat/completions` | `Authorization: Bearer` | `response_format: { type: 'json_object' }` |
| `openai-compatible` | `POST {OPENAI_BASE_URL}/chat/completions` | `Authorization: Bearer` | `response_format: { type: 'json_object' }` |
| `anthropic` | `POST api.anthropic.com/v1/messages` | `x-api-key` + `anthropic-version: 2023-06-01` | none — assistant prefill |
| `mock` | none | none | n/a |

Shape notes that will otherwise cost an afternoon each:

- **Gemini** puts the system prompt in `systemInstruction: { parts: [{ text }] }`, not in `contents`. Text comes back as `candidates[0].content.parts[].text` — *join all parts*, do not take `[0]`. A refusal surfaces either as `promptFeedback.blockReason` or `candidates[0].finishReason === 'SAFETY'`; both map to `provider_refused`. `finishReason === 'MAX_TOKENS'` maps to `provider_error` with a hint to lower `length`.
- **Anthropic** has no JSON mode. When `json: true` we append an assistant turn prefilled with `{`, and **re-prepend that `{`** to the response text — forgetting to is the classic bug. `content[]` is filtered to `type === 'text'` and joined. `stop_reason === 'max_tokens'` maps like Gemini's.
- **openai-compatible** has no universal default model, because the endpoint may be Ollama, LM Studio or OpenRouter. It falls back to `gpt-5` and the health payload surfaces whatever is resolved so the Create panel can show it.
- Every provider's raw reply goes through **one** extractor:

```ts
/** Accepts raw JSON, ```json fences, a fenced block anywhere in prose, or a
 *  brace-balanced span. Returns the first parseable object, or throws 'invalid_json'. */
export function extractEnvelope(raw: string): unknown;
```

### 6.1 The `mock` provider

`mock` makes no network call, ignores the premise, and returns a fixed envelope from `src/server/mock-story.ts`. It exists so that the whole pipeline — extract → validate → repair path → write → discover → play — runs offline, deterministically, in CI and on a plane. It is *not* a stub: the story it returns is a real one that passes every validator rule at the `short` profile, with six choice menus, meaningful state and two endings reached through a guarded chain, so the e2e suite has something worth playing.

**`src/server/mock-story.ts` — manifest**

```jsonc
{
  "id": "signal-hill",
  "title": "Signal Hill",
  "subtitle": "One night on the north light",
  "author": "Lamplighter",
  "synopsis": "You keep the overnight radio watch on an island with one ferry a day. Tonight one voice comes up on the open channel, and she has a bag packed and until dawn to decide whether to use it.",
  "entry": "signal_open",
  "narrator": "Watch",
  "cover": "cover_key",
  "credits": ["Signal Hill", "", "Written by Lamplighter", "Made with Lamplighter"],
  "artStyle": "Painterly cinematic still, cold North Atlantic palette of slate grey and lamp amber, wet light, soft sea haze, filmic grain, shallow depth of field, consistent character identity; no text, no UI, no border, no watermark.",
  "theme": {
    "key": "#86b0bd", "accent": "#d9a05f", "ink": "#e9eef1", "paper": "#0c1215",
    "grade": { "splitTone": 0.3, "contrast": 1.06, "saturation": 0.92 },
    "bloom": 0.7, "vignette": 0.42, "grain": 0.45
  },
  "characters": {
    "wren": {
      "name": "Wren", "color": "#d9a05f", "defaultPose": "guarded", "home": "right", "scale": 1.0,
      "description": "A woman in her late thirties, close-cropped grey-blonde hair, a salt-stained navy fisherman's jumper under an open oilskin, chapped hands. Lit by the amber wash of a radio set against a cold blue night. Wardrobe and lighting identical in every pose.",
      "poses": {
        "guarded": { "prompt": "Portrait of Wren — restate the description — jaw set, eyes level, holding the handset a little too tightly. Chest-up, painterly, opaque dark neutral backdrop." },
        "thawing": { "prompt": "Portrait of Wren — restate the description — the set of her mouth loosening, gaze off to the side. Chest-up, painterly, opaque dark neutral backdrop." },
        "decided": { "prompt": "Portrait of Wren — restate the description — chin up, clear-eyed, the first grey light on one cheek. Chest-up, painterly, opaque dark neutral backdrop." }
      }
    }
  },
  "backgrounds": {
    "radio_room": { "prompt": "A cramped island radio room at night, one amber dial glow, charts pinned to a damp wall, black window streaming with rain. Landscape, no people.", "parallax": 0.05, "focus": 0.5 },
    "harbour_dawn": { "prompt": "A small stone harbour at first light, one ferry at the pier with its lamps still on, flat grey water, gulls, thin mist lifting. Landscape, no people.", "parallax": 0.06, "focus": 0.68 }
  },
  "cg": { "cover_key": { "prompt": "Key art: a lit radio-room window on a black headland above a harbour, one warm square in a great deal of dark. No people." } },
  "music": { "watch_theme": { "synth": "pad", "loop": true, "volume": 0.5 } },
  "ambience": { "sea_rain": { "synth": "rain", "loop": true, "volume": 0.45 },
                "room_tone": { "synth": "hum", "loop": true, "volume": 0.3 } },
  "sfx": { "chime": { "synth": "chime", "volume": 0.6 }, "click": { "synth": "click", "volume": 0.5 } },
  "vars": { "trust": 0, "steady": 3 }
}
```

**`src/server/mock-story.ts` — script**

```
:: signal_open
@chapter "Signal Hill" "One night on the north light"
@bg radio_room mood:night
@weather rain intensity:0.55
@ambience sea_rain fade:2
@music watch_theme fade:4
@camera push zoom:1.04 duration:8
| The set has been quiet since eleven. You have the watch, the rain, and a mug going cold.
@sfx chime
| Channel sixteen opens. Somebody breathes into it for four full seconds before they speak.
@enter wren from:right pose:guarded
wren: North light, this is Wren off the Kittiwake. You are not going to want this call.
> "North light receiving. Go ahead, Wren." -> open_script
>! "I have got all night and nothing in it. Go on." -> open_own

:: open_script
wren: Right. Good. Procedure. I can do procedure.
-> the_ferry

:: open_own
@set trust += 1
@set steady -= 1
wren: ...That is not the voice they train you to use.
wren: All right. All right, then.
-> the_ferry

:: the_ferry
@pose wren guarded
wren: There is a ferry at six ten. I have a bag by the door and I have had it there since Tuesday.
wren: I am not asking anybody's permission. I want that understood.
| Under the flatness her voice is doing careful work to stay level.
wren: You are not going to say anything, are you. {steady>=3}
> "Nobody is asking you to explain a bag." -> ferry_plan
>! "You called a radio at three in the morning to tell me you are not asking permission." -> ferry_true
>? "Where would the six ten take you?" -> ferry_ask

:: ferry_plan
wren: Thank you. Genuinely.
-> the_box

:: ferry_true
@set trust += 1
@set steady -= 1
@pose wren thawing
wren: ...Yes. I did do that.
wren: You could have let that sit.
-> the_box

:: ferry_ask
wren: Mainland. Then a bus. Then my sister, who has been waiting eleven years to be right about this.
-> the_box

:: the_box
@pose wren thawing
wren: There is a box under the chart table. My father's. I have not opened it since the funeral.
wren: I keep thinking whatever is in it decides this.
> "It does not get to decide. You do." -> box_leave
>! "Then open it while I am here, and you will not have to do it alone." -> box_open
>! "You already know what is in it. That is why it is still shut." -> box_read {trust>=2}

:: box_leave
@set steady += 1
wren: Maybe. Maybe that is the sensible way round.
-> dawn

:: box_open
@set trust += 1
@sfx click
| Something wooden gives. Paper. A long pause with weather in it.
wren: Charts. Just his charts. Every crossing he ever made, in pencil, in a hand I would know anywhere.
-> dawn

:: box_read
@set trust += 1
@pose wren decided
wren: ...That is a rotten thing to be right about.
wren: It is charts. I have always known it is charts. He never wrote a word down in his life.
-> dawn

:: dawn
@chapter "Six Ten"
@fx dissolve
@bg harbour_dawn mood:dawn
@weather none
@ambience room_tone fade:3
@camera pan-right zoom:1.03 duration:7
@wait 1
| The rain stops the way it always does here: all at once, and without ceremony.
wren: The pier lights just came on. That is them warming her up.
> "You still have twenty minutes." -> dawn_kind
>! "You have been on this channel four hours to avoid twenty minutes." -> dawn_true

:: dawn_kind
wren: Twenty minutes. Yes.
-> the_ask

:: dawn_true
@set trust += 1
@set steady -= 1
@pose wren decided
wren: God. Yes. Obviously.
-> the_ask

:: the_ask
wren: Say the thing. Whatever the thing is that you people say.
> "Whatever you decide, you will have decided it." -> ask_stay
>! "Get on the boat, Wren." -> ask_go
>! "I am not going to tell you. But I will stay on until she casts off." -> ask_silent {trust>=3}

:: ask_stay
wren: That is very even-handed of you.
-> last_light

:: ask_go
@set trust += 1
wren: ...You are not allowed to say that.
wren: Say it again.
-> last_light

:: ask_silent
@set trust += 1
@set steady -= 1
wren: You will stay on.
wren: All right.
-> last_light

:: last_light
| Gulls. An engine finding its note across the water.
wren: North light. Are you still there.
> "Still here. North light standing by." -> close_plain
>! "Still here, Wren." -> close_warm

:: close_warm
@set trust += 1
-> ending_ferry {trust>=4}
-> ending_harbour

:: close_plain
-> ending_ferry {trust>=4}
-> ending_harbour

:: ending_ferry
@pose wren decided
wren: Then you can hear this. That is my boots on the ramp.
| The channel stays open a while after she stops talking. You let it.
@music stop fade:5
| Six ten. On time, for once in its life.
-> END

:: ending_harbour
@exit wren to:right
| The channel closes with a click and no goodbye, which is its own kind of answer.
| At six ten the ferry goes without her. At six eleven the light on the pier goes out.
@music stop fade:5
| You write the log. Nothing to report.
-> END
```

Counted against the `short` profile: 20 labels, 6 choice menus, 10 `@set` lines over 2 vars, 4 guards, 2 endings via a guarded chain, 2 backgrounds, 1 character × 3 poses, 1 cg. It validates.

---

## 7. The system prompt

This is the heart of the feature. It lives in `src/server/prompt.ts` as `SYSTEM_PROMPT`, a single template literal, and it is versioned (`PROMPT_VERSION = '1.0'`, recorded in `generation.json`) because changing it changes what the anthology is.

It is a condensed `docs/AUTHORING.md` — every construct, none of the prose — plus the things a human author absorbs from reading Lumen and a model cannot: that state has to be *read back*, that a choice which changes nothing is not a choice, and that the asset budget is real money.

````text
You are the staff writer and art director for LAMPLIGHTER, a cinematic visual-novel
engine. You write complete, playable, branching stories in its authoring format.

## OUTPUT CONTRACT — read this twice

Return ONE JSON object and nothing else. No prose, no markdown, no code fences.

{ "manifest": { ... }, "script": "..." }

"script" is the ENTIRE story.pq file as one JSON string (use \n for newlines).
"manifest" is the story's manifest.json as a JSON object.
Any other top-level key is an error. Your output goes straight into a parser: a
single stray sentence outside the JSON destroys it.

## PART 1 — PQScript (the "script" string)

Line-based. One statement per line. "#" starts a comment. Blank lines are ignored.

LABELS AND FLOW
  :: label_name          declare a scene / jump target   (lowercase a-z 0-9 _)
  -> label_name          jump
  -> label_name {guard}  conditional jump; the FIRST line whose guard passes wins
  -> END                 finish the story and roll the credits

DIALOGUE
  speaker: text          spoken by character key "speaker" (must exist in manifest)
  | text                 narration, no speaker — always prefer the leading pipe
  speaker: text {guard}  the line is shown only when the guard is true

CHOICES — the signature mechanic
  > "line" -> target     SUGGESTED: the safe, composed, on-script thing to say
  >! "line" -> target    OFF-SCRIPT: the player's own words. Riskier. More human.
  >? "line" -> target    NEUTRAL: a plain branch, for stories where the
                         suggested/off-script tension does not apply
  Consecutive choice lines form ONE menu. Each option may carry a trailing
  {guard}; options whose guard is false are hidden. Two to four options per menu.

STAGING
  @bg <bgId> [mood:<word>]
  @enter <char> [from:left|right|center] [pose:<pose>]
  @exit  <char> [to:left|right|center]
  @pose  <char> <pose>
  @move  <char> to:left|center|right
  @weather none|rain|snow|dust|fog [intensity:0..1]
  @camera push|pull|pan-left|pan-right|still [zoom:1.0..1.12] [duration:<seconds>]
  @fx flash|shake|dissolve|glitch
  @chapter "Title" ["Subtitle"]
  @wait <seconds>

AUDIO — every id must exist in the manifest
  @music <id> [fade:<s>]      @music stop [fade:<s>]
  @ambience <id> [fade:<s>]   @ambience stop [fade:<s>]
  @sfx <id>

STATE
  @set var = 4     @set var += 1     @set var -= 1     @set flag = true
  Variables are numbers or booleans and default to 0 / false.
  Guards: {trust>=3}  {saw_letter}  {trust>=2 && steady<2}  {awake==true}
  Comparisons == != < <= > >= ; combine with && and ||.

## PART 2 — the manifest object

{
  "id": "kebab-case-slug",             // lowercase a-z 0-9 and -, 3..40 chars, from the title
  "title": "Title Case",               // <= 48 characters
  "subtitle": "one short line",
  "author": "Lamplighter",
  "synopsis": "Two to four sentences. Present tense. No spoilers.",
  "entry": "<a label that exists in the script>",
  "narrator": "optional nameplate for narration lines; omit if unsure",
  "cover": "<a key in cg>",
  "credits": ["Title", "", "Written by Lamplighter", "Made with Lamplighter"],
  "artStyle": "ONE strong art-director sentence — medium, palette, light,
     rendering, framing. It is prepended to EVERY image prompt, so it is the
     only thing making the art cohere. It MUST end with exactly:
     no text, no UI, no border, no watermark.",
  "theme": {
    "key":    "#rrggbb",   // cool signal accent: UI highlights, focus, the proxy panel
    "accent": "#rrggbb",   // warm human accent: nameplates, off-script lines
    "ink":    "#rrggbb",   // near-white reading colour
    "paper":  "#rrggbb",   // near-black panel base
    "grade":  { "splitTone": 0..1, "contrast": 0.9..1.2, "saturation": 0.7..1.2 },
    "bloom": 0..2, "vignette": 0..1, "grain": 0..1
  },
  "characters": {
    "<charKey>": {                     // lowercase; this is what you type as "speaker:"
      "name": "Display Name",
      "color": "#rrggbb",
      "description": "ONE paragraph fixing identity across every pose: age,
        build, hair, wardrobe, and the light falling on them. Wardrobe and
        lighting NEVER change between poses. Only the expression changes.",
      "defaultPose": "<pose key>",
      "home": "left|center|right",
      "scale": 1.0,
      "poses": {
        "<poseKey>": { "prompt": "Portrait of <Name> — RESTATE the description
          in full — <this one expression>. Chest-up portrait framing, painterly,
          shallow depth of field, opaque dark neutral backdrop so the figure
          composites over a scene. No text, no UI, no border." }
      }
    }
  },
  "backgrounds": {
    "<bgId>": { "prompt": "A place. NO PEOPLE. Landscape composition, ...",
                "parallax": 0.04..0.08, "focus": 0.4..0.75 }
  },
  "cg": { "<key>": { "prompt": "Key art. No people, or one distant silhouette." } },
  "music":    { "<id>": { "synth": "pad|drone|tone",        "loop": true, "volume": 0.4..0.7 } },
  "ambience": { "<id>": { "synth": "rain|hum|wind|drone",   "loop": true, "volume": 0.3..0.6 } },
  "sfx":      { "<id>": { "synth": "chime|click|tone",      "volume": 0.5..0.8 } },
  "vars":     { "<var>": 0 }
}

Audio is PROCEDURAL ONLY. The synth presets are exactly:
  pad, drone, rain, hum, wind, chime, click, tone
Never use a "file" key anywhere in the manifest — there are no binary assets to
point at. Backgrounds are SINGLE-LAYER: never emit "layers" or "files".

## PART 3 — hard requirements. Your work is auto-rejected without them.

STRUCTURE
 1. Every "-> target", every choice target, and "entry" names a label that exists
    in the script (or the literal END). Every label you declare is reachable from
    "entry". No orphans.
 2. AT LEAST TWO DISTINCT ENDINGS. Each is its own label, each is reached through
    a GUARDED JUMP CHAIN, each finishes with "-> END":
        -> ending_warm  {trust>=4}
        -> ending_cool
 3. Never write a label whose only content is a jump. Never write a cycle that
    contains no dialogue and no choice — it is an infinite loop.

DECLARATIONS
 4. Every "speaker:" key, every character and pose named by @enter / @pose /
    @move / @exit, every @bg id, and every @music / @ambience / @sfx id is
    declared in the manifest. Poses must exist on that character.

STATE THAT MATTERS — this is the part that decides whether the story is any good
 5. Declare two to four vars. Mutate them with @set after MOST choices, and read
    them back with guards.
 6. The state must change the STORY, not merely the ending. Use guards to swap a
    line of dialogue, to unlock a fourth option a colder player never sees, or to
    open a scene that otherwise does not happen. If every branch reconverges with
    nothing visibly different, you have written a corridor with doors painted on
    it. Rewrite it.
 7. Suggested (">") and off-script (">!") must cost different things. The
    convention that works: ">" is safe and keeps composure; ">!" spends composure
    for a chance at real trust. Make the trade legible in the writing.

ASSET BUDGET — every entry below becomes one generated image. Stay inside it.
 8. Two to four backgrounds. One to three characters, two to four poses each.
    One or two cg entries, one of which is named by "cover". An optional
    "title_backdrop" is a 16:9 plate composed with EMPTY SPACE IN THE LEFT THIRD
    for a logotype.
 9. Every background, pose and cg entry has a non-empty "prompt".

CRAFT
10. Open on a concrete image, never on exposition. One @chapter card per act.
11. Give the player something to lose. Choices that all lead somewhere pleasant
    are not choices.
12. Prose is spare. No purple weather, no em-dash pileups, no "little did they
    know". Speech carries subtext; narration carries the room.
13. No on-screen text in any image prompt. No brand names, no real people, no
    living public figures.

## PART 4 — the shape of a scene

:: harbour_night
@bg harbour mood:night
@weather rain intensity:0.5
@ambience surf fade:2
@enter mara from:right pose:guarded
mara: You came. I had a whole speech ready for if you didn't.
| The letter is in her coat pocket. You can see the corner of it.
> "I'm here now. Start wherever you want." -> mara_soft
>! "You've been holding that letter for an hour." -> mara_letter
>? "Let's walk." -> harbour_walk

:: mara_letter
@set trust += 1
@set composure -= 1
@pose mara startled
mara: ...You were watching my hands.
mara: Fine. Then you can hear what's in it. {trust>=1}
-> harbour_walk

## PART 5 — check every box before you answer

[ ] Valid JSON. Exactly the keys "manifest" and "script". No fences, no preamble.
[ ] "entry" exists. Every jump and choice target exists. Every label is reachable.
[ ] Every speaker, background, character, pose, music, ambience and sfx id is
    declared in the manifest.
[ ] The requested number of choice menus, at least two of which offer ">!".
[ ] At least six @set lines over at least two vars, and at least three guards
    that read them back.
[ ] Two or more endings, each reached through a guarded jump chain.
[ ] Inside the asset budget. Every prompt non-empty.
[ ] artStyle ends with: no text, no UI, no border, no watermark.
[ ] Only these synths: pad, drone, rain, hum, wind, chime, click, tone.

Write the story you would want to sit down with at two in the morning.
Then return the JSON.
````

### 7.1 The user message

```ts
export interface UserMessageInput { prompt: string; title?: string; length: StoryLength }
export function buildUserMessage(i: UserMessageInput): string;
```

```text
PREMISE
----
<the user's prompt, verbatim>
----

TITLE
<the user's title, or: "Choose one that earns the story.">

SIZE — this run
<profile line from the table below>

Write the complete story now. Return only the JSON object.
```

The profile line is generated from §8.1's table, e.g. for `standard`:

```text
180-300 script lines. 7-10 choice menus. 3-4 backgrounds. 1-2 characters with
3 poses each. 2-3 endings. 2-4 chapter cards.
```

Injecting the numbers here rather than hard-coding them in the system prompt means the profile is a single source of truth shared by the prompt *and* the validator — the model is asked for exactly what it will be measured against.

### 7.2 The repair message

```ts
export function buildRepairMessage(previousRaw: string, issues: Issue[]): string;
```

```text
Your previous answer was rejected by the validator. Here is exactly what failed.

 1. [TARGET_MISSING] jump to "ending_true" but no such label — script line 214
 2. [SPEAKER_UNDECLARED] speaker "callum" is not in manifest.characters — line 88
 3. [ENDINGS_TOO_FEW] only 1 reachable ending; at least 2 are required

Here is your previous answer, unchanged:
<raw>

Fix every issue listed. Change nothing else. Return the COMPLETE corrected JSON
object — both "manifest" and "script" — not a patch and not an explanation.
```

---

## 8. Validation

`src/server/validate.ts` is **pure**: envelope in, `ValidationResult` out. No filesystem, no network, no clock. That is what makes it directly unit-testable from Node (§14.2).

```ts
export type Severity = 'fatal' | 'warn';

export interface Issue {
  code: IssueCode;
  severity: Severity;
  message: string;
  /** 1-based script line where the problem is, when it is locatable. */
  line?: number;
  /** Dotted manifest path, e.g. "characters.wren.poses.tired". */
  at?: string;
}

export interface StoryEnvelope { manifest: StoryManifest; script: string }

export interface ValidationResult {
  ok: boolean;                 // no fatal issues
  issues: Issue[];
  /** Present when ok — the parsed script, so the caller need not re-parse. */
  parsed?: ParsedStory;
  stats: {
    labels: number; lines: number; menus: number; offscriptOptions: number;
    sets: number; guards: number; endings: number; vars: number;
    backgrounds: number; characters: number; poses: number; cg: number; images: number;
  };
}

export function validateEnvelope(raw: unknown, profile: LengthProfile): ValidationResult;
```

### 8.1 Length profiles

The profile is chosen by the request's `length`, injected into the user message (§7.1) and enforced here. One table, two consumers.

| profile | script lines | choice menus | backgrounds | characters | poses/char | endings | labels | image budget |
|---|---|---|---|---|---|---|---|---|
| `short` | 100–200 | 5–8 | 2–3 | 1 | 2–3 | 2–3 | 8–28 | ≤ 8 |
| `standard` | 150–300 | 6–10 | 2–4 | 1–2 | 2–4 | 2–4 | 8–28 | ≤ 14 |
| `long` | 240–380 | 8–14 | 3–4 | 2–3 | 2–4 | 3–5 | 8–28 | ≤ 20 |

`images = Σ backgrounds + Σ poses + Σ cg`. The cap is a cost and time cap, not an aesthetic one, and it is why the ceiling is enforced as fatal.

### 8.2 The checklist

| # | Code | Rule | Sev |
|---|---|---|---|
| 1 | `ENVELOPE_SHAPE` | Top level is an object with exactly `manifest` (object) and `script` (non-empty string) | fatal |
| 2 | `ID_INVALID` | `manifest.id` matches `^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$`; auto-slugified from `title` when absent, fatal when neither yields one | fatal |
| 3 | `TITLE_INVALID` | `title` is a 1–48 char non-empty string | fatal |
| 4 | `THEME_COLOR` | `theme.key/accent/ink/paper` each match `^#[0-9a-fA-F]{6}$` | fatal |
| 5 | `THEME_RANGE` | `grade.contrast/saturation`, `bloom`, `vignette`, `grain` inside documented ranges | warn (clamped) |
| 6 | `PARSE_WARNING` | `parse(script).warnings` is empty. A human author gets tolerance; a generator gets none | fatal |
| 7 | `LABELS_COUNT` | Label count inside the profile band | fatal |
| 8 | `ENTRY_MISSING` | `manifest.entry` is a declared label (falls back to `parsed.entry` with a `warn`) | fatal |
| 9 | `TARGET_MISSING` | Every `jump.target` and every `choice.options[].target` is a declared label or `END` | fatal |
| 10 | `LABEL_ORPHAN` | Every declared label is reachable from `entry` via jump + choice edges (BFS) | fatal |
| 11 | `SPEAKER_UNDECLARED` | Every `say.speaker` is a key in `manifest.characters` | fatal |
| 12 | `CHAR_UNDECLARED` | Every `@enter/@exit/@pose/@move` character is declared | fatal |
| 13 | `POSE_UNDECLARED` | Every pose named by `@enter`/`@pose`, and every `defaultPose`, exists on that character | fatal |
| 14 | `BG_UNDECLARED` | Every `@bg` id is a key in `manifest.backgrounds` | fatal |
| 15 | `AUDIO_UNDECLARED` | Every non-null `@music`/`@ambience`/`@sfx` id exists in the matching manifest map | fatal |
| 16 | `SYNTH_UNKNOWN` | Every audio entry's `synth` ∈ {pad, drone, rain, hum, wind, chime, click, tone} | fatal |
| 17 | `FILE_KEY_PRESENT` | No `file` / `files` / `layers` key anywhere in the manifest | fatal |
| 18 | `MENUS_COUNT` | Choice-node count inside the profile band | fatal |
| 19 | `OFFSCRIPT_TOO_FEW` | ≥ 2 options with `kind === 'offscript'` | fatal |
| 20 | `SETS_TOO_FEW` | ≥ 6 `@set` nodes across ≥ 2 distinct targets | fatal |
| 21 | `GUARDS_TOO_FEW` | ≥ 3 guarded nodes (say / choice option / jump) | fatal |
| 22 | `GUARD_UNKNOWN_VAR` | Every identifier in every guard is a key of `manifest.vars` ∪ `@set` targets. An unknown identifier silently evaluates to 0 and is a whole bug class | fatal |
| 23 | `GUARD_UNPARSEABLE` | `evalGuard(g, {})` completes without throwing for every guard | fatal |
| 24 | `ENDINGS_TOO_FEW` | Distinct reachable labels containing `-> END` ≥ profile minimum | fatal |
| 25 | `ENDING_UNGUARDED` | At least one guarded jump chain (≥ 2 consecutive jumps, ≥ 1 guarded) reaches an ending | warn |
| 26 | `CYCLE_NO_PROGRESS` | No reachable cycle consists solely of `jump`/`set`/staging nodes — that is an infinite loop the Runtime's `STEP_CAP` would abort | fatal |
| 27 | `LINES_RANGE` | Non-blank, non-comment script lines inside the profile band | fatal |
| 28 | `ASSET_BUDGET` | Backgrounds / characters / poses / cg counts inside the profile bands, and `images ≤ cap` | fatal |
| 29 | `COVER_MISSING` | `manifest.cover` is a key of `manifest.cg` | fatal |
| 30 | `PROMPT_EMPTY` | Every background, pose and cg entry has a non-empty `prompt` ≥ 24 chars | fatal |
| 31 | `ARTSTYLE_SUFFIX` | `artStyle` is ≥ 40 chars and ends with `no text, no UI, no border, no watermark.` (case-insensitive, trailing period optional) | warn (auto-appended) |
| 32 | `TEXT_HYGIENE` | No script line > 320 chars, no tab characters, no leftover markdown fence, no unbalanced `"` in a choice line | fatal |
| 33 | `VARS_COUNT` | 2–5 entries in `manifest.vars`, all number or boolean | fatal |
| 34 | `CREDITS_SHAPE` | `credits` is an array of ≤ 24 strings (defaulted when absent) | warn |

**Auto-repairs applied before issues are raised**, because they are unambiguous and asking a model to burn a round-trip on them is waste: slugify `id`; append the missing `artStyle` suffix; clamp out-of-range theme numbers; default `credits`, `author`, `home`, `scale`, `defaultPose`, `parallax`, `focus`; drop unknown top-level manifest keys. Each auto-repair emits a `warn` issue so it lands in `generation.json` and in the `done` event's `warnings[]`.

### 8.3 The repair loop

```
attempt 0 ── generateText(temperature 0.9) ──▶ extractEnvelope ──▶ validate
                                                     │ ok            │ fatal
                                                     ▼               ▼
                                                   write      attempt 1 ── buildRepairMessage(raw, fatalIssues)
                                                                       ── generateText(temperature 0.35) ──▶ …
                                                                             │ ok      │ fatal
                                                                             ▼         ▼
                                                                           write   attempt 2 (same, last chance)
                                                                                       │ fatal
                                                                                       ▼
                                                                                  error: invalid_output
```

Policy, stated so it is not re-litigated in review:

- **Budget: 2 repairs, 3 model calls maximum.** A model that cannot satisfy a mechanical checklist in three tries is not going to on the fourth, and the user is watching a spinner.
- **Only `fatal` issues enter the repair message.** Warnings are already fixed; sending them invites the model to "fix" things that are fine.
- **Cap the list at 12 issues**, ordered structure-first (codes 1–17 before 18–34), because a 40-item list produces a rewrite rather than a repair.
- **Temperature drops** 0.9 → 0.35 on repair. The first call wants a writer; the repairs want a clerk.
- **`invalid_json` also consumes a repair**, with a message that says only "your reply was not a single JSON object" plus the first 400 characters received.
- **The last attempt wins.** No scoring across attempts, no cherry-picking. On final failure the error carries `detail: string[]` — the last attempt's fatal issues, formatted — which the panel shows in a collapsible list. The user's premise is never lost.
- Every attempt's raw output is retained in memory for the life of the job and written to `generation.json` as `attempts[].issues` (issue codes only, not raw text — the file stays readable).

**Addendum 2026-08-18.** Live testing against `gemini-3.7-flash` at the `standard` profile found attempt 0 stochastically missing `GUARDS_TOO_FEW` (occasionally `MENUS_COUNT` too) more often than the original 2-repair budget assumed — usually one repair round fixes it, but occasionally draft + both repairs are ALL rejected, and the user saw a terminal "The draft didn't hold together." Two changes, together:

1. The per-run SIZE line (§7.1) and PART 3's "STATE THAT MATTERS" block now state the state minimums explicitly instead of only checking for them after the fact — "At least 6 @set mutations over 2+ vars, and at least 3 guards that read them back…" — sourced from `STATE_SETS_MIN` / `STATE_SET_VARS_MIN` / `STATE_GUARDS_MIN`, three constants lifted out of `validate.ts`'s `SETS_TOO_FEW`/`GUARDS_TOO_FEW` checks into their own leaf module, `src/server/limits.ts`, so the prompt and the validator read the same numbers and can never drift. `PROMPT_VERSION` moved `1.0` → `1.1` accordingly.
2. When the draft and both of its repairs are all rejected, `pipeline.ts` no longer fails immediately. It runs ONE full fresh redraft — a new `generateText` call at draft temperature (0.9: fresh randomness, not a repair of the rejected text) — with its own 2-repair budget, and only then fails for real if that second round is also rejected on every attempt. Bounded worst case rises from 3 model calls to 6. The redraft reuses the `draft` stage (message "Starting over with a fresh draft…"), emitted at `step: 3` rather than `step: 2` — §5.1's ordering guarantee is that `step` never goes backward, 2 belongs to this run's one opening draft, and 3 is already in use by its repair/validate events, so the redraft's `draft` event legally repeats it instead. `generation.json`'s `attempts[]` keeps counting through the redraft (indexes 3, 4, 5) rather than resetting, so a redrafted run's history reads as one continuous story, not two.

The redraft runs at the same temperature (0.9) as the original draft, so under `STORYGEN_MOCK_BREAK=targets` it is indistinguishable from a draft call to the `mock` provider's own temperature-based detection (§6.1) and would be broken again if it ever fired. It does not fire in scenario F (§14.1): the injected `TARGET_MISSING` defect is fixed by repair 1, which runs at 0.35, one full round before a redraft could ever be reached.

---

## 9. Writing the story to disk

`src/server/write-story.ts`.

```ts
export interface WriteResult { id: string; dir: string; renamedFrom?: string }
export function writeStory(ctx: ServerContext, env: StoryEnvelope, meta: GenerationMeta): Promise<WriteResult>;
```

1. **Resolve the id.** Slugify `manifest.id` (lowercase, non-alphanumerics → `-`, collapse, trim, 40 chars). Reject the reserved set: empty, `_template`, anything starting with `_` or `.`, `assets`, `node_modules`. On collision with an existing directory, append `-2`, `-3` … up to `-99`, then fail with `id_conflict`. The chosen id is written back into the manifest before serialisation, so the folder name and `manifest.id` can never disagree.
2. **Write to a staging directory, then rename.** `stories/_gen-<id>-<rand>/` receives every file, then `fs.rename` into `stories/<id>/`. This matters more than it looks: Vite's watcher and our own `/api/stories` walker both scan `stories/` continuously, and a directory that exists for 40 ms with a `manifest.json` and no `story.pq` yet is a story that appears broken in the picker. The `_` prefix means the staging directory is invisible to *both* discovery paths for its whole short life, and `rename` within one filesystem is atomic.
3. **Files written:**

```
stories/<id>/
  story.pq                    exactly the validated script, LF, single trailing newline
  manifest.json               JSON.stringify(manifest, null, 2) + '\n'   (matches new-story.mjs)
  generation.json             provenance (below)
  assets/backgrounds/.gitkeep
  assets/characters/<char>/.gitkeep     one per declared character
  assets/cg/.gitkeep
  assets/audio/.gitkeep
```

The `.gitkeep` skeleton is copied from `tools/new-story.mjs` verbatim so a generated story and a scaffolded story have byte-identical folder shapes.

4. **`generation.json` is committed.** It carries no secrets and it is the provenance of the story — which premise, which model, which prompt version produced this text. That is exactly the argument the project already makes for keeping image prompts in the manifest: *the prompts are the source*. A story you cannot trace is a story you cannot regenerate.

```ts
export interface GenerationMeta {
  schema: 1;
  createdAt: string;              // ISO
  prompt: string;                 // the user's premise, verbatim
  title?: string;
  length: StoryLength;
  provider: ProviderId;
  model: string;
  promptVersion: string;          // PROMPT_VERSION
  durationMs: number;
  attempts: Array<{ index: number; ok: boolean; issues: string[] }>;   // codes only
  warnings: string[];
  art: {
    requested: boolean;
    backend: 'gemini' | 'mock' | 'none';
    imageModel?: string;
    state: 'off' | 'running' | 'done' | 'partial' | 'failed';
    assets: Array<{ path: string; state: 'ok' | 'skip' | 'fail'; error?: string }>;
  };
}
```

The whole object passes through `redact()` before serialisation. `art` is rewritten in place when the art job finishes, which is also how a later `/api/generate-assets` run knows what already succeeded.

5. **Failure handling.** Any error after staging begins removes the staging directory. A failed `rename` (EEXIST from a racing second job) retries id resolution once, then reports `id_conflict`. Anything else reports `disk` with the errno in `hint`.

---

## 10. Art generation

### 10.1 Sharing with `tools/gen-assets.mjs`

The constraint that decides the design: `npm run gen-assets` runs `node tools/gen-assets.mjs` **with no build step**, and it must keep doing so. So the shared code is dependency-free ESM under `tools/lib/`, and the TypeScript plugin imports it.

```
tools/lib/asset-plan.mjs      manifest -> job list. Pure. The single source of asset paths and prompt parts.
tools/lib/asset-plan.d.mts    hand-written declarations for the plugin's typecheck.
tools/lib/gemini-image.mjs    one Gemini image request -> PNG bytes on disk. Node builtins only.
tools/lib/gemini-image.d.mts  ditto.
```

The declaration files must be `.d.mts`, not `.d.ts`: TypeScript maps a `./x.mjs` specifier to `./x.d.mts`. They are pulled in by the import even though `tools/` is excluded from both tsconfigs — `exclude` filters the initial file set, not files reached through imports.

`asset-plan.mjs` is `gen-assets.mjs`'s current job-building block, lifted unchanged:

```js
/** @returns {AssetJob[]} */
export function planAssets(manifest, { only = null, storyId = '' } = {});
export const DEFAULT_STYLE, ASPECT;      // moved here; gen-assets re-exports for compatibility
export function layerFilename(bgId, index, total);
export function depthHint(index, total, layerName);
```

An `AssetJob` keeps exactly today's fields — `{ kind, label, targetDir, filename, context, entryPrompt, aspect, style }` — so the Codex path produces **byte-identical prompts** to the ones the existing Lumen art was generated from. Layered backgrounds and `files[]` are still planned correctly (the tool must keep working for hand-authored stories like a future layered one); generated manifests simply never contain them (§8.2 rule 17).

Each backend then composes the final string from those parts, and this is where they legitimately differ:

- **Codex** — `[style, context, entryPrompt, aspect, saveInstruction].join('\n\n')`, where `saveInstruction` is today's "save it into the cwd as EXACTLY `<filename>`" clause. Unchanged.
- **Gemini** — `[style, context, entryPrompt, aspect].join('\n\n')`. The save clause is dropped: the API returns bytes, we choose the filename, and a "save it as X.png" sentence in an image prompt is an invitation to render the words.

`tools/gen-assets.mjs` gains `--backend codex|gemini|auto` (default `auto`: `gemini` when `GEMINI_KEY` is set, else `codex`) and one `switch` at the call site. Everything else — the sequential loop, skip-existing, continue-past-failures, the summary, the nonzero exit — is untouched.

### 10.2 `tools/lib/gemini-image.mjs`

```js
/**
 * @param {{ apiKey: string, model: string, prompt: string, aspect: '16:9'|'3:4',
 *           outPath: string, timeoutMs?: number, signal?: AbortSignal }} o
 * @returns {Promise<{ ok: true, bytes: number } | { ok: false, reason: string }>}
 */
export async function generateImage(o);
```

`POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=…`

```jsonc
{
  "contents": [{ "role": "user", "parts": [{ "text": "<composed prompt>" }] }],
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "imageConfig": { "aspectRatio": "16:9" }
  }
}
```

The response's first `candidates[0].content.parts[]` entry carrying `inlineData` is base64-decoded and written to `outPath` (mkdir -p first, write to `outPath + '.part'` then rename — a half-written PNG that the client then requests is worse than a missing one).

Because the exact image-model request surface has drifted across Gemini image releases, the call uses an explicit **fallback ladder** rather than assuming one shape, retrying only on a 400 whose body names the offending field:

1. `responseModalities: ['IMAGE']` + `imageConfig.aspectRatio`
2. → drop `imageConfig`
3. → `responseModalities: ['TEXT','IMAGE']`
4. → no `generationConfig` at all

The successful rung is remembered for the rest of the process, so the ladder is climbed at most once per server run. A response with no `inlineData` part but a text part is treated as a refusal and the text (truncated, redacted) becomes the failure reason.

### 10.3 The art job

`src/server/art.ts`:

```ts
export interface ArtOptions { storyId: string; only?: 'backgrounds'|'characters'|'cg'; force?: boolean }
export interface ArtSummary { generated: number; skipped: number; failed: number;
                              assets: Array<{ path: string; state: 'ok'|'skip'|'fail'; error?: string }> }
export function runArt(ctx: ServerContext, job: Job, o: ArtOptions): Promise<ArtSummary>;
```

- Reads the manifest from disk (never from memory) so a hand-edited manifest is honoured.
- `planAssets()` → filter by `only` → skip existing unless `force` (emitting `asset { state: 'skip' }`).
- **Sequential**, one image at a time. Parallelism buys 30 seconds and costs rate-limit failures and a progress bar that means nothing.
- Emits `asset { state: 'start' }` before each and `ok`/`fail` after; **continues past failures** exactly like `gen-assets.mjs`.
- Honours the job's abort signal between assets.
- Rewrites `generation.json`'s `art` block at the end (`done` / `partial` / `failed`).
- `STORYGEN_IMAGE_BACKEND=mock` writes a 1×1 PNG per asset with no network call. This is what makes the art path e2e-testable offline, and it is the only thing `mock` does differently.

Aspect selection follows `ASPECT` in `asset-plan.mjs`: backgrounds and cg `16:9`, character poses `3:4`.

**On transparency.** Character planes are drawn with `transparent: true, alphaTest: 0.01` (`src/stage/Character.ts`), which permits alpha but does not require it — and the flagship's own portraits are *opaque plates with a painted dark backdrop*, deliberately (see Lumen's `tearful` prompt, which explicitly forbids a cut-out). Gemini image models do not reliably produce alpha. The system prompt therefore asks for an **opaque dark neutral backdrop** on every pose, matching Lumen exactly. No new stage work, and generated portraits sit in the frame the way the critic-tuned ones do.

---

## 11. Client-side discovery

`src/engine/registry.ts` splits its existing body into a reusable builder and gains a merge:

```ts
/** Unchanged behaviour, now exported: manifest + raw script + urlMap -> bundle. */
export function buildBundle(manifest: StoryManifest, src: string, urlMap: Record<string, string>): StoryBundle;

/** Build-time glob, exactly as today. */
export function discoverBundledStories(): StoryBundle[];

/** Runtime, dev+preview only. Resolves to [] on any failure. */
export async function fetchRuntimeStories(o?: { timeoutMs?: number }): Promise<StoryBundle[]>;

/** Bundled first, runtime overwrites by id, sorted by title. */
export function mergeStories(bundled: StoryBundle[], runtime: StoryBundle[]): StoryBundle[];

/** Unchanged signature. Now: merge(bundled, await runtime). */
export async function discoverStories(): Promise<StoryBundle[]>;
```

`fetchRuntimeStories` does one `fetch('/api/stories', { signal: AbortSignal.timeout(2500) })`, and on *any* failure — 404, network error, non-JSON, wrong `api` version — returns `[]` without logging an error. A static deployment is not a fault condition.

For each record it builds the URL map straight from the file listing and hands it to the existing, untouched `buildAssetTable`:

```ts
const urlMap: Record<string, string> = {};
for (const f of rec.assets) urlMap[f.path] = `/stories/${rec.id}/${f.path}?v=${f.mtime}`;
//                          ^ key stays a clean relative path (buildAssetTable normalises it)
//                                                            ^ value carries the cache-buster
```

The `?v=<mtime>` is not decoration. Art arrives *after* the story is first loaded, and a regenerated asset lands at the same path; without the buster the browser serves the previous image (or the 404 it cached) forever.

Scripts are parsed with the same `parse()` the bundled path uses — it already runs in the browser and is the same function the server validated with, so a story cannot parse differently on the two sides.

**Precedence: runtime wins.** In dev, a story created this session is discovered *twice* — `import.meta.glob` re-evaluates on the full reload, and `/api/stories` reads the disk. The runtime record is the one read from disk at request time, so it wins, and a story hand-edited since the page loaded is correct rather than stale.

**Ordering caveat, noted rather than hidden:** runtime asset URLs are absolute (`/stories/…`) while `base: './'` makes built asset URLs relative. That is correct for dev (`/`) and preview (`/`), and would break if `dist/` were served from a sub-path — where there is no server and therefore no runtime discovery anyway.

---

## 12. UI and UX

### 12.1 Where "Create a Story" lives, and why

Two placements, at two weights.

**The title menu gains one entry, third.** `TitleScreen.renderMenu()` currently builds `New Story` (primary) · `Continue` (conditional) · `Load` · `Settings` · `About`. `Create a Story` is inserted **after `Continue` and before `Load`**: the two verbs that start you playing stay adjacent at the top, the three that manage the app stay at the bottom, and Create is the hinge between playing the anthology and adding to it. It is never the primary — the primary action on a title screen is *play*.

**The picker's dead shelf becomes a create card.** `renderRail()` currently terminates the rail with `.pq-lockslot` — a ledger row reading "2 slots · Locked". That row was always a placeholder for shelf space nobody could fill. Now it can be filled, so it becomes a `.pq-storycard--create`: same card geometry, same hairline language, a drawn quill mark instead of cover art, "Write a new one" and a one-line subtitle. Zero new concepts, the empty shelf gains a purpose, and the locked-padlock affordance — which only ever meant "nothing here" — retires.

Because the create action is now itself a choice, `newStory()` opens the picker when `stories.length > 1 **|| canCreate**`, rather than starting the single story directly. With Lumen alone and a server present, "New Story" opens a picker with one story and one create card, which is the honest shape of that library.

**No-server state: the entry is absent.** Not dimmed, not tooltipped — absent. This follows the rule the codebase already wrote down for itself, in `renderMenu`: *"A dimmed, unexplained Continue reads as broken — it only exists when it works."* The rubric's "minimal chrome" line points the same way, and the title screen is the most-scrutinised frame in the game. The capability is instead documented one level in: `About` gains a single sentence — "Stories can be written from inside the app when Lamplighter is running from `npm run dev` or `npm run preview`." Anyone who has seen the feature and lost it gets an answer in the one panel that exists to answer questions.

### 12.2 The Create panel

`src/ui/CreateStory.ts`, built on `overlayShell('Create a Story', { kicker: 'New' })` — the same shell as Settings and Save/Load, with its own `pq-modal--create` / `pq-modal__panel--create` variants, exactly as `SettingsPanel` does. It inherits the glass, the rack focus, the focus trap, backdrop-click and Esc for free.

```ts
export interface CreateHandlers {
  health: () => StorygenHealth | null;
  /** Resolves when the SSE stream terminates; rejects only on a transport fault. */
  submit: (req: GenerateStoryRequest, on: (e: SseMessage) => void, signal: AbortSignal) => Promise<void>;
  cancel: (jobId: string) => void;
  /** Persist the autostart handshake and reload into the new story. */
  adopt: (storyId: string) => void;
  close: () => void;
}
export class CreateStory { readonly overlay; readonly panel; open(): void; destroy(): void }
```

**Form view.**

| Control | Notes |
|---|---|
| **Premise** | `<textarea rows=4>`, autofocused, 2000-char cap with a live mono counter in the micro-label system. Placeholder is one short line: *"A place, a person, and something they have to decide before morning."* |
| **Examples** | Three tappable chips under the field that *fill* it. A rotating placeholder is unreadable the moment you start typing; a chip is a click. Copy: *"A lighthouse keeper's last night before the light goes automatic."* · *"Two archivists, one file that should not exist, forty minutes before the building is sealed."* · *"A night-bus driver who recognises a passenger from a photograph they were never supposed to see."* |
| **Title** | Optional single line, placeholder *"Leave blank and the story names itself."* |
| **Length** | Three-stop segmented control — Short · Standard · Long — in the `.pq-switch` instrument language (one hairline track, lit segment in `--pq-ctl-rgb`). Standard is default. Length is a creative decision and belongs in the open, not behind a disclosure. |
| **Paint the art** | A `.pq-switch` toggle reusing `SettingsPanel.toggle()`'s exact markup. Default **on** when `health.art.available`. When it is not: the switch renders disabled and the row's hint carries the reason — *"Set GEMINI_KEY in .env.local to paint art. Stories play without it, on themed placeholders."* A disabled control with a sentence attached is fine; a disabled control with nothing attached is the thing the codebase refuses to ship. |
| **Advanced** | A disclosure row (`▸ Advanced`) holding **Provider** — only the ids `health.providers[*].configured` reports, plus `mock`, rendered as the same segmented control — and **Model**, a text input whose placeholder is the resolved default. Collapsed by default and remembered per session. |
| **Actions** | `Generate` (primary `.pq-btn`) · `Cancel` (`.pq-btn--ghost`). Generate is disabled below 8 characters of premise. |

**Working view.** The form is *hidden, not destroyed* — the premise survives every failure and every retry without a round trip.

- A five-step **stage rail**: five 11px mono caps labels (`PLAN · WRITE · CHECK · SAVE · PAINT`) on one baseline, past steps at `--pq-micro-2`, the live one at `--pq-micro-1` with the key-colour dot, future ones at the hairline. This is the same micro-label system the relay chip and build stamp use — no new typography.
- One line of narrative copy from §5.2, set in the reading serif.
- A progress bar that is **indeterminate** (a slow key-coloured sweep) for `plan`/`draft`/`validate`/`repair`/`write`, and becomes **determinate** at `art`, where `index/total` is real. A determinate bar that is lying is worse than no bar.
- An elapsed timer, mono, tabular, right-aligned on the rail's terminus — the same treatment as `.pq-callstrip__timer`. `draft` is 20–90 seconds of nothing; an honest clock is the only decent thing to show.
- `note { level: 'warn' }` events append a quiet line under the copy (e.g. "Fixing a few loose ends…"), capped at three visible.

**Ready view (art still running).** On `ready` with `art: 'running'` the panel promotes:

> **Signal Hill is ready to play.** The art is still being painted — it will be there the next time you open the story.
> `[ Begin now ]`  ·  `Keep watching`  ·  `Stop painting`

`Begin now` calls `adopt(id)` immediately. `Keep watching` stays on the per-asset progress and offers `Begin now` throughout. `Stop painting` issues `DELETE /api/jobs/:id` and settles to the done view. Placeholders are tasteful by construction — missing art falls back to procedural plates built from the story's own theme colours — so "begin now" is a real offer, not a consolation.

**Done view.** `[ Begin ]` primary, `Close` ghost. With art off, `ready` and `done` arrive together and the panel goes straight here.

### 12.3 State machine

```
                    open
                     │
                     ▼
 edit / retry ──▶ ┌────────┐  submit  ┌────────────┐  hello  ┌──────────┐
                  │  form  │─────────▶│ connecting │────────▶│ working  │
                  └────────┘          └─────┬──────┘         └────┬─────┘
                     ▲                      │ error/abort         │
                     │                      ▼                     │ ready
                     │                ┌──────────┐                │
                     └────────────────│  failed  │◀───────error───┤
                          try again   └──────────┘                │
                                                    art:'off'  ┌──┴───────────┐  art:'running'
                                                        ┌──────┤              ├──────┐
                                                        ▼      │              │      ▼
                                                   ┌────────┐  │              │  ┌──────────┐
                                                   │  done  │◀─┴──── done ────┴──│ painting │
                                                   └───┬────┘                    └────┬─────┘
                                                       │ Begin                        │ Begin now
                                                       └──────────────┬───────────────┘
                                                                      ▼
                                                                ┌──────────┐
                                                                │ adopting │──▶ host.adoptStory(id) ──▶ reload
                                                                └──────────┘
```

`Cancel` is available in `connecting`, `working` and `painting`. Its meaning depends on whether `ready` has fired, and the copy says so:

- **Before `ready`** — `DELETE /api/jobs/:id` sets the job's abort signal; the pipeline checks it between stages and *before writing*, so nothing lands on disk. The panel returns to `form` with the premise intact. Button reads `Cancel`.
- **After `ready`** — the story exists and stays. Only art stops. Button reads `Stop painting`.

Aborting the client's `fetch` alone is **not** cancellation — the job is deliberately detached (§4.5) so "Begin now" works. The `DELETE` is what actually stops it.

### 12.4 Failure copy

Every failure state re-shows the form beneath the message, with the premise, title, length and advanced settings exactly as the user left them.

| `code` | Heading | Body | Actions |
|---|---|---|---|
| `no_provider` | No writer is configured | Add a key to `.env.local` and restart the dev server. Gemini needs `GEMINI_KEY`; xAI needs `XAI_API_KEY`; Anthropic needs `ANTHROPIC_API_KEY`. You can pick **Mock** under Advanced to try the flow offline. | Use Mock · Close |
| `proxy` / `network` | Couldn't reach the writer | *(the `hint` from `net.ts`, verbatim — it names the actual cause: an unhonoured `HTTPS_PROXY`, or DNS, or a refused connection)* | Try again · Close |
| `tls` | Couldn't verify the connection | The certificate chain wasn't trusted. If you're behind a corporate proxy, set `NODE_EXTRA_CA_CERTS` to its CA bundle and restart the dev server. | Try again · Close |
| `provider_auth` | The key was rejected | *(provider name)* returned 401. Check the key in `.env.local` and restart. | Close |
| `provider_rate_limit` | The writer is rate-limited | Wait a minute, or pick a different provider under Advanced. | Try again · Close |
| `provider_refused` | The writer declined this premise | It wouldn't write from this prompt. Try a different angle — the same story from another character, or a less literal version of the same idea. | Edit premise · Close |
| `invalid_output` / `invalid_json` | The draft didn't hold together | We asked twice more and it still didn't fit the format. Your premise is untouched — try again, or nudge it toward a smaller cast. *(collapsible: the first five issue lines)* | Try again · Edit premise |
| `disk` / `id_conflict` | Couldn't save the story | *(the errno hint)* Check that `stories/` is writable. | Try again · Close |
| `timeout` | The writer took too long | Nothing was saved. Try **Short** under length, or a faster model under Advanced. | Try again · Close |
| `cancelled` | *(no panel)* | Returns silently to the form. | — |

### 12.5 The completion handshake

Two new `AppHost` members, and no more — the UI never reaches outside its layer, so "reload the app" belongs to the lifecycle owner:

```ts
export interface AppHost {
  /* …existing… */
  /** Story-gen capabilities, probed once at boot. null ⇒ no server ⇒ hide Create. */
  storygenHealth(): StorygenHealth | null;
  /** Adopt a just-created story: persist the one-shot autostart flag and reload. */
  adoptStory(storyId: string): void;
}
```

**Boot** — `main.ts`, before `showTitle`:

```ts
const [bundles, health] = await Promise.all([
  discoverStories(),
  probeHealth(),                    // fetch('/api/health', { signal: AbortSignal.timeout(2000) })
]);                                 // probeHealth resolves to null on ANY failure
```

Both are in one `Promise.all` because both are local and both already have their own timeouts; boot is never delayed by more than 2 s even with the server hung, and never at all when it is absent (an immediate connection refusal).

**Adopt:**

```ts
const AUTOSTART_KEY = 'pq:autostart';

adoptStory(storyId: string) {
  try {
    sessionStorage.setItem(AUTOSTART_KEY, JSON.stringify({ id: storyId, at: Date.now() }));
  } catch { /* private mode: the story is still on disk and in the picker */ }
  location.reload();
}
```

**Consume — first thing in `boot()`, before anything can throw:**

```ts
function takeAutostart(): string | null {
  try {
    const raw = sessionStorage.getItem(AUTOSTART_KEY);
    sessionStorage.removeItem(AUTOSTART_KEY);          // one-shot: removed BEFORE it is used
    if (!raw) return null;
    const v = JSON.parse(raw) as { id?: unknown; at?: unknown };
    if (typeof v.id !== 'string') return null;
    if (typeof v.at !== 'number' || Date.now() - v.at > 120_000) return null;   // stale
    return v.id;
  } catch { return null; }
}
```

…and, after discovery:

```ts
const autostart = takeAutostart();
const target = autostart ? bundleById.get(autostart) : undefined;
if (target) void beginStory(target);
else uiLayer.showTitle(manifests);
```

Every clause earns its place:

- **`sessionStorage`, not `localStorage`** — a reload keeps it, a new tab does not inherit somebody else's autostart, and it evaporates when the tab closes.
- **Removed *before* it is read** — if `beginStory` throws, the next reload lands on the title screen instead of looping into the same crash. (`beginStory` already falls back to the title on failure; this makes the loop impossible rather than unlikely.)
- **Two-minute freshness window** — a flag written and then survived by a crash, a rebuild and ten minutes of editing must not hijack a later boot.
- **Missing id falls through silently** to the title screen, where the story is in the picker anyway.
- **The reload is safe by construction.** Discovery in the reloaded page goes through `/api/stories`, which reads the disk at request time — so the story is guaranteed present regardless of whether Vite's file watcher has noticed the new folder yet. This is precisely why runtime discovery has to land before the Create flow does (§15).

*(A future refinement could skip the reload entirely — the client already has the manifest, the script and the asset list, and `parse()` + `buildAssetTable()` both run in the browser, so `host` could adopt the bundle in place. The reload is chosen here because it re-derives everything from disk and cannot drift; the hot path is a follow-up, not a prerequisite.)*

### 12.6 CSS

One new block in `src/styles/ui.css`, in the established idiom: `.pq-create`, `.pq-create__field`, `.pq-create__examples`, `.pq-create__chip`, `.pq-create__seg`, `.pq-create__rail`, `.pq-create__step`, `.pq-create__bar`, `.pq-create__timer`, `.pq-create__fail`, plus `.pq-storycard--create`. Every colour comes from existing tokens (`--pq-ctl-rgb`, `--pq-hairline`, `--pq-micro-1/2`, `--pq-line-pane-edge`). Two components need genuinely new rules and no more: the textarea (there is no text-input style in the codebase yet — it gets the pane's hairline, the reading serif, `--pq-warm-rgb` ink, and a focus treatment matching `.pq-modal__close` rather than the global ring) and the segmented control (built from the `.pq-switch` track vocabulary, three stops instead of two).

---

## 13. File manifest

### New

| Path | Responsibility |
|---|---|
| `src/server/storygen-plugin.ts` | The Vite plugin: builds the context, mounts handlers on dev and preview. |
| `src/server/router.ts` | Method+path dispatch, JSON body reader with a 32 KB cap, `ApiError` → JSON. |
| `src/server/sse.ts` | SSE writer (headers, flush, heartbeat) + `Job` / `JobRegistry` for detached runs. |
| `src/server/env.ts` | Key, model and directory resolution from `loadEnv` ∪ `process.env`. Never leaves the server. |
| `src/server/net.ts` | `netFetch` (timeout, retry, classification), `probeProxy`, `redact`. |
| `src/server/providers.ts` | `generateText` across gemini / xai / openai-compatible / anthropic / mock, plus `extractEnvelope`. |
| `src/server/mock-story.ts` | The deterministic offline envelope (§6.1). |
| `src/server/prompt.ts` | `SYSTEM_PROMPT`, `PROMPT_VERSION`, `buildUserMessage`, `buildRepairMessage`, the length profiles. |
| `src/server/validate.ts` | Pure envelope validation against `parse()` + the §8.2 checklist. |
| `src/server/pipeline.ts` | draft → validate → repair(≤2) → write. Owns the stage events. |
| `src/server/write-story.ts` | Slug + collision resolution, staged write + atomic rename, `generation.json`. |
| `src/server/art.ts` | The art job: plan, drive the backend, per-asset events, summary, meta rewrite. |
| `src/server/stories.ts` | The `stories/` disk walk behind `GET /api/stories`; shared path helpers. |
| `src/server/static.ts` | Safe `/stories/**` file serving: confinement, content types, ETag/304. |
| `src/server/types.ts` | Every wire type in this document. Type-only; imported by both lanes. |
| `tools/lib/asset-plan.mjs` | manifest → asset job list. The single source of asset paths and prompt parts. |
| `tools/lib/asset-plan.d.mts` | Declarations for the above. |
| `tools/lib/gemini-image.mjs` | One Gemini image request → PNG on disk, with the fallback ladder. |
| `tools/lib/gemini-image.d.mts` | Declarations for the above. |
| `src/ui/CreateStory.ts` | The Create modal: form, working, ready, done, failed. |
| `src/ui/sse-client.ts` | `readSse()`: `fetch` body → typed events. ~60 lines. |
| `tests/e2e.mjs` | Playwright scenarios A–E, runnable against dev and preview. |
| `tests/helpers.mjs` | Server boot/teardown, temp stories dir, Chromium path resolution. |
| `tests/validate.test.ts` | Fixture-driven validator unit tests. |
| `tests/fixtures/*.json` | One bad envelope per validator rule family, plus one good one. |
| `tsconfig.node.json` | Node-lane typecheck: `src/server` + `vite.config.ts`. |
| `.env.example` | Documented, key-free template of §3.2's table. |

### Modified

| Path | Change |
|---|---|
| `vite.config.ts` | `loadEnv(mode, cwd, '')` + `storygen({ env })` in `plugins`. |
| `tsconfig.json` | Excludes `src/server`. |
| `src/engine/registry.ts` | Extract `buildBundle`; add `fetchRuntimeStories` + `mergeStories`; `discoverStories` merges. |
| `src/engine/index.ts` | Re-export the three new registry functions. |
| `src/core/types.ts` | `AppHost` gains `storygenHealth()` and `adoptStory()`. The only contract change. |
| `src/main.ts` | Health probe in the boot `Promise.all`; the autostart handshake; the two new host members. |
| `src/ui/UILayer.ts` | Constructs `CreateStory`, wires it into the modal stack, passes the two new hooks to `TitleScreen`. |
| `src/ui/TitleScreen.ts` | `Create a Story` menu entry (conditional); `.pq-lockslot` → `.pq-storycard--create`; `newStory()` opens the picker when create is available. |
| `src/ui/dom.ts` | One icon: `Icons.pen`. |
| `src/styles/ui.css` | The `.pq-create*` block and `.pq-storycard--create`. |
| `tools/gen-assets.mjs` | `--backend codex\|gemini\|auto`; job planning moves to `tools/lib/asset-plan.mjs`. |
| `package.json` | `test`, `test:unit`, `test:e2e`; `typecheck` runs both projects; devDeps `@types/node`, `playwright-core`, `esbuild`. |
| `docs/AUTHORING.md` | New §9 "Generating a story from inside the app" — the flow, the env table, and the fact that the output is an ordinary story you can then edit. |
| `README.md` | Create-a-story in the quickstart; the env table; a line in "How it works" for `src/server/`. |

Nothing in `src/engine/runtime.ts`, `src/stage/**` or `src/audio/**` is touched.

---

## 14. Testing

### 14.1 End-to-end (`tests/e2e.mjs`)

`playwright-core` joins `devDependencies` (it downloads no browsers) and drives the pre-installed Chromium. Path resolution, in order: `$PW_CHROMIUM` → `/opt/pw-browsers/chromium-*/chrome-linux/chrome` → `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell` → fail with a message naming all three.

The suite is **hermetic**: `helpers.mjs` creates a temp directory, copies `stories/lumen` and `stories/_template` into it, and boots the server with `STORYGEN_STORIES_DIR` pointed at it. Nothing a test generates ever lands in the repo, and a failed run leaves no cleanup debt.

`node tests/e2e.mjs --mode dev|preview|both` (default `both`). `preview` runs `vite build` first. Running both is the only real proof that `configureServer` and `configurePreviewServer` behave identically.

| # | Scenario | Steps | Assertions |
|---|---|---|---|
| **A** | Boot | `goto /` | Boot splash clears; `.pq-title` visible; the wordmark reads "Lamplighter"; the menu contains `New Story`; opening the picker lists a card titled **Lumen**. |
| **B** | Play Lumen | Picker → Lumen → advance 30× (`Space`) → take the first `>` choice → advance → take a `>!` choice | `.pq-dialogue__text` is non-empty at every step; the proxy panel appears at each choice; after the off-script choice the History panel contains that exact line; `localStorage['pq.autosave']` exists and its `storyId` is `lumen`. |
| **C** | Create (mock, offline) | Menu → `Create a Story` → premise → Advanced → provider `mock` → art **off** → `Generate` | `hello` observed; the stage rail lights `PLAN → WRITE → CHECK → SAVE`; `ready` then `done` within 15 s; the panel offers `Begin`; clicking it reloads and lands **directly in the story** (title screen never shown; the chapter card reads "Signal Hill"). |
| **C2** | Play both branches | From C's story: run the all-`>` path to `-> END`; reload; run the all-`>!` path | Both reach the credits roll (`.pq-credits` visible); the two runs end on **different** ending labels (asserted via the final narration text differing); no console error at any point. |
| **D** | API contract | `fetch('/api/health')`, `fetch('/api/stories')`, `fetch('/stories/lumen/../../package.json')` | health: `ok === true`, `api === '1.0'`, `providers.mock.configured === true`. stories: `lumen` present with a manifest, a non-empty script and ≥ 1 asset; **no** id starting with `_`; every `assets[].path` starts with `assets/`. Traversal: **404**, and the response body is not `package.json`. Identical assertions in dev and preview. |
| **E** | Art path (mock backend) | `STORYGEN_IMAGE_BACKEND=mock`; repeat C with art **on** | `asset` events arrive with monotonic `index`, `total` equal to the manifest's image count; `ready` arrives with `art: 'running'` and `Begin now` is offered *before* `done`; after `done`, a PNG exists at every planned path; `generation.json`'s `art.state === 'done'`. |
| **F** | Repair loop | Provider `mock` with `STORYGEN_MOCK_BREAK=targets` (injects a dangling jump into the first reply, then returns the good envelope) | A `stage: 'repair'` event is observed exactly once; the story is written; `generation.json` shows `attempts.length === 2` with the first carrying `TARGET_MISSING`. |

Scenario F is what actually proves the repair loop, and it costs one env-var branch in `mock-story.ts`. Without it the repair path ships untested.

### 14.2 Unit (`tests/validate.test.ts`)

`validate.ts` is pure, so it is directly testable — but it imports `../src/engine/parser` extensionlessly, which Node's ESM resolver will not resolve even though Node 22.22 strips types natively. `tests/helpers.mjs` therefore esbuild-bundles `src/server/validate.ts` (plus `prompt.ts` and `mock-story.ts`) once into `.tmp/` and imports that. `esbuild` is already present as a Vite dependency and is promoted to an explicit `devDependency` rather than being relied on transitively.

`node --test tests/validate.test.ts` covers one fixture per rule family:

| Fixture | Expected fatal code |
|---|---|
| `good-standard.json` | *(none)* — `ok === true`, and `stats` matches the profile |
| `bad-shape.json` | `ENVELOPE_SHAPE` |
| `bad-parse.json` (a malformed `@camera zoomy`) | `PARSE_WARNING` |
| `bad-target.json` | `TARGET_MISSING` |
| `bad-orphan.json` | `LABEL_ORPHAN` |
| `bad-speaker.json` | `SPEAKER_UNDECLARED` |
| `bad-pose.json` | `POSE_UNDECLARED` |
| `bad-audio.json` | `AUDIO_UNDECLARED`, `SYNTH_UNKNOWN` |
| `bad-file-key.json` | `FILE_KEY_PRESENT` |
| `bad-guard-var.json` | `GUARD_UNKNOWN_VAR` |
| `bad-one-ending.json` | `ENDINGS_TOO_FEW` |
| `bad-loop.json` | `CYCLE_NO_PROGRESS` |
| `bad-budget.json` (6 backgrounds, 4 characters) | `ASSET_BUDGET` |
| `warn-artstyle.json` | *(none)* — `ok === true` **and** the suffix was auto-appended |

Plus two direct assertions on the mock: `validateEnvelope(MOCK_STORY, profiles.short).ok === true`, and `SYSTEM_PROMPT` contains every synth preset name (a cheap guard against the whitelist drifting apart from `src/audio/synth.ts`).

### 14.3 Scripts

```jsonc
"typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json",
"test:unit":  "node --test tests/validate.test.ts",
"test:e2e":   "node tests/e2e.mjs --mode both",
"test":       "npm run test:unit && npm run test:e2e"
```

`npm run check` (`tools/build-check.mjs`) already shells `typecheck` + `vite build` and needs no change.

---

## 15. Implementation order

Three PR-sized chunks. The ordering is not arbitrary: PR-2 depends on PR-1's `/api/stories` for the handshake to be reliable (§12.5), and PR-3 depends on PR-2 for anywhere to show per-asset progress.

### PR 1 — Server core (no UI, no art)

`src/server/*` except `art.ts`; `tools/lib/asset-plan.mjs` (extracted but not yet consumed by a second backend); `tsconfig.node.json`; `.env.example`; `tests/validate.test.ts` + fixtures; `vite.config.ts`; README env table.

**Done means:**
- `npm run check` green on both tsconfig projects.
- `curl localhost:5173/api/health` reports the providers actually configured in `.env.local`, and no key material appears anywhere in the response or the terminal.
- `curl -N -X POST /api/generate-story -d '{"prompt":"anything","options":{"provider":"mock"}}'` streams `hello → stage×4 → ready → done` and leaves a playable story in `stories/`, which the **existing, unmodified client** picks up on the next reload via `import.meta.glob`.
- The same command with a real provider produces a story that passes validation, and the repair loop is observed at least once against a deliberately hostile short premise.
- `curl /api/stories` returns Lumen with its manifest, script and asset listing; `_template` is absent.
- `curl '/stories/lumen/../../package.json'` and `/stories/_template/manifest.json` both 404.
- `npm run test:unit` passes.
- The staged-write behaviour is verified: a story is never visible in `/api/stories` in a half-written state.

### PR 2 — Client discovery and the Create flow

`registry.ts` merge + `fetchRuntimeStories`; `main.ts` health probe and autostart; the two `AppHost` members; `CreateStory.ts`; `sse-client.ts`; `TitleScreen` entry and create card; the `.pq-create*` CSS.

**Done means:**
- Title → `Create a Story` → premise → provider `mock` → the staged progress runs → `Begin` lands the player **inside the new story**, with no title screen in between.
- The same flow against the default real provider produces a story worth reading, played end to end at least once, both branches.
- Every failure state in §12.4 has been forced by hand (unset the key; kill the network; a premise the provider refuses; a validator failure via `STORYGEN_MOCK_BREAK`) and each shows its own copy with the premise preserved.
- `vite preview` behaves identically to `vite dev` for the whole flow.
- A static `dist/` served by any plain file server boots, shows **no** Create entry, lists Lumen, and plays it — with no console error and no failed request that the user can see.
- `npm run check` green. Screenshot review of the Create panel and the picker's create card against `docs/CRITIC_RUBRIC.md` — specifically: no default-browser textarea, no default focus ring, the stage rail on the existing micro-label system, hairlines at `--pq-hairline`.

### PR 3 — Art and end-to-end

`tools/lib/gemini-image.mjs` + `.d.mts`; `gen-assets.mjs --backend`; `src/server/art.ts`; `/api/generate-assets`; the art toggle, per-asset progress and `Begin now` in `CreateStory`; `tests/e2e.mjs` + `helpers.mjs`; npm scripts; `docs/AUTHORING.md` §9.

**Done means:**
- With `GEMINI_KEY` set, a story created with art on arrives with real backgrounds, poses and a cover, and looks like it belongs next to Lumen on the picker.
- `Begin now` works: the player is in the story while assets are still being written, and the art is present after the next load of that story.
- Without an image key the toggle is disabled and carries its explanation; the story still generates and still plays.
- `node tools/gen-assets.mjs <id> --backend gemini` fills exactly the paths the Codex backend fills, and `node tools/gen-assets.mjs <id> --backend codex` produces byte-identical prompts to today's (verified by a diff of the composed strings).
- `npm run test:e2e` passes scenarios A–F against **both** dev and preview.
- `npm run check` green.

---

## 16. Non-goals

Restated so they are decisions rather than omissions.

- **No auth, no accounts, no multi-user.** This is a local dev-server feature. Anyone who can reach the port can already edit the repo.
- **No cloud storage.** Stories are folders.
- **No UI framework.** `CreateStory` is hand-built DOM on the existing `overlayShell`, like everything else in `src/ui`.
- **No generation on a static host.** Generation needs a filesystem and a secret. `dist/` gets discovery and playback only.
- **No token-by-token streaming into the UI.** Watching a story being typed spoils it, ties the panel to a provider-specific stream format, and makes cancellation ambiguous. Stage-level progress only.
- **No changes to Runtime, Stage or Audio.** The only contract change in the entire feature is two `AppHost` members.
- **No in-app moderation pre-filter.** Providers enforce their own policies and we surface `provider_refused` honestly. A second, worse filter in front of theirs is not a feature.
- **No in-app story deletion in v1.** `RuntimeStoryRecord.generated` exists precisely so a `DELETE /api/stories/:id` and a card affordance can be added later without a migration; junk is removed with `rm -rf stories/<id>` today.
- **No layered backgrounds in generated manifests.** The planner still supports them for hand-authored stories; the generator emits single-layer only (rule 17), which removes an entire class of "the backplate is transparent" art failure.

---

## 17. Verify at implementation time

Not open questions — decisions already made, with a fact to confirm at the keyboard rather than from memory:

1. **Gemini image request surface.** `responseModalities` / `imageConfig.aspectRatio` have drifted across image-model releases. §10.2's fallback ladder is designed to survive that; confirm which rung the configured `GEMINI_IMAGE_MODEL` actually accepts and log it once.
2. **Provider default model ids.** `gemini-3.7-flash`, `gemini-3.1-pro-preview`, `grok-4`, `gpt-5`, `claude-sonnet-5` are the defaults; every one is a single env var away from being wrong-proof. Confirm each against its provider's current model list on first run.
3. **`vite preview` + `apply: () => true`.** Confirm the plugin's `configurePreviewServer` fires (Vite classifies preview separately from serve); scenario D in `--mode preview` is the assertion that proves it.
4. **esbuild inlining of `src/engine/parser.ts` into the config bundle.** Expected to work — it is a pure relative TS import — but verify that no `import.meta.glob` reaches the server bundle by importing `parser.ts` directly and never `engine/index.ts`.

**Open questions: none.**
