/**
 * Lamplighter — hand-written declarations for asset-plan.mjs.
 *
 * TypeScript maps a `./x.mjs` specifier to `./x.d.mts`, not `./x.d.ts`. Even
 * though `tools/` is excluded from both tsconfig projects, these are still
 * pulled in by whatever imports the .mjs file — `exclude` filters the
 * initial file set, not files reached through an import — which is exactly
 * how the (PR-3) server art job typechecks against this plain-JS module.
 */

export interface AssetJob {
  kind: 'backgrounds' | 'characters' | 'cg';
  label: string;
  /** POSIX-relative to one story's own directory, e.g. "assets/backgrounds". */
  targetDir: string;
  filename: string;
  context: string;
  entryPrompt: string;
  aspect: string;
  style: string;
}

export const DEFAULT_STYLE: string;
export const ASPECT: { background: string; character: string; cg: string };

export function layerFilename(bgId: string, index: number, total: number): string;
export function depthHint(index: number, total: number, layerName: string): string;

export function planAssets(
  manifest: Record<string, unknown>,
  o?: { only?: 'backgrounds' | 'characters' | 'cg' | null; storyId?: string },
): AssetJob[];
