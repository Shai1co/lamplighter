/**
 * Lamplighter — outbound network: proxy detection, timeouts/retries, redaction.
 *
 * See design doc §3.3. Two environment facts drive this file's existence:
 * `NODE_EXTRA_CA_CERTS` is honoured by `fetch` automatically, but `HTTPS_PROXY`
 * is NOT unless the process was started with `NODE_USE_ENV_PROXY=1` (or
 * `--use-env-proxy`). Without it every provider call attempts a direct
 * connection and hangs until it times out — the least diagnosable first-run
 * failure this feature has. We deliberately do not add `undici` to build a
 * ProxyAgent and do not rewrite `npm run dev` to set the variable (that needs
 * `cross-env` on Windows for a one-line problem): detect, explain, move on.
 */

import type { Env } from './env';

export interface NetProbe {
  proxy: string | null;
  honored: boolean;
}

export interface NetError extends Error {
  code: 'network' | 'tls' | 'proxy' | 'timeout' | 'provider_auth' | 'provider_rate_limit' | 'provider_error';
  status?: number;
  hint?: string;
}

/* ─────────────────────────────  redaction  ───────────────────────────── */

/**
 * Secret values registered at boot (env.ts#allSecrets), so `redact` can strip
 * a literal key even when it appears somewhere the `key=`/`Bearer `/
 * `x-api-key:` patterns below don't anticipate — a provider echoing the
 * request URL back in an error body, for instance. The signature stays
 * `redact(s: string): string` exactly as specced; this is the mechanism that
 * makes "any literal value of a known secret" possible without threading an
 * `Env` through every call site.
 */
const knownSecrets = new Set<string>();

export function registerSecret(value: string | undefined | null): void {
  if (value && value.length >= 6) knownSecrets.add(value);
}

export function redact(s: string): string {
  let out = s;
  out = out.replace(/([?&]key=)[^&\s"'<>]+/gi, '$1[redacted]');
  out = out.replace(/Bearer\s+[^\s"'<>,]+/gi, 'Bearer [redacted]');
  out = out.replace(/x-api-key["']?\s*[:=]\s*["']?[^\s"'<>,}]+/gi, 'x-api-key: [redacted]');
  for (const secret of knownSecrets) {
    if (secret) out = out.split(secret).join('[redacted]');
  }
  return out;
}

/* ─────────────────────────────  proxy probing  ───────────────────────────── */

function honoredNow(): boolean {
  return process.env.NODE_USE_ENV_PROXY === '1' || process.execArgv.includes('--use-env-proxy');
}

function computeProbe(lookup: (key: string) => string | undefined): NetProbe {
  const proxy = lookup('HTTPS_PROXY') || lookup('https_proxy') || lookup('HTTP_PROXY') || lookup('http_proxy') || null;
  return { proxy, honored: honoredNow() };
}

/** Reported by /api/health and logged once at plugin start. */
export function probeProxy(env: Env): NetProbe {
  return computeProbe((k) => env[k]);
}

function currentProxyProbe(): NetProbe {
  return computeProbe((k) => process.env[k]);
}

/** The one-line, actionable sentence shown in both the startup log and a `proxy`-coded error. */
export function proxyHint(probe: NetProbe): string {
  return (
    `HTTPS_PROXY is set (${probe.proxy}) but this Node process is not using it. ` +
    `Start with NODE_USE_ENV_PROXY=1 (Node >= 22.15) or unset HTTPS_PROXY.`
  );
}

const TLS_HINT =
  "The certificate chain could not be verified. If you're behind a corporate proxy, " +
  'set NODE_EXTRA_CA_CERTS to its CA bundle and restart the dev server.';

/* ─────────────────────────────  netFetch  ───────────────────────────── */

function makeNetError(code: NetError['code'], message: string, o?: { status?: number; hint?: string }): NetError {
  const err = new Error(message) as NetError;
  err.code = code;
  if (o?.status !== undefined) err.status = o.status;
  if (o?.hint !== undefined) err.hint = o.hint;
  return err;
}

/** Node/undici surfaces connect-level failures as `cause.code`; some runtimes put it on the error itself. */
function systemErrorCode(err: unknown): string {
  const e = err as { code?: unknown; cause?: { code?: unknown } };
  return String(e?.code ?? e?.cause?.code ?? '');
}

function classifyNetworkError(err: unknown): NetError {
  const name = (err as { name?: string })?.name ?? '';
  const rawMessage = err instanceof Error ? err.message : String(err);
  const code = systemErrorCode(err);

  if (name === 'TimeoutError' || name === 'AbortError') {
    return makeNetError('timeout', 'The request timed out.', {
      hint: 'The provider did not respond in time. Try again, or a shorter length.',
    });
  }
  if (code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || code === 'SELF_SIGNED_CERT_IN_CHAIN' || code === 'CERT_HAS_EXPIRED') {
    return makeNetError('tls', redact(rawMessage), { hint: TLS_HINT });
  }
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN') {
    const probe = currentProxyProbe();
    if (probe.proxy && !probe.honored) {
      return makeNetError('proxy', redact(rawMessage), { hint: proxyHint(probe) });
    }
    return makeNetError('network', redact(rawMessage), {
      hint: 'Could not reach the provider. Check your network connection.',
    });
  }
  return makeNetError('network', redact(rawMessage), {
    hint: 'Could not reach the provider. Check your network connection.',
  });
}

async function classifyHttpError(res: Response): Promise<NetError> {
  let bodyText = '';
  try {
    bodyText = redact((await res.text()).slice(0, 800));
  } catch {
    /* body already consumed or unreadable — the status code alone is still useful */
  }
  const status = res.status;
  if (status === 401 || status === 403) {
    return makeNetError('provider_auth', `Provider returned ${status}.`, { status, hint: bodyText || undefined });
  }
  if (status === 429) {
    return makeNetError('provider_rate_limit', 'Provider rate limit exceeded.', { status, hint: bodyText || undefined });
  }
  return makeNetError('provider_error', `Provider returned ${status}.`, { status, hint: bodyText || undefined });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch + AbortSignal.timeout + one retry on 429/5xx + error classification.
 * Resolves only on a 2xx response; every other outcome (transport failure,
 * timeout, or a non-2xx status left standing after retries) is a thrown
 * `NetError` with a `code` already mapped onto the wire `ErrorCode` space, so
 * callers can surface `err.code`/`err.hint` straight into an SSE `error`
 * event without re-deriving anything. A caller-supplied `init.signal` firing
 * is left alone (rethrown as-is) — that is job cancellation, not a network
 * fault, and the pipeline layer classifies it as `cancelled` itself.
 */
export async function netFetch(
  url: string,
  init: RequestInit,
  o?: { timeoutMs?: number; retries?: number },
): Promise<Response> {
  const timeoutMs = o?.timeoutMs ?? 120_000;
  const retries = o?.retries ?? 1;
  const external = init.signal ?? undefined;

  let attempt = 0;
  for (;;) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = external ? AbortSignal.any([timeoutSignal, external]) : timeoutSignal;

    let res: Response;
    try {
      res = await fetch(url, { ...init, signal });
    } catch (err) {
      if (external?.aborted) throw err;
      throw classifyNetworkError(err);
    }
    if (res.ok) return res;
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      attempt++;
      await delay(400 * attempt);
      continue;
    }
    throw await classifyHttpError(res);
  }
}
