#!/usr/bin/env node
/**
 * Picture Quest — asset generator (drives Codex image generation).
 *
 *   node tools/gen-assets.mjs <id> [--only backgrounds|characters|cg] [--force]
 *
 * Reads stories/<id>/manifest.json and, for every background layer, character
 * pose, and cg entry that HAS a prompt (and whose PNG does not already exist,
 * unless --force), composes a cohesive prompt and calls Codex to render ONE
 * image into the correct assets path. Runs sequentially to avoid rate spikes,
 * verifies each file, and falls back to the newest image under
 * ~/.codex/generated_images if Codex saved it elsewhere.
 *
 * Continues past individual failures; prints a summary and exits nonzero if any
 * asset failed.
 */
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** Shared art-director preamble prepended to every prompt for cohesion. */
export const DEFAULT_STYLE =
  'painterly cinematic still, muted Pacific-Northwest palette (slate blues, foggy greens, ' +
  'warm amber accents), soft volumetric light, gentle atmospheric haze, filmic grain, ' +
  'shallow depth of field, consistent character identity across images, ' +
  'no text, no watermark, no signature, no UI, no logo, no border, no frame';

const ASPECT = {
  background: '16:9 cinematic landscape, 1920x1080, wide establishing composition',
  character:
    '3:4 portrait, 1024x1365, single figure, waist-up or full-body, isolated on a plain ' +
    'neutral or transparent background so it composites cleanly onto a scene',
  cg: '16:9 cinematic landscape, 1920x1080, key-art composition',
};

const CODEX_TIMEOUT_MS = 6 * 60 * 1000;
const GENERATED_DIR = path.join(os.homedir(), '.codex', 'generated_images');

const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function die(msg) {
  console.error(C.red(`✗ ${msg}`));
  process.exit(1);
}

function parseArgs(argv) {
  const args = { id: '', only: null, force: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') args.force = true;
    else if (a === '--only') args.only = (argv[++i] || '').toLowerCase();
    else if (a.startsWith('--only=')) args.only = a.slice('--only='.length).toLowerCase();
    else rest.push(a);
  }
  args.id = rest[0] || '';
  return args;
}

function layerFilename(bgId, index, total) {
  return total > 1 ? `${bgId}.${index}.png` : `${bgId}.png`;
}

function depthHint(index, total, layerName) {
  const named = layerName ? `layer "${layerName}"` : `layer ${index + 1} of ${total}`;
  if (total <= 1) return '';
  if (index === 0) {
    return `PARALLAX BACKPLATE (${named}): the distant background only — sky, horizon, far ` +
      `structures — atmospheric and softly focused, FULLY OPAQUE, no foreground objects`;
  }
  const nearness = index === total - 1 ? 'nearest FOREGROUND' : 'MID-GROUND';
  return `PARALLAX ${nearness} (${named}): only the ${nearness.toLowerCase()} framing elements, ` +
    `rendered on a FULLY TRANSPARENT background (PNG alpha), no sky, no backplate — this plane ` +
    `will be composited over the backplate`;
}

function buildPrompt(style, context, entryPrompt, aspect, filename) {
  const save =
    `Generate EXACTLY ONE image and save it into the current working directory as a PNG file ` +
    `named EXACTLY "${filename}". Do not create any other files, subfolders, or variants. ` +
    `If a file with that name exists, overwrite it.`;
  return [style, context, entryPrompt, aspect, save]
    .map((s) => String(s).trim())
    .filter(Boolean)
    .join('\n\n');
}

function resolveCodexCommand() {
  if (process.platform !== 'win32') return 'codex';
  // Node >= 20.12 refuses to spawn .cmd shims with shell:false (CVE-2024-27980),
  // so locate the native codex.exe instead of the npm .cmd wrapper.
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'OpenAI', 'Codex', 'bin', 'codex.exe'),
    path.join(os.homedir(), 'AppData', 'Local', 'OpenAI', 'Codex', 'bin', 'codex.exe'),
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  // Last resort: the .cmd shim via cmd.exe. Prompt goes through a temp file? No —
  // keep argv intact by invoking cmd /c with the shim; quoting long prompts through
  // cmd is unreliable, so warn loudly.
  console.warn('[gen-assets] WARNING: codex.exe not found; falling back to codex.cmd via cmd.exe (long prompts may break).');
  return null;
}

function runCodex(targetDir, prompt) {
  return new Promise((resolve) => {
    const tmpOut = path.join(
      os.tmpdir(),
      `pq-codex-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`,
    );
    const resolved = resolveCodexCommand();
    const cmd = resolved ?? (process.platform === 'win32' ? 'codex.cmd' : 'codex');
    const args = [
      'exec',
      '--skip-git-repo-check',
      '--ephemeral',
      '-s',
      'workspace-write',
      '-C',
      targetDir,
      '-o',
      tmpOut,
      prompt,
    ];

    let child;
    try {
      // shell:true only for the .cmd fallback; the native exe runs shell-free.
      child = spawn(cmd, args, { stdio: 'inherit', shell: resolved == null });
    } catch (err) {
      resolve({ ok: false, reason: `could not launch codex: ${err?.message || err}` });
      return;
    }

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fs.rm(tmpOut, { force: true }).catch(() => {});
      resolve(result);
    };

    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        /* noop */
      }
      finish({ ok: false, reason: `timed out after ${Math.round(CODEX_TIMEOUT_MS / 1000)}s` });
    }, CODEX_TIMEOUT_MS);

    child.on('error', (err) => {
      finish({ ok: false, reason: `codex failed to start: ${err?.message || err} (is it on PATH?)` });
    });
    child.on('close', (code) => {
      finish({ ok: code === 0, reason: code === 0 ? '' : `codex exited with code ${code}` });
    });
  });
}

async function newestPngSince(dir, sinceMs) {
  if (!existsSync(dir)) return null;
  let best = null;
  async function walk(d) {
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.png')) {
        try {
          const st = await fs.stat(p);
          if (st.mtimeMs >= sinceMs && (!best || st.mtimeMs > best.mtimeMs)) {
            best = { path: p, mtimeMs: st.mtimeMs };
          }
        } catch {
          /* noop */
        }
      }
    }
  }
  await walk(dir);
  return best ? best.path : null;
}

/**
 * Generate one asset: run Codex, verify the file landed at `outPath`, and if
 * not, recover the newest freshly-generated PNG from the Codex cache.
 */
async function generate(job) {
  const outPath = path.join(job.targetDir, job.filename);
  await fs.mkdir(job.targetDir, { recursive: true });

  console.log('');
  console.log(C.cyan(`▶ ${job.label}`));
  console.log(C.dim(`  → ${path.relative(ROOT, outPath).replace(/\\/g, '/')}`));

  const startedAt = Date.now() - 2000; // small clock-skew cushion
  const prompt = buildPrompt(job.style, job.context, job.entryPrompt, job.aspect, job.filename);
  const res = await runCodex(job.targetDir, prompt);

  if (existsSync(outPath)) {
    console.log(C.green(`  ✓ saved ${job.filename}`));
    return { ok: true };
  }

  // Codex may have saved into ~/.codex/generated_images instead. Recover it.
  const recovered = await newestPngSince(GENERATED_DIR, startedAt);
  if (recovered) {
    try {
      await fs.copyFile(recovered, outPath);
      console.log(C.green(`  ✓ recovered from cache → ${job.filename}`));
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: `recover-copy failed: ${err?.message || err}` };
    }
  }

  return { ok: false, reason: res.ok ? 'no image produced' : res.reason };
}

async function main() {
  const { id, only, force } = parseArgs(process.argv.slice(2));
  if (!id) {
    console.log('Usage: node tools/gen-assets.mjs <id> [--only backgrounds|characters|cg] [--force]');
    process.exit(id ? 0 : 1);
  }
  if (only && !['backgrounds', 'characters', 'cg'].includes(only)) {
    die(`--only must be one of: backgrounds, characters, cg (got "${only}")`);
  }

  const storyDir = path.join(ROOT, 'stories', id);
  const manifestPath = path.join(storyDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    die(`No manifest at stories/${id}/manifest.json. Create the story first (tools/new-story.mjs).`);
  }

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch (err) {
    die(`manifest.json is not valid JSON: ${err?.message || err}`);
  }

  const style = (manifest.artStyle && String(manifest.artStyle).trim()) || DEFAULT_STYLE;
  const assetsDir = path.join(storyDir, 'assets');
  const want = (kind) => !only || only === kind;

  /** @type {Array<{kind:string,label:string,targetDir:string,filename:string,context:string,entryPrompt:string,aspect:string,style:string}>} */
  const jobs = [];

  // Backgrounds (each layer becomes its own image).
  if (want('backgrounds') && manifest.backgrounds) {
    for (const [bgId, bg] of Object.entries(manifest.backgrounds)) {
      if (!bg || !bg.prompt) continue;
      const layerNames = Array.isArray(bg.layers) && bg.layers.length ? bg.layers : null;
      const explicitFiles = Array.isArray(bg.files) && bg.files.length ? bg.files : null;
      const total = explicitFiles ? explicitFiles.length : layerNames ? layerNames.length : 1;
      for (let i = 0; i < total; i++) {
        const filename = explicitFiles
          ? path.basename(explicitFiles[i])
          : layerFilename(bgId, i, total);
        const hint = depthHint(i, total, layerNames ? layerNames[i] : '');
        jobs.push({
          kind: 'backgrounds',
          label: `background ${bgId}${total > 1 ? ` [layer ${i + 1}/${total}]` : ''}`,
          targetDir: path.join(assetsDir, 'backgrounds'),
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
          targetDir: path.join(assetsDir, 'characters', charKey),
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
        targetDir: path.join(assetsDir, 'cg'),
        filename,
        context: `Key art "${key}" for story "${manifest.title || id}".`,
        entryPrompt: cg.prompt,
        aspect: ASPECT.cg,
        style,
      });
    }
  }

  if (jobs.length === 0) {
    console.log(C.yellow('Nothing to generate: no entries with prompts matched your filter.'));
    return;
  }

  // Skip assets that already exist unless --force.
  const pending = [];
  let skipped = 0;
  for (const job of jobs) {
    const outPath = path.join(job.targetDir, job.filename);
    if (!force && existsSync(outPath)) {
      skipped++;
      continue;
    }
    pending.push(job);
  }

  console.log(C.bold(`Picture Quest — generating assets for "${id}"`));
  console.log(
    C.dim(
      `  ${jobs.length} candidate(s), ${skipped} already present, ${pending.length} to generate` +
        (force ? ' (--force)' : '') +
        (only ? `  [only ${only}]` : ''),
    ),
  );

  const succeeded = [];
  const failed = [];
  for (let i = 0; i < pending.length; i++) {
    const job = pending[i];
    console.log(C.dim(`\n[${i + 1}/${pending.length}]`));
    let result;
    try {
      result = await generate(job);
    } catch (err) {
      result = { ok: false, reason: err?.message || String(err) };
    }
    if (result.ok) succeeded.push(job.label);
    else {
      failed.push({ label: job.label, reason: result.reason });
      console.log(C.red(`  ✗ ${job.label}: ${result.reason}`));
    }
  }

  console.log('');
  console.log(C.bold('──────── summary ────────'));
  console.log(C.green(`  succeeded: ${succeeded.length}`));
  if (skipped) console.log(C.dim(`  skipped (exists): ${skipped}`));
  console.log(failed.length ? C.red(`  failed: ${failed.length}`) : C.dim('  failed: 0'));
  for (const f of failed) console.log(C.red(`    • ${f.label} — ${f.reason}`));

  if (failed.length) {
    console.log('');
    console.log(C.yellow('Tip: re-run to retry only the missing ones (existing files are skipped).'));
    process.exit(1);
  }
  console.log(C.green('\n✓ all assets generated.'));
}

main().catch((err) => die(err?.stack || String(err)));
