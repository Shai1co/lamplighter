/**
 * Lamplighter — shared e2e machinery (server boot/teardown, hermetic story
 * dirs, Chromium launch, console-error policy, DOM snapshots, CreateStory
 * driving helpers, artifact dumps). Split out of tests/e2e.mjs per the
 * design doc (docs/superpowers/specs/2026-08-18-storygen-design.md §13's
 * `tests/helpers.mjs` row, §14.1) once the suite grew scenarios C-F on top
 * of the original A/B — this file holds everything reusable, e2e.mjs holds
 * only the per-scenario bodies and the mode/group orchestration.
 *
 * Nothing in here is Lamplighter-app-specific beyond the CSS class names the
 * UI itself exposes (documented at each helper) — the same selectors
 * tests/e2e.mjs's original scenario A/B used, reverse-engineered from
 * src/ui/*.ts, extended here for src/ui/CreateStory.ts's markup.
 */

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const ARTIFACTS_DIR = path.join(__dirname, 'artifacts');

/* ─────────────────────────  ports (per the task brief)  ───────────────────────── */
// 5191/5192 are explicitly reserved by another process in this environment —
// never touch them. This suite's own fixed ports, one per vite mode:
export const DEV_PORT = 5199;
export const PREVIEW_PORT = 5201;

/* ─────────────────────────  shared timeouts  ───────────────────────── */

export const SERVER_READY_TIMEOUT_MS = 30_000; // vite must answer HTTP by then
export const BUILD_TIMEOUT_MS = 120_000; // `vite build` for the preview pass
// Generous: the first story load awaits Promise.all([stage.loadStory,
// audio.loadStory]) — decoding + uploading every background/portrait PNG as
// WebGL textures under software (SwiftShader) rendering. Measured ~20-25s in
// this sandbox for Lumen's 12-asset load; everything after is far cheaper.
export const STORY_START_TIMEOUT_MS = 60_000;
export const STEP_TIMEOUT_MS = 30_000; // any single click/waitFor
export const STALL_MS = 30_000; // no observable DOM change for this long while playing => fail
export const MAX_ADVANCE_STEPS = 400; // hard loop cap (a real playthrough is ~40)
// Mock generation (no network call) should finish in well under a second;
// generous ceiling for a loaded CI box.
export const GENERATE_TIMEOUT_MS = 25_000;
// 6 assets * STORYGEN_MOCK_ART_DELAY_MS(400ms) = 2.4s minimum, plus overhead.
export const ART_DONE_TIMEOUT_MS = 30_000;

/* ─────────────────────────  tiny console helpers  ───────────────────────── */

const t0 = Date.now();
export const elapsed = () => `[${((Date.now() - t0) / 1000).toFixed(1)}s]`;
export const log = (...a) => console.log(elapsed(), ...a);
export const warn = (...a) => console.warn(elapsed(), 'WARN', ...a);
export const section = (title) => console.log(`\n${elapsed()} === ${title} ===`);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function bannerPass(summary) {
  const line = '='.repeat(78);
  console.log('\n' + line);
  console.log('PASS — Lamplighter e2e suite');
  for (const l of summary) console.log('  ' + l);
  console.log(line + '\n');
}
export function bannerFail(reason) {
  const line = '='.repeat(78);
  console.log('\n' + line);
  console.log('FAIL — ' + reason);
  console.log(line + '\n');
}

/* ─────────────────────────  console capture + fatal-error policy  ───────────────────────── */

// Every console.error/warn call site in this app (grepped exhaustively across
// src/): "[pq] fatal boot error" and "[pq] failed to start story"
// (console.error, main.ts) and "[pq:runtime] ..." (console.warn, runtime.ts —
// missing label / step-cap, i.e. the runtime aborting rather than reaching a
// real `-> END`). All three are fatal here, in addition to any uncaught page
// error or a literal "[pq] fatal boot error" string.
const FATAL_CONSOLE_PATTERNS = [/\[pq\] fatal boot error/, /\[pq\] failed to start story/, /\[pq:runtime\]/];

// The ONE console entry that is deliberately not fatal: Chromium's own
// automatic `GET /favicon.ico` probe (index.html declares no <link
// rel="icon">, and adding one is outside this app's source scope).
function isBenignFaviconError(entry) {
  return entry.type === 'error' && /Failed to load resource/.test(entry.text) && /\/favicon\.ico$/.test(entry.locationUrl ?? '');
}

/**
 * Wires console/pageerror capture onto a fresh page. Returns an independent
 * `{ log, checkFatal }` pair per page — NOT module-level globals — so
 * multiple pages across scenario groups never share or clobber state.
 */
export function wireConsoleCapture(page, label = '') {
  const consoleLog = [];
  const tag = label ? `[${label}]` : '';
  page.on('console', (msg) => {
    const entry = { type: msg.type(), text: msg.text(), locationUrl: msg.location()?.url ?? '', time: Date.now() };
    if (isBenignFaviconError(entry)) {
      log(`[page:error]${tag} (ignored — browser favicon probe, not an app error)`, entry.text);
    } else {
      consoleLog.push(entry);
      if (entry.type === 'error' || entry.type === 'warning') log(`[page:${entry.type}]${tag}`, entry.text);
    }
    if (consoleLog.length > 3000) consoleLog.shift();
  });
  page.on('pageerror', (err) => {
    const text = err && err.stack ? err.stack : String(err);
    consoleLog.push({ type: 'pageerror', text, time: Date.now() });
    log(`[page:pageerror]${tag}`, text);
  });
  const checkFatal = () => {
    for (const entry of consoleLog) {
      if (entry.type === 'pageerror') throw new Error(`Uncaught page error: ${entry.text}`);
      if (entry.type === 'error') throw new Error(`Page console error: ${entry.text}`);
      for (const pat of FATAL_CONSOLE_PATTERNS) {
        if (pat.test(entry.text)) throw new Error(`Fatal console message (matched ${pat}): ${entry.text}`);
      }
    }
  };
  return { consoleLog, checkFatal };
}

/* ─────────────────────────  vite server (dev or preview)  ───────────────────────── */

let builtOnce = false;
/** `vite build` once, reused by every preview-mode server this run starts. Bounded by BUILD_TIMEOUT_MS so a hung build can't stall the whole suite forever. */
export async function ensureBuilt() {
  if (builtOnce) return;
  section('Building production bundle once for preview mode (vite build)');
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  await new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [viteBin, 'build'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: process.env, detached: true });
    let out = '';
    let settled = false;
    const finish = (fn, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(val);
    };
    const timer = setTimeout(() => {
      warn(`vite build exceeded ${BUILD_TIMEOUT_MS}ms — killing it.`);
      try {
        process.kill(-proc.pid, 'SIGKILL');
      } catch {
        proc.kill('SIGKILL');
      }
      finish(reject, new Error(`vite build did not finish within ${BUILD_TIMEOUT_MS}ms\n${out.slice(-4000)}`));
    }, BUILD_TIMEOUT_MS);
    proc.stdout.on('data', (b) => {
      const s = b.toString('utf8');
      out += s;
      for (const line of s.split(/\r?\n/)) if (line) log('[build:out]', line);
    });
    proc.stderr.on('data', (b) => {
      const s = b.toString('utf8');
      out += s;
      for (const line of s.split(/\r?\n/)) if (line) log('[build:err]', line);
    });
    proc.once('exit', (code) => finish(code === 0 ? resolve : reject, code === 0 ? undefined : new Error(`vite build failed with exit code ${code}\n${out.slice(-4000)}`)));
    proc.once('error', (err) => finish(reject, err));
  });
  builtOnce = true;
  log('Production build complete (dist/).');
}

/**
 * Starts `vite` (dev) or `vite preview` on `port`, with `env` overrides
 * layered on top of this process's own env (a real env var always wins over
 * `.env.local` — see src/server/env.ts#createEnv — so these overrides are
 * guaranteed to take effect regardless of what's in the repo's dotfiles).
 * Never logs `env` verbatim beyond the STORYGEN_* test knobs a caller passes
 * (never a secret) — see the header comment.
 */
export async function startServer({ mode, port, env = {}, label = mode }) {
  const baseUrl = `http://127.0.0.1:${port}/`;
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!existsSync(viteBin)) throw new Error(`vite entry script not found at ${viteBin} — is vite installed? (npm install)`);

  // Pre-flight: refuse to proceed if something is already answering on this
  // port — a stray process there would otherwise silently become the thing
  // this run tests against instead of its own spawn.
  try {
    await fetch(baseUrl, { method: 'GET', signal: AbortSignal.timeout(500) });
    throw new Error(
      `Something is already answering at ${baseUrl} before this run started its own server (label=${label}). ` +
        `Refusing to proceed — free port ${port} and re-run.`,
    );
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Something is already answering')) throw err;
    // connection refused / timeout is the expected, good case.
  }

  const envKeys = Object.keys(env);
  section(`Starting vite ${mode} server (${label}) on :${port}${envKeys.length ? ` [env: ${envKeys.map((k) => `${k}=${env[k]}`).join(', ')}]` : ''}`);

  const args =
    mode === 'preview'
      ? [viteBin, 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1']
      : [viteBin, '--port', String(port), '--strictPort', '--host', '127.0.0.1'];
  log('Spawning:', process.execPath, args.join(' '));
  const proc = spawn(process.execPath, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true, // own process group, so teardown can signal any stray children too
    env: { ...process.env, ...env },
  });

  const outputLines = [];
  const capture = (buf, streamLabel) => {
    for (const line of buf.toString('utf8').split(/\r?\n/)) {
      if (!line) continue;
      outputLines.push(`[vite:${streamLabel}] ${line}`);
      if (outputLines.length > 500) outputLines.shift();
      log(`[vite:${label}:${streamLabel}]`, line);
    }
  };
  proc.stdout.on('data', (b) => capture(b, 'out'));
  proc.stderr.on('data', (b) => capture(b, 'err'));

  let earlyExit = null;
  proc.once('exit', (code, signal) => {
    earlyExit = { code, signal };
  });
  proc.once('error', (err) => {
    earlyExit = { code: null, signal: null, error: err };
  });

  log(`Waiting for ${baseUrl} to respond (timeout ${SERVER_READY_TIMEOUT_MS}ms)...`);
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
  for (;;) {
    if (earlyExit) {
      throw new Error(
        `vite ${mode} server (${label}) exited before becoming ready (code=${earlyExit.code} signal=${earlyExit.signal}` +
          `${earlyExit.error ? ` error=${earlyExit.error}` : ''})\n` +
          outputLines.slice(-40).join('\n'),
      );
    }
    try {
      const res = await fetch(baseUrl, { method: 'GET' });
      if (res.status >= 200 && res.status < 500) {
        log(`vite responded with HTTP ${res.status} — server (${label}) is ready (pid ${proc.pid}).`);
        break;
      }
    } catch {
      /* connection refused / not listening yet — keep polling */
    }
    if (Date.now() > deadline) {
      throw new Error(`vite ${mode} server (${label}) did not answer HTTP within ${SERVER_READY_TIMEOUT_MS}ms`);
    }
    await sleep(200);
  }
  return { proc, outputLines, baseUrl, port, mode, label };
}

export async function stopServer(handle) {
  if (!handle) return;
  const { proc, label } = handle;
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return;
  log(`Stopping vite server (${label}, pid ${proc.pid})...`);
  try {
    // Negative pid == signal the whole detached process group (vite + any
    // esbuild/rollup helper children), not just the shim.
    process.kill(-proc.pid, 'SIGTERM');
  } catch {
    try {
      proc.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
  const exited = await Promise.race([new Promise((resolve) => proc.once('exit', () => resolve(true))), sleep(4000).then(() => false)]);
  if (!exited) {
    warn(`vite (${label}) did not exit after SIGTERM — sending SIGKILL`);
    try {
      process.kill(-proc.pid, 'SIGKILL');
    } catch {
      try {
        proc.kill('SIGKILL');
      } catch {
        /* already gone */
      }
    }
  }
}

/* ─────────────────────────  hermetic stories dir (scenarios C/C2/E/F)  ───────────────────────── */

/**
 * A fresh OS-temp directory seeded with copies of stories/lumen and
 * stories/_template — nothing scenario C/C2/E/F generates ever lands in the
 * repo, and a failed run leaves no cleanup debt in the repo tree. Uses
 * `os.tmpdir()` (not the repo) since this is what the shipped test suite
 * itself runs against on every machine/CI, not a one-off agent scratch file.
 */
export function makeHermeticStoriesDir(tag) {
  const dir = mkdtempSync(path.join(os.tmpdir(), `lamplighter-e2e-${tag}-`));
  cpSync(path.join(ROOT, 'stories', 'lumen'), path.join(dir, 'lumen'), { recursive: true });
  cpSync(path.join(ROOT, 'stories', '_template'), path.join(dir, '_template'), { recursive: true });
  log(`Hermetic stories dir (${tag}): ${dir} (seeded: lumen, _template)`);
  return dir;
}

export function cleanupHermeticDir(dir) {
  if (!dir) return;
  try {
    rmSync(dir, { recursive: true, force: true });
    log('Cleaned up hermetic dir:', dir);
  } catch (err) {
    warn('Failed to clean up hermetic dir', dir, err instanceof Error ? err.message : String(err));
  }
}

/* ─────────────────────────  raw-socket HTTP (path-as-is, for traversal checks)  ───────────────────────── */

/**
 * Sends a hand-crafted HTTP/1.1 request line with `rawPath` byte-for-byte —
 * deliberately bypassing any client-side URL normalization. Both `fetch` and
 * `curl` (without `--path-as-is`) collapse `..` segments during URL parsing
 * before the request ever leaves the process (the WHATWG "remove dot
 * segments" algorithm), which would silently turn
 * `/stories/lumen/../../package.json` into `/package.json` client-side —
 * testing an entirely different, harmless request instead of the server's
 * own traversal defense (src/server/static.ts's decode+normalize+confine
 * steps). A raw socket is the only way to actually exercise that code path.
 */
export function rawHttpGet(host, port, rawPath, { timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    let buf = Buffer.alloc(0);
    let settled = false;
    const finish = (fn, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(val);
    };
    const timer = setTimeout(() => {
      socket.destroy();
      finish(reject, new Error(`rawHttpGet timed out after ${timeoutMs}ms for ${rawPath}`));
    }, timeoutMs);
    socket.on('connect', () => {
      socket.write(`GET ${rawPath} HTTP/1.1\r\nHost: ${host}:${port}\r\nConnection: close\r\n\r\n`);
    });
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
    });
    socket.on('error', (err) => finish(reject, err));
    socket.on('close', () => {
      const raw = buf.toString('utf8');
      const sep = raw.indexOf('\r\n\r\n');
      const headPart = sep === -1 ? raw : raw.slice(0, sep);
      const body = sep === -1 ? '' : raw.slice(sep + 4);
      const statusLine = headPart.split('\r\n')[0] ?? '';
      const statusMatch = statusLine.match(/^HTTP\/\d\.\d (\d{3})/);
      finish(resolve, { status: statusMatch ? Number(statusMatch[1]) : null, statusLine, headers: headPart, body, raw });
    });
  });
}

/* ─────────────────────────  Chromium resolution + launch  ───────────────────────── */

export function resolveChromiumExecutable() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const candidates = [path.join(base, 'chromium')]; // the pre-installed symlink -> chrome-linux/chrome
  try {
    for (const name of readdirSync(base)) {
      if (/^chromium-\d+$/.test(name)) candidates.push(path.join(base, name, 'chrome-linux', 'chrome'));
    }
  } catch {
    /* base dir missing/unreadable — fall through with just the direct candidate */
  }
  for (const c of candidates) {
    try {
      if (existsSync(c) && statSync(c).isFile()) return c;
    } catch {
      /* broken symlink etc. — try the next candidate */
    }
  }
  return null;
}

const BASE_CHROME_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu-sandbox', '--window-size=1280,800'];

// Tried in order; each is verified against BOTH a raw WebGL context probe and
// the real app reaching the title screen with no fatal boot error.
const LAUNCH_ATTEMPTS = [
  { label: 'default headless (no extra GL flags)', extraArgs: [] },
  {
    label: '--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader',
    extraArgs: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
  { label: '--use-gl=swiftshader --enable-unsafe-swiftshader', extraArgs: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] },
];

/**
 * Launches Chromium once for the whole run (reused across every scenario
 * group and both dev/preview modes — WebGL flags don't depend on which
 * server/port is live), validating each fallback attempt against
 * `probeBaseUrl`'s title screen. Returns the browser plus the winning flags,
 * WITHOUT leaving any page/context open — callers get pages via `newPage`.
 */
export async function launchBrowser(probeBaseUrl) {
  section(`Launching Chromium (probing against ${probeBaseUrl})`);
  const executablePath = resolveChromiumExecutable();
  if (!executablePath) {
    throw new Error(`Could not find a chromium executable under PLAYWRIGHT_BROWSERS_PATH=${process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'}`);
  }
  log('Using chromium executable:', executablePath);

  let lastErr = null;
  for (const attempt of LAUNCH_ATTEMPTS) {
    log(`Attempt: ${attempt.label}`);
    let browser = null;
    try {
      browser = await chromium.launch({ executablePath, headless: true, args: [...BASE_CHROME_ARGS, ...attempt.extraArgs] });
      const context = await browser.newContext({ viewport: { width: 480, height: 300 } });
      const page = await context.newPage();
      const { checkFatal } = wireConsoleCapture(page, 'probe');

      log('Navigating to', probeBaseUrl);
      await page.goto(probeBaseUrl, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT_MS });

      const probe = await page.evaluate(() => {
        try {
          const canvas = document.getElementById('stage') || document.createElement('canvas');
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          if (!gl) return { ok: false, reason: 'getContext() returned null for webgl2/webgl' };
          const dbg = gl.getExtension('WEBGL_debug_renderer_info');
          const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
          const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
          return { ok: true, renderer, vendor };
        } catch (e) {
          return { ok: false, reason: String(e) };
        }
      });
      log('Raw WebGL probe on #stage:', JSON.stringify(probe));

      await page.locator('.pq-title:not([hidden])').waitFor({ state: 'visible', timeout: STORY_START_TIMEOUT_MS });
      checkFatal();
      if (!probe.ok) throw new Error(`WebGL context unavailable: ${probe.reason}`);

      await context.close();
      log(`SUCCESS with: ${attempt.label}`);
      log(`WebGL renderer: "${probe.renderer}" vendor: "${probe.vendor}"`);
      return { browser, flagsLabel: attempt.label, webgl: probe };
    } catch (err) {
      lastErr = err;
      warn(`Launch attempt failed (${attempt.label}):`, err && err.message ? err.message : err);
      if (browser) await browser.close().catch(() => {});
    }
  }
  throw new Error(`All Chromium launch attempts failed to reach the title screen with a working WebGL context. Last error: ${lastErr && lastErr.message ? lastErr.message : lastErr}`);
}

/** A fresh, isolated context+page (own localStorage/sessionStorage) with console capture wired. */
export async function newPage(browser, label) {
  const context = await browser.newContext({ viewport: { width: 480, height: 300 } });
  const page = await context.newPage();
  const { consoleLog, checkFatal } = wireConsoleCapture(page, label);
  return { context, page, consoleLog, checkFatal };
}

/* ─────────────────────────  page-state snapshot  ───────────────────────── */

export async function snapshotUi(page) {
  return page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const titleEl = q('.pq-title');
    const creditsEl = q('.pq-credits');
    const chapterEl = q('.pq-chapter');
    const dialogueEl = q('.pq-dialogue');
    const advanceEl = q('.pq-advance');
    const tiles = Array.from(document.querySelectorAll('.pq-tile, .pq-choice'));
    return {
      titleVisible: !!titleEl && !titleEl.hidden,
      creditsVisible: !!creditsEl && !creditsEl.hidden,
      // Not just "not hidden": ChapterCard.hide() flips is-in/is-out
      // synchronously but leaves `hidden` false until its CSS fade finishes —
      // is-in/is-out mirror the synchronous flip and keep this honest.
      chapterOpen: !!chapterEl && !chapterEl.hidden && chapterEl.classList.contains('is-in') && !chapterEl.classList.contains('is-out'),
      chapterTitle: chapterEl ? (chapterEl.querySelector('.pq-chapter__title')?.textContent ?? '') : '',
      dialogueVisible: !!dialogueEl && !dialogueEl.hidden,
      dialogueSpeaker: dialogueEl ? (dialogueEl.querySelector('.pq-dialogue__name')?.textContent ?? '') : '',
      dialogueText: dialogueEl
        ? (dialogueEl.querySelector('.pq-dialogue__body')?.textContent ?? '') + (dialogueEl.querySelector('.pq-dialogue__tail')?.textContent ?? '')
        : '',
      advanceArmed: !!advanceEl && advanceEl.classList.contains('is-armed'),
      choiceOpen: tiles.length > 0,
      choiceTexts: tiles.map((t) => (t.textContent || '').replace(/\s+/g, ' ').trim()),
    };
  });
}

/* ─────────────────────────  Settings: fast/deterministic playback  ───────────────────────── */

/**
 * Text speed -> Instant, Reduced motion -> on, Cinematic -> off, via the real
 * Settings controls (from the title screen). Speeds up every scenario that
 * plays dialogue and removes animation-timing flake — see the original
 * scenario B header comment this was lifted from for the full rationale.
 */
export async function applyFastSettings(page) {
  section('Settings: Text speed -> Instant, Reduced motion -> on, Cinematic -> off');
  const settingsItem = page.locator('.pq-title__menu .pq-menuitem', { hasText: 'Settings' });
  await settingsItem.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
  await page.locator('.pq-modal--set.is-open').waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });

  const speedInput = page.locator('input[aria-label="Text speed"]');
  await speedInput.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  await speedInput.click();
  await speedInput.press('Home');
  let speedVal = await speedInput.inputValue();
  if (speedVal !== '0') {
    await speedInput.evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, '0');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    speedVal = await speedInput.inputValue();
  }
  if (speedVal !== '0') throw new Error(`Text speed slider did not reach "0" (Instant); got "${speedVal}"`);

  const reducedMotion = page.locator('button[aria-label="Reduced motion"]');
  await reducedMotion.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  if ((await reducedMotion.getAttribute('aria-checked')) !== 'true') {
    await reducedMotion.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
  }
  if ((await reducedMotion.getAttribute('aria-checked')) !== 'true') throw new Error('Reduced motion toggle did not report aria-checked="true"');

  const cinematic = page.locator('button[aria-label="Cinematic"]');
  await cinematic.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  if ((await cinematic.getAttribute('aria-checked')) !== 'false') {
    await cinematic.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
  }

  await page.keyboard.press('Escape');
  await page.locator('.pq-modal--set').waitFor({ state: 'hidden', timeout: STEP_TIMEOUT_MS });
  log('Fast settings applied.');
}

/* ─────────────────────────  starting a story from the picker  ───────────────────────── */

/**
 * "New Story" -> picker -> the FIRST card whose aria-label matches
 * `cardMatch` (case-insensitive substring) -> wait for the title to dismiss
 * and the first story content to land. Robust to extra cards being present
 * on the shelf (any other story folder discovered alongside the expected
 * one) since it never assumes a card count or position.
 */
export async function startStoryFromPicker(page, cardMatch) {
  section(`Starting a story from the picker (card matching "${cardMatch}")`);
  const newStoryBtn = page.locator('.pq-menuitem.is-primary');
  await newStoryBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  await newStoryBtn.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });

  await page.locator('.pq-modal--picker.is-open').waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  const card = page.locator(`.pq-storycard:not(.pq-storycard--create)[aria-label*="${cardMatch}" i]`);
  await card.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  await card.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });

  await page.locator('.pq-title').waitFor({ state: 'hidden', timeout: STORY_START_TIMEOUT_MS });
  await page.waitForFunction(
    () => {
      const ch = document.querySelector('.pq-chapter');
      const dl = document.querySelector('.pq-dialogue');
      return (ch && !ch.hidden) || (dl && !dl.hidden);
    },
    { timeout: STORY_START_TIMEOUT_MS },
  );
  log('Story content is on screen.');
}

/* ─────────────────────────  generic play-to-ending loop  ───────────────────────── */

/**
 * Plays from wherever the story currently is to `-> END`, taking the choice
 * whose rendered tile text `includes()` `expectedChoices[i]` at the i-th
 * choice menu encountered (matched by CONTENT, never a fixed index — a
 * change to the story's choice order fails loudly instead of silently
 * steering onto an unverified path; see tests/e2e.mjs's header comment for
 * the punctuation-safe substring convention every `expectedChoices` entry
 * follows). Returns stats plus the LAST non-empty dialogue text seen before
 * credits appeared — rollCredits() clears the dialogue box synchronously in
 * the same tick it shows credits (src/ui/UILayer.ts), so this is captured
 * incrementally rather than read back after the fact.
 */
export async function playToEnding(page, checkFatal, expectedChoices) {
  let advanceClicks = 0;
  let choicesMade = 0;
  let lastFingerprint = null;
  let lastChangeAt = Date.now();
  const CHOICE_MISMATCH_GRACE_MS = 5000;
  let choiceMismatchSince = null;
  let lastDialogueBeforeCredits = '';

  for (let step = 0; ; step++) {
    checkFatal();
    if (step > MAX_ADVANCE_STEPS) {
      throw new Error(`Exceeded MAX_ADVANCE_STEPS (${MAX_ADVANCE_STEPS}) without reaching the credits — likely stuck or looping.`);
    }

    const snap = await snapshotUi(page);
    if (!snap.creditsVisible && snap.dialogueVisible && snap.dialogueText) lastDialogueBeforeCredits = snap.dialogueText;

    const fingerprint = JSON.stringify([snap.creditsVisible, snap.chapterOpen, snap.chapterTitle, snap.dialogueText, snap.choiceTexts]);
    if (fingerprint !== lastFingerprint) {
      lastFingerprint = fingerprint;
      lastChangeAt = Date.now();
    } else if (Date.now() - lastChangeAt > STALL_MS) {
      throw new Error(`UI has not changed for ${STALL_MS}ms while playing (possible soft-lock). Last snapshot: ${fingerprint}`);
    }

    if (snap.creditsVisible) {
      log(`Credits reached after ${advanceClicks} advance click(s) and ${choicesMade} choice(s).`);
      return { advanceClicks, choicesMade, lastDialogueBeforeCredits };
    }

    if (snap.choiceOpen) {
      const expected = expectedChoices[choicesMade];
      const idx = expected === undefined ? -1 : snap.choiceTexts.findIndex((t) => t.includes(expected));
      if (idx === -1) {
        if (choiceMismatchSince === null) choiceMismatchSince = Date.now();
        if (Date.now() - choiceMismatchSince > CHOICE_MISMATCH_GRACE_MS) {
          const what =
            expected === undefined
              ? `an unexpected extra choice screen (#${choicesMade + 1}; only ${expectedChoices.length} were expected)`
              : `no visible tile contained the expected text "${expected}" (choice #${choicesMade + 1})`;
          throw new Error(`${what}, persisting for over ${CHOICE_MISMATCH_GRACE_MS}ms. Tiles seen: ${JSON.stringify(snap.choiceTexts)}`);
        }
        await sleep(60);
        continue;
      }
      choiceMismatchSince = null;
      log(`Choice #${choicesMade + 1}/${expectedChoices.length}: tile ${idx} — "${snap.choiceTexts[idx].slice(0, 72)}..."`);
      await page.locator('.pq-tile, .pq-choice').nth(idx).click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
      choicesMade++;
      continue;
    }

    try {
      await page.locator('.pq-advance.is-armed').click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
    } catch (err) {
      throw new Error(`Could not click the advance affordance (.pq-advance.is-armed) at step ${step}: ${err.message}\nLast snapshot: ${fingerprint}`);
    }
    advanceClicks++;
  }
}

/** Advances `n` times via `.pq-advance.is-armed` (chapter-card dismiss or a dialogue line each) — never touches a choice menu. Returns the snapshots seen. */
export async function advanceFew(page, n) {
  const seen = [];
  for (let i = 0; i < n; i++) {
    await page.locator('.pq-advance.is-armed').waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
    await page.locator('.pq-advance.is-armed').click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
    await sleep(80);
    seen.push(await snapshotUi(page));
  }
  return seen;
}

/** Reads `.pq-credits`' text and asserts every string in `mustContain` appears. */
export async function assertCreditsContain(page, mustContain) {
  const text = await page.evaluate(() => document.querySelector('.pq-credits')?.innerText ?? '');
  for (const needle of mustContain) {
    if (!text.includes(needle)) throw new Error(`Credits panel did not contain "${needle}". Got: ${JSON.stringify(text.slice(0, 300))}`);
  }
  return text;
}

/** Clicks the credits' Skip/Return-to-title button and waits for the title screen. */
export async function clickCreditsSkipAndReturnToTitle(page) {
  const skipBtn = page.locator('.pq-credits__skip');
  await skipBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  await skipBtn.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
  await page.locator('.pq-credits').waitFor({ state: 'hidden', timeout: STEP_TIMEOUT_MS });
  await page.locator('.pq-title:not([hidden])').waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
}

/* ─────────────────────────  driving the Create panel (src/ui/CreateStory.ts)  ───────────────────────── */

/** Title menu -> "Create a Story" -> the panel is open. */
export async function openCreateViaMenu(page) {
  const item = page.locator('.pq-title__menu .pq-menuitem', { hasText: 'Create a Story' });
  await item.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  await item.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
  await page.locator('.pq-modal--create.is-open').waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
}

/** Fills the premise by clicking the first example chip (`.pq-create__chip`) — exercises the chip-fills-textarea affordance and sidesteps typing edge cases. */
export async function fillPremiseViaChip(page) {
  const chip = page.locator('.pq-create__chip').first();
  await chip.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  await chip.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
  const premise = page.locator('textarea[aria-label="Premise"]');
  const value = await premise.inputValue();
  if (value.trim().length < 8) throw new Error(`Premise field is too short after clicking the example chip: "${value}"`);
}

/** Opens the "Advanced" disclosure (if not already open) and selects the provider whose short label matches `label` (e.g. "Mock"). */
export async function selectProvider(page, label) {
  const disc = page.locator('.pq-create__disc', { hasText: 'Advanced' });
  await disc.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  if ((await disc.getAttribute('aria-expanded')) !== 'true') {
    await disc.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
  }
  const btn = page.locator('[aria-label="Provider"] .pq-create__segbtn', { hasText: label });
  await btn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  await btn.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
  const checked = await btn.getAttribute('aria-checked');
  if (checked !== 'true') throw new Error(`Provider "${label}" did not become selected (aria-checked="${checked}")`);
}

/** Ensures the "Paint the art" switch ends in state `want` (clicking it only if needed). Throws if `want` is true but the switch is disabled (no art backend configured on this server). */
export async function setArtToggle(page, want) {
  const btn = page.locator('button[aria-label="Paint the art"]');
  await btn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  const current = (await btn.getAttribute('aria-checked')) === 'true';
  if (current !== want) {
    const isDisabled = (await btn.getAttribute('disabled')) !== null;
    if (isDisabled && want) throw new Error('Cannot enable "Paint the art" — the toggle is disabled (no art backend configured for this server).');
    await btn.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
  }
  const finalChecked = (await btn.getAttribute('aria-checked')) === 'true';
  if (finalChecked !== want) throw new Error(`Art toggle did not reach the desired state (want=${want}, got=${finalChecked})`);
}

/** Clicks the form's "Generate" button (scoped to `.pq-create__form` so it never collides with a same-labelled button in the result views). */
export async function clickGenerate(page) {
  const btn = page.locator('.pq-create__form button.pq-btn', { hasText: 'Generate' });
  await btn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  if (await btn.isDisabled()) throw new Error('Generate button is disabled — premise not filled?');
  await btn.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
}

/**
 * One structured read of the Create panel's live (result-wrap) state —
 * everything a scenario needs to assert on the working/painting/done/failed
 * views without re-deriving selectors each time.
 */
async function readCreateState(page) {
  return page.evaluate(() => {
    const wrap = document.querySelector('.pq-create__result-wrap');
    const hidden = !wrap || wrap.hidden;
    const stagecopy = document.querySelector('.pq-create__stagecopy')?.textContent ?? '';
    const railSteps = Array.from(document.querySelectorAll('.pq-create__step')).map((s) => ({
      label: s.querySelector('.pq-create__steplabel')?.textContent ?? '',
      state: (s.className.match(/is-(past|live|future)/) ?? [])[1] ?? '',
    }));
    const assetline = document.querySelector('.pq-create__assetline')?.textContent ?? '';
    const readyTitleEl = document.querySelector('.pq-create__readytitle');
    const readyBanner = readyTitleEl ? { title: readyTitleEl.textContent ?? '' } : null;
    const doneTitle = document.querySelector('.pq-create__resulttitle')?.textContent ?? null;
    const failHeading = document.querySelector('.pq-create__failheading')?.textContent ?? null;
    const failBody = document.querySelector('.pq-create__failbody')?.textContent ?? null;
    return { hidden, stagecopy, railSteps, assetline, readyBanner, doneTitle, failHeading, failBody };
  });
}

/**
 * Polls the Create panel's result state until `predicate(state)` is true.
 * Fails fast (before the timeout) if a `.pq-create__failheading` appears,
 * since `done`/`ready` will then never arrive. `onTick` (optional) receives
 * every polled state — used to opportunistically log/collect transient
 * stages (e.g. a `repair` stagecopy) without making the assertion racy.
 */
export async function pollCreateUntil(page, predicate, { timeoutMs, intervalMs = 40, onTick } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const state = await readCreateState(page);
    if (onTick) onTick(state);
    if (state.failHeading) {
      throw new Error(`Create panel showed a failure: "${state.failHeading}" — ${state.failBody ?? ''}`);
    }
    if (predicate(state)) return state;
    if (Date.now() > deadline) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for Create panel state. Last: ${JSON.stringify(state)}`);
    }
    await sleep(intervalMs);
  }
}

/** Immediate (no polling) read of the Create panel — used right after clicking Generate, where the 'connecting' view is guaranteed to already be rendered synchronously (see tests/e2e.mjs's scenario C comment). */
export async function readCreateStateNow(page) {
  return readCreateState(page);
}

/** Clicks a button by visible text inside the Create panel's result pane (`.pq-create__result-wrap`) — e.g. "Begin", "Begin now". */
export async function clickCreateResultButton(page, text) {
  const btn = page.locator('.pq-create__result-wrap button.pq-btn', { hasText: text });
  await btn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  await btn.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
}

/**
 * Asserts that, after CreateStory's adopt()+location.reload() handshake, the
 * app lands DIRECTLY in the story — the title screen never becomes visible.
 * Polls at animation-frame frequency (page.waitForFunction) from immediately
 * after the click so a one-frame flash would still be caught.
 */
export async function assertAutostartLandsInStory(page, { expectChapterTitle } = {}) {
  const handle = await page.waitForFunction(
    () => {
      const ch = document.querySelector('.pq-chapter');
      const dl = document.querySelector('.pq-dialogue');
      const title = document.querySelector('.pq-title');
      const titleShown = !!title && !title.hidden;
      const storyShown = (ch && !ch.hidden) || (dl && !dl.hidden);
      return titleShown || storyShown ? { titleShown, storyShown } : false;
    },
    { timeout: STORY_START_TIMEOUT_MS },
  );
  const value = await handle.jsonValue();
  if (value.titleShown) {
    throw new Error('The title screen was shown after the autostart adopt+reload handshake — expected a direct landing in the story.');
  }
  log('Confirmed: reload landed directly in the story (title screen never shown).');
  if (expectChapterTitle) {
    const snap = await snapshotUi(page);
    if (snap.chapterTitle !== expectChapterTitle) {
      throw new Error(`Expected the chapter card to read "${expectChapterTitle}", got "${snap.chapterTitle}".`);
    }
    log(`Chapter card confirmed: "${snap.chapterTitle}".`);
  }
}

/* ─────────────────────────  generation.json (read directly from the hermetic dir)  ───────────────────────── */

export function readGenerationJson(storiesDir, storyId) {
  const p = path.join(storiesDir, storyId, 'generation.json');
  return JSON.parse(readFileSync(p, 'utf8'));
}

/** Polls generation.json on disk until `art.state` settles to a terminal value ('done'/'partial'/'failed'). */
export async function waitForArtSettled(storiesDir, storyId, { timeoutMs = ART_DONE_TIMEOUT_MS, intervalMs = 200 } = {}) {
  const genPath = path.join(storiesDir, storyId, 'generation.json');
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (existsSync(genPath)) {
      try {
        const meta = JSON.parse(readFileSync(genPath, 'utf8'));
        if (meta.art && ['done', 'partial', 'failed'].includes(meta.art.state)) return meta;
      } catch {
        /* mid-write (fs.rename races a concurrent reader) — retry */
      }
    }
    if (Date.now() > deadline) throw new Error(`Timed out after ${timeoutMs}ms waiting for ${genPath}'s art.state to settle.`);
    await sleep(intervalMs);
  }
}

/* ─────────────────────────  failure diagnostics  ───────────────────────── */

export async function dumpFailureArtifacts({ page, err, consoleLog = [], serverOutputs = [], label = 'fail' }) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(ARTIFACTS_DIR, `${label}-${stamp}`);
  section(`Dumping failure artifacts (${label})`);

  if (page && !page.isClosed?.()) {
    try {
      log('Current URL:', page.url());
    } catch {
      /* page may already be unusable */
    }
    try {
      await page.screenshot({ path: `${base}.png`, fullPage: true });
      log('Screenshot:', `${base}.png`);
    } catch (e) {
      warn('screenshot failed:', e.message);
    }
    try {
      writeFileSync(`${base}.html`, await page.content(), 'utf8');
      log('Page HTML:', `${base}.html`);
    } catch (e) {
      warn('saving page HTML failed:', e.message);
    }
  } else {
    warn('No open page to capture (failure happened before/without a live page).');
  }

  try {
    const dump = consoleLog
      .slice(-150)
      .map((e) => `[${e.type}] ${e.text}`)
      .join('\n');
    writeFileSync(`${base}.console.log`, dump, 'utf8');
    log('Console dump:', `${base}.console.log`, `(${Math.min(150, consoleLog.length)} of ${consoleLog.length} entries)`);
  } catch (e) {
    warn('saving console dump failed:', e.message);
  }

  try {
    writeFileSync(`${base}.vite.log`, serverOutputs.slice(-150).join('\n'), 'utf8');
    log('Server log:', `${base}.vite.log`);
  } catch {
    /* best-effort */
  }

  try {
    writeFileSync(`${base}.error.txt`, err && err.stack ? err.stack : String(err), 'utf8');
  } catch {
    /* best-effort */
  }
  log('Artifacts prefix:', base);
}
