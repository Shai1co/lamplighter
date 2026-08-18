/**
 * Lamplighter — one Gemini image request -> PNG bytes on disk.
 *
 * Node builtins only (design doc §10.1): this file has no dependency on the
 * TypeScript server lane or any npm package, so `tools/gen-assets.mjs` keeps
 * running with `node tools/gen-assets.mjs`, no build step, exactly as today —
 * and `src/server/art.ts` imports this exact module at request time, so the
 * CLI and the in-app art job are always calling the same code.
 *
 * The exact image-model request surface has drifted across Gemini image
 * releases, so instead of assuming one shape this climbs an explicit
 * fallback ladder (design doc §10.2), retrying only on a 400 whose body
 * plausibly names the offending field:
 *
 *   1. responseModalities: ['IMAGE']       + imageConfig.aspectRatio
 *   2. responseModalities: ['IMAGE']       (imageConfig dropped)
 *   3. responseModalities: ['TEXT','IMAGE'] (still no imageConfig)
 *   4. no generationConfig at all
 *
 * The successful rung is remembered for the rest of THIS PROCESS (a module
 * top-level variable), so the ladder is climbed at most once per server run —
 * every later call starts at the rung that last worked, not back at rung 1.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** @type {number | null} Remembered successful rung index (0-based), process-lifetime. */
let successfulRung = null;

/** Design doc §17 item 1: "confirm which rung the configured GEMINI_IMAGE_MODEL
 *  actually accepts and log it once." Fires exactly once per process, on the
 *  first successful call, regardless of how many images are generated after. */
let loggedRung = false;

/**
 * Each rung builds the `generationConfig` object for that attempt; the last
 * rung returns `null`, meaning "omit generationConfig entirely".
 * @type {Array<(aspectRatio: string) => Record<string, unknown> | null>}
 */
const LADDER = [
  (aspectRatio) => ({ responseModalities: ['IMAGE'], imageConfig: { aspectRatio } }),
  () => ({ responseModalities: ['IMAGE'] }),
  () => ({ responseModalities: ['TEXT', 'IMAGE'] }),
  () => null,
];

/** Strips a literal API key out of anything that might echo the request URL back (error bodies, thrown messages). */
function redactKey(s) {
  return String(s).replace(/([?&]key=)[^&\s"'<>]+/gi, '$1[redacted]');
}

function truncate(s, n = 400) {
  const str = String(s);
  return str.length > n ? `${str.slice(0, n)}…` : str;
}

function buildBody(prompt, rung, aspectRatio) {
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  const generationConfig = LADDER[rung](aspectRatio);
  if (generationConfig) body.generationConfig = generationConfig;
  return body;
}

/**
 * True only for a 400 whose body plausibly names an unsupported request
 * field — the sole condition that climbs to the next rung. Every other
 * failure (auth, rate limit, safety refusal, a 400 about the PROMPT rather
 * than the request shape) is returned to the caller as-is.
 */
function looksLikeShapeError(status, bodyText) {
  if (status !== 400) return false;
  return /response.?modalities|image.?config|aspect.?ratio|unknown name|cannot find field|unknown field|invalid value at/i.test(
    bodyText,
  );
}

/**
 * @param {{ apiKey: string, model: string, prompt: string, aspect: '16:9'|'3:4',
 *           outPath: string, timeoutMs?: number, signal?: AbortSignal }} o
 * @returns {Promise<{ ok: true, bytes: number } | { ok: false, reason: string }>}
 */
export async function generateImage(o) {
  const timeoutMs = o.timeoutMs ?? 120_000;
  const url = `${ENDPOINT_BASE}/${encodeURIComponent(o.model)}:generateContent?key=${encodeURIComponent(o.apiKey)}`;
  const startRung = successfulRung ?? 0;

  for (let rung = startRung; rung < LADDER.length; rung++) {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = o.signal ? AbortSignal.any([timeoutSignal, o.signal]) : timeoutSignal;

    let res;
    let bodyText;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildBody(o.prompt, rung, o.aspect)),
        signal,
      });
      bodyText = await res.text();
    } catch (err) {
      if (o.signal?.aborted) return { ok: false, reason: 'Cancelled.' };
      const name = err && err.name;
      if (name === 'TimeoutError' || name === 'AbortError') {
        return { ok: false, reason: `Timed out after ${Math.round(timeoutMs / 1000)}s.` };
      }
      return { ok: false, reason: redactKey(err && err.message ? err.message : String(err)) };
    }

    if (!res.ok) {
      if (looksLikeShapeError(res.status, bodyText) && rung < LADDER.length - 1) continue;
      return { ok: false, reason: `HTTP ${res.status}: ${truncate(redactKey(bodyText))}` };
    }

    let json;
    try {
      json = JSON.parse(bodyText);
    } catch {
      return { ok: false, reason: 'Gemini returned a response that was not valid JSON.' };
    }

    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p && p.inlineData && typeof p.inlineData.data === 'string');

    if (imagePart) {
      const bytes = Buffer.from(imagePart.inlineData.data, 'base64');
      await fs.mkdir(path.dirname(o.outPath), { recursive: true });
      // Write-then-rename: a half-written PNG that a client then requests is
      // worse than a missing one (design doc §10.2).
      const partPath = `${o.outPath}.part`;
      await fs.writeFile(partPath, bytes);
      await fs.rename(partPath, o.outPath);
      successfulRung = rung;
      if (!loggedRung) {
        loggedRung = true;
        // eslint-disable-next-line no-console
        console.log(
          `[gemini-image] model "${o.model}" accepted request shape rung ${rung + 1}/${LADDER.length}` +
            (imagePart.inlineData.mimeType ? `; inlineData.mimeType="${imagePart.inlineData.mimeType}"` : ''),
        );
      }
      return { ok: true, bytes: bytes.length };
    }

    // No inlineData part: a refusal. Prefer the structured block reason;
    // fall back to whatever text part came back instead of the image.
    const blockReason = json?.promptFeedback?.blockReason;
    const textPart = parts.find((p) => p && typeof p.text === 'string' && p.text.trim());
    const reason = blockReason
      ? `Gemini declined this prompt (${blockReason}).`
      : textPart
        ? truncate(redactKey(textPart.text.trim()))
        : 'Gemini returned no image and no explanation.';
    return { ok: false, reason };
  }

  return { ok: false, reason: 'Every request shape in the fallback ladder was rejected.' };
}
