/**
 * Lamplighter — asset planning: manifest -> job list.
 *
 * Pure and dependency-free (Node builtins only — just `path.basename`): the
 * single source of asset paths and prompt parts, shared by
 * tools/gen-assets.mjs (the Codex backend) and the storygen server's art job
 * (the Gemini backend, PR-3). Lifted unchanged from gen-assets.mjs's own
 * job-building block, so the Codex path's composed prompts stay
 * byte-identical to what they were before this file existed — see
 * docs/superpowers/specs/2026-08-18-storygen-design.md §10.1.
 *
 * `targetDir` is a POSIX-relative path ("assets/backgrounds",
 * "assets/characters/wren", "assets/cg") — relative to ONE story's own
 * directory, never an absolute filesystem path. Neither this module nor its
 * callers need to agree on where "the repo root" is; each caller joins it
 * against whatever story directory it already has.
 *
 * @typedef {Object} AssetJob
 * @property {'backgrounds'|'characters'|'cg'} kind
 * @property {string} label
 * @property {string} targetDir
 * @property {string} filename
 * @property {string} context
 * @property {string} entryPrompt
 * @property {string} aspect
 * @property {string} style
 */

import path from 'node:path';

/** Shared art-director preamble prepended to every prompt for cohesion, when a manifest has no artStyle of its own. */
export const DEFAULT_STYLE =
  'painterly cinematic still, muted Pacific-Northwest palette (slate blues, foggy greens, ' +
  'warm amber accents), soft volumetric light, gentle atmospheric haze, filmic grain, ' +
  'shallow depth of field, consistent character identity across images, ' +
  'no text, no watermark, no signature, no UI, no logo, no border, no frame';

export const ASPECT = {
  background: '16:9 cinematic landscape, 1920x1080, wide establishing composition',
  character:
    '3:4 portrait, 1024x1365, single figure, waist-up or full-body, isolated on a plain ' +
    'neutral or transparent background so it composites cleanly onto a scene',
  cg: '16:9 cinematic landscape, 1920x1080, key-art composition',
};

export function layerFilename(bgId, index, total) {
  return total > 1 ? `${bgId}.${index}.png` : `${bgId}.png`;
}

/**
 * Gemini's composed prompt: `[style, context, entryPrompt, aspect]` joined
 * with blank lines — WITHOUT the Codex-only "save it as <filename>" clause
 * (design doc §10.1). The Gemini API returns image bytes directly and the
 * caller chooses the filename itself, so a save-instruction sentence inside
 * the prompt text is only an invitation for the model to render those
 * literal words into the picture. Shared by tools/gen-assets.mjs's
 * `--backend gemini` path and src/server/art.ts, so both ever compose the
 * same string for the same job.
 * @param {AssetJob} job
 * @returns {string}
 */
export function composeGeminiPrompt(job) {
  return [job.style, job.context, job.entryPrompt, job.aspect]
    .map((s) => String(s).trim())
    .filter(Boolean)
    .join('\n\n');
}

export function depthHint(index, total, layerName) {
  const named = layerName ? `layer "${layerName}"` : `layer ${index + 1} of ${total}`;
  if (total <= 1) return '';
  if (index === 0) {
    return (
      `PARALLAX BACKPLATE (${named}): the distant background only — sky, horizon, far ` +
      `structures — atmospheric and softly focused, FULLY OPAQUE, no foreground objects`
    );
  }
  const nearness = index === total - 1 ? 'nearest FOREGROUND' : 'MID-GROUND';
  return (
    `PARALLAX ${nearness} (${named}): only the ${nearness.toLowerCase()} framing elements, ` +
    `rendered on a FULLY TRANSPARENT background (PNG alpha), no sky, no backplate — this plane ` +
    `will be composited over the backplate`
  );
}

/**
 * manifest -> job list. Pure: no filesystem, no network.
 *
 * Generated manifests never contain `layers`/`files` (the server validator's
 * FILE_KEY_PRESENT rule forbids it), so the multi-layer background branch
 * below only ever fires for a hand-authored story — it stays here so the
 * planner keeps working correctly for one.
 *
 * @param {Record<string, any>} manifest
 * @param {{ only?: 'backgrounds'|'characters'|'cg'|null, storyId?: string }} [o]
 * @returns {AssetJob[]}
 */
export function planAssets(manifest, o = {}) {
  const only = o.only ?? null;
  const storyId = o.storyId ?? '';
  const want = (kind) => !only || only === kind;
  const style = (manifest.artStyle && String(manifest.artStyle).trim()) || DEFAULT_STYLE;

  /** @type {AssetJob[]} */
  const jobs = [];

  // Backgrounds (each layer becomes its own image).
  if (want('backgrounds') && manifest.backgrounds) {
    for (const [bgId, bg] of Object.entries(manifest.backgrounds)) {
      if (!bg || !bg.prompt) continue;
      const layerNames = Array.isArray(bg.layers) && bg.layers.length ? bg.layers : null;
      const explicitFiles = Array.isArray(bg.files) && bg.files.length ? bg.files : null;
      const total = explicitFiles ? explicitFiles.length : layerNames ? layerNames.length : 1;
      for (let i = 0; i < total; i++) {
        const filename = explicitFiles ? path.basename(explicitFiles[i]) : layerFilename(bgId, i, total);
        const hint = depthHint(i, total, layerNames ? layerNames[i] : '');
        jobs.push({
          kind: 'backgrounds',
          label: `background ${bgId}${total > 1 ? ` [layer ${i + 1}/${total}]` : ''}`,
          targetDir: 'assets/backgrounds',
          filename,
          context: `Background art for the scene "${bgId}".${hint ? ' ' + hint + '.' : ''}`,
          entryPrompt: bg.prompt,
          aspect: ASPECT.background,
          style,
        });
      }
    }
  }

  // Character poses.
  if (want('characters') && manifest.characters) {
    for (const [charKey, ch] of Object.entries(manifest.characters)) {
      if (!ch || !ch.poses) continue;
      const desc = ch.description ? `, ${ch.description}` : '';
      for (const [pose, poseDef] of Object.entries(ch.poses)) {
        if (!poseDef || !poseDef.prompt) continue;
        const filename = poseDef.file ? path.basename(poseDef.file) : `${pose}.png`;
        jobs.push({
          kind: 'characters',
          label: `character ${charKey} / ${pose}`,
          targetDir: `assets/characters/${charKey}`,
          filename,
          context:
            `Character "${ch.name || charKey}"${desc}. Expression/pose: "${pose}". ` +
            `Keep this character's identity, wardrobe, and features identical across every pose.`,
          entryPrompt: poseDef.prompt,
          aspect: ASPECT.character,
          style,
        });
      }
    }
  }

  // CG / key art.
  if (want('cg') && manifest.cg) {
    for (const [key, cg] of Object.entries(manifest.cg)) {
      if (!cg || !cg.prompt) continue;
      const filename = cg.file ? path.basename(cg.file) : `${key}.png`;
      jobs.push({
        kind: 'cg',
        label: `cg ${key}`,
        targetDir: 'assets/cg',
        filename,
        context: `Key art "${key}" for story "${manifest.title || storyId}".`,
        entryPrompt: cg.prompt,
        aspect: ASPECT.cg,
        style,
      });
    }
  }

  return jobs;
}
