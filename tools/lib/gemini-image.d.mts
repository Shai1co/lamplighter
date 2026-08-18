/**
 * Lamplighter — hand-written declarations for gemini-image.mjs.
 *
 * TypeScript maps a `./x.mjs` specifier to `./x.d.mts`, not `./x.d.ts` — see
 * asset-plan.d.mts's header for why this is what lets src/server/art.ts
 * typecheck against a plain-JS module under tools/, which is excluded from
 * both tsconfig projects.
 */

export interface GenerateImageOptions {
  apiKey: string;
  model: string;
  prompt: string;
  aspect: '16:9' | '3:4';
  /** Absolute filesystem path the PNG is written to (via `<outPath>.part` + rename). */
  outPath: string;
  /** Default 120000. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export type GenerateImageResult = { ok: true; bytes: number } | { ok: false; reason: string };

export function generateImage(o: GenerateImageOptions): Promise<GenerateImageResult>;
