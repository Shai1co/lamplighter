#!/usr/bin/env node
/**
 * Lamplighter — end-to-end Playwright harness.
 *
 *   node tests/e2e.mjs [--keep-open]
 *   npm run test:e2e
 *
 * Proves the EXISTING game is playable start to finish, headless, with no test
 * framework: boots a real `vite` dev server on a scratch port, drives a real
 * Chromium tab through the title screen and the whole Lumen story to an
 * ending, and asserts the credits roll and the app returns cleanly to the
 * title screen. Exits 0 on success, 1 on any failure (including any uncaught
 * page error / "[pq] fatal boot error" / "[pq:runtime]" console message).
 *
 * ── How this drives the app (see the source files it was reverse-engineered
 *    from: src/ui/UILayer.ts, DialogueBox.ts, ChoiceMenu.ts, ProxyPanel.ts,
 *    ChapterCard.ts, TitleScreen.ts, Settings.ts, src/engine/runtime.ts) ──
 *
 *   Advance gesture: click `.pq-advance` — a full-stage hit target UILayer
 *   arms with the class `.is-armed` (CSS: `pointer-events: none` until armed)
 *   whenever it is safe to advance. ONE handler (`requestAdvance()`) covers
 *   every blocking node kind: it dismisses chapter cards, resolves `@wait`
 *   beats, skips/advances the dialogue typewriter, and is a no-op during a
 *   choice or the title/credits screens. So the whole play loop below only
 *   ever needs to distinguish 3 states: credits visible / a choice is up /
 *   otherwise click `.pq-advance.is-armed`.
 *
 *   Choices: rendered as `<button class="pq-tile">` (the Lumen "ProxyPanel" —
 *   used whenever any option is `suggested`/`offscript`, which is every choice
 *   in Lumen) or `<button class="pq-choice">` (the plain ChoiceMenu, used only
 *   for `>?` neutral-only menus — not present in Lumen, handled anyway for
 *   robustness). Both disappear from the DOM entirely when no choice is
 *   pending, so "`.pq-tile, .pq-choice` exists" doubles as "a choice is open".
 *
 *   Choice path taken (verified by hand against stories/lumen/story.pq): at
 *   each of Lumen's 3 choice points we click the FIRST offered line — LUMEN's
 *   suggested/on-script reply (`>`, always listed — and rendered — before the
 *   off-script `>!` reply). That path is:
 *     scene_open -> open_script -> after_open -> atrium_scene ->
 *     building_script -> after_building -> deeper_gate -> holding (the
 *     `{trust>=2}` guard on `-> deeper` never fires because trust stays 0) ->
 *     converge -> ch2 -> final_script -> climax -> ending_withdraw ->
 *     credits_end -> END.
 *   This is a genuine, complete ending (not a loop/soft-lock) reached via
 *   `-> END`, which is what makes the credits roll. We match each choice
 *   screen against a hardcoded, punctuation-free substring of its expected
 *   tile text (see EXPECTED_CHOICES) rather than blindly trusting index 0, so
 *   a change to the story's choice order fails loudly instead of silently
 *   steering onto an unverified path.
 *
 *   Speed/determinism: before starting, we open Settings from the title menu
 *   and, via the real controls, set Text speed to its minimum (an
 *   `<input type=range>`; the app treats speed<=0 as an instant, non-animated
 *   reveal — see DialogueBox.show()) and turn Reduced motion on (skips the
 *   choice "lift into dialogue" FLIP animation and the credits scroll
 *   animation). We still don't rely on any fixed animation length anywhere:
 *   every wait in this script is a bounded poll on an observable DOM/console
 *   condition, and we end the story by clicking the credits' own Skip /
 *   Return-to-title button rather than waiting out the credits scroll.
 */

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ARTIFACTS_DIR = path.join(__dirname, 'artifacts');

const KEEP_OPEN = process.argv.includes('--keep-open');
const PORT = 5199;
const BASE_URL = `http://127.0.0.1:${PORT}/`;

const GLOBAL_TIMEOUT_MS = 5 * 60 * 1000; // whole-script budget
const SERVER_READY_TIMEOUT_MS = 30_000; // vite must answer HTTP by then
// Generous: the first `New Story` click awaits Promise.all([stage.loadStory,
// audio.loadStory]) — decoding + uploading every Lumen background/portrait PNG
// as WebGL textures under software (SwiftShader) rendering, which measured
// ~20-25s in this sandbox (see the header comment / final report for the
// measured figure). Everything after that first scene is far cheaper.
const STORY_START_TIMEOUT_MS = 60_000;
const STEP_TIMEOUT_MS = 30_000; // any single click/waitFor
const STALL_MS = 30_000; // no observable DOM change for this long while playing => fail
const MAX_ADVANCE_STEPS = 400; // hard loop cap (a real playthrough is ~40)
const MIN_EXPECTED_ADVANCES = 25; // sanity floor, warning-only (see header comment for the ~40 tally)

// The suggested/on-script reply at each of Lumen's 3 choice points, in order.
// Matched with String.includes() against the rendered tile text, which is
// re-typeset by smartQuotes() (straight " / ' -> curly, "--" -> em dash) — so
// every substring below is chosen from the middle of its sentence, clear of
// any apostrophe/quote/dash smartQuotes could touch.
const EXPECTED_CHOICES = [
  'Take all the time you need',
  'That sounds like a place that held real meaning',
  'LUMEN is always here whenever you need us',
];

/* ─────────────────────────  tiny console helpers  ───────────────────────── */

const t0 = Date.now();
const elapsed = () => `[${((Date.now() - t0) / 1000).toFixed(1)}s]`;
const log = (...a) => console.log(elapsed(), ...a);
const warn = (...a) => console.warn(elapsed(), 'WARN', ...a);
const section = (title) => console.log(`\n${elapsed()} === ${title} ===`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function bannerPass(summary) {
  const line = '='.repeat(78);
  console.log('\n' + line);
  console.log('PASS — Lumen was played start to finish (headless) and reached its ending.');
  for (const l of summary) console.log('  ' + l);
  console.log(line + '\n');
}
function bannerFail(reason) {
  const line = '='.repeat(78);
  console.log('\n' + line);
  console.log('FAIL — ' + reason);
  console.log(line + '\n');
}

/* ─────────────────────────  module-level run state  ───────────────────────── */

let viteProc = null;
const viteOutputLines = [];
let browserRef = null;
let pageRef = null;
let consoleLog = [];
let cleaningUp = false;
let globalTimer = null;

/* ─────────────────────────  console capture + fatal-error policy  ───────────────────────── */

// Every console.error/warn call site in this app (confirmed exhaustively by
// grepping src/ — see the final report): "[pq] fatal boot error" and
// "[pq] failed to start story" (console.error, main.ts) and
// "[pq:runtime] ..." (console.warn, runtime.ts — missing label / step-cap,
// i.e. the runtime aborting rather than reaching a real `-> END`). All three
// are treated as fatal below, in addition to the task's literal requirement
// (any uncaught page error, or the literal "[pq] fatal boot error" string).
const FATAL_CONSOLE_PATTERNS = [
  /\[pq\] fatal boot error/,
  /\[pq\] failed to start story/,
  /\[pq:runtime\]/,
];

// The ONE console entry that is deliberately not fatal: Chromium's own
// automatic `GET /favicon.ico` probe, logged as a console error whenever a
// page has no <link rel="icon"> — which index.html does not declare, and
// adding one is outside this task's scope (not app source we're allowed to
// touch, and not a real defect). Confirmed by hand with a throwaway probe
// script during development: `msg.text()` never includes the URL, so this is
// matched on the resource actually being favicon.ico via `console.location()`,
// not on the generic "Failed to load resource" text — any OTHER 404/network
// console error still fails the run.
function isBenignFaviconError(entry) {
  return entry.type === 'error' && /Failed to load resource/.test(entry.text) && /\/favicon\.ico$/.test(entry.locationUrl ?? '');
}

function wireConsoleCapture(page) {
  consoleLog = [];
  page.on('console', (msg) => {
    const entry = { type: msg.type(), text: msg.text(), locationUrl: msg.location()?.url ?? '', time: Date.now() };
    if (isBenignFaviconError(entry)) {
      log('[page:error] (ignored — browser favicon probe, not an app error)', entry.text);
    } else {
      consoleLog.push(entry);
      if (entry.type === 'error' || entry.type === 'warning') log(`[page:${entry.type}]`, entry.text);
    }
    if (consoleLog.length > 3000) consoleLog.shift();
  });
  page.on('pageerror', (err) => {
    const text = err && err.stack ? err.stack : String(err);
    consoleLog.push({ type: 'pageerror', text, time: Date.now() });
    log('[page:pageerror]', text);
  });
}

/** Throws on the first fatal console/page entry seen so far. Call often. */
function checkConsoleForFatal() {
  for (const entry of consoleLog) {
    if (entry.type === 'pageerror') throw new Error(`Uncaught page error: ${entry.text}`);
    if (entry.type === 'error') throw new Error(`Page console error: ${entry.text}`);
    for (const pat of FATAL_CONSOLE_PATTERNS) {
      if (pat.test(entry.text)) throw new Error(`Fatal console message (matched ${pat}): ${entry.text}`);
    }
  }
}

/* ─────────────────────────  vite dev server  ───────────────────────── */

async function startViteServer() {
  section('Starting vite dev server');
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!existsSync(viteBin)) {
    throw new Error(`vite entry script not found at ${viteBin} — is vite installed? (npm install)`);
  }

  // Pre-flight: --strictPort makes vite refuse to start if PORT is taken, but
  // that only helps if we notice — a stray/foreign process already answering
  // on PORT would otherwise satisfy the readiness poll below and this run
  // would silently drive a browser against THAT server instead of our own.
  // (Hit exactly this during development: a leftover vite from a manual debug
  // session was still bound to 5199, and it — not this run's own spawn, which
  // had in fact failed with EADDRINUSE — was what answered the first poll.)
  try {
    await fetch(BASE_URL, { method: 'GET', signal: AbortSignal.timeout(500) });
    throw new Error(
      `Something is already answering at ${BASE_URL} before this run even started vite. ` +
        `Refusing to proceed, since it could be a stray process this run would then be silently ` +
        `testing against instead of its own server. Free port ${PORT} and re-run.`,
    );
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Something is already answering')) throw err;
    // fetch failing (connection refused / timeout) is the expected, good case.
  }

  const args = [viteBin, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'];
  log('Spawning:', process.execPath, args.join(' '));
  const proc = spawn(process.execPath, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true, // own process group, so cleanup can signal any stray children too
    env: process.env,
  });
  viteProc = proc;

  const capture = (buf, streamLabel) => {
    for (const line of buf.toString('utf8').split(/\r?\n/)) {
      if (!line) continue;
      viteOutputLines.push(`[vite:${streamLabel}] ${line}`);
      if (viteOutputLines.length > 500) viteOutputLines.shift();
      log(`[vite:${streamLabel}]`, line);
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

  log(`Waiting for ${BASE_URL} to respond (timeout ${SERVER_READY_TIMEOUT_MS}ms)...`);
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
  for (;;) {
    if (earlyExit) {
      throw new Error(
        `vite dev server exited before becoming ready (code=${earlyExit.code} signal=${earlyExit.signal}` +
          `${earlyExit.error ? ` error=${earlyExit.error}` : ''})\n` +
          viteOutputLines.slice(-40).join('\n'),
      );
    }
    try {
      const res = await fetch(BASE_URL, { method: 'GET' });
      if (res.status >= 200 && res.status < 500) {
        log(`vite responded with HTTP ${res.status} — server is ready (pid ${proc.pid}).`);
        break;
      }
    } catch {
      /* connection refused / not listening yet — keep polling */
    }
    if (Date.now() > deadline) {
      throw new Error(`vite dev server did not answer HTTP within ${SERVER_READY_TIMEOUT_MS}ms`);
    }
    await sleep(200);
  }
  return proc;
}

async function stopViteServer() {
  const proc = viteProc;
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return;
  log('Stopping vite dev server (pid', proc.pid, ')...');
  try {
    // Negative pid == signal the whole detached process group (vite + any
    // esbuild/rollup helper children it may have spawned), not just the shim.
    process.kill(-proc.pid, 'SIGTERM');
  } catch {
    try {
      proc.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  }
  const exited = await Promise.race([
    new Promise((resolve) => proc.once('exit', () => resolve(true))),
    sleep(4000).then(() => false),
  ]);
  if (!exited) {
    warn('vite did not exit after SIGTERM — sending SIGKILL');
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

/* ─────────────────────────  Chromium resolution + launch  ───────────────────────── */

function resolveChromiumExecutable() {
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

const BASE_CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu-sandbox',
  '--window-size=1280,800',
];

// Tried in order; the environment notes say "try default headless first". Each
// is verified against BOTH a raw WebGL context probe and the real app
// actually reaching the title screen with no fatal boot error before it's
// accepted — see launchBrowserWithWebglFallback().
const LAUNCH_ATTEMPTS = [
  { label: 'default headless (no extra GL flags)', extraArgs: [] },
  {
    label: '--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader',
    extraArgs: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
  { label: '--use-gl=swiftshader --enable-unsafe-swiftshader', extraArgs: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] },
];

async function launchBrowserWithWebglFallback() {
  section(`Launching Chromium (headless=${!KEEP_OPEN})`);
  const executablePath = resolveChromiumExecutable();
  if (!executablePath) {
    throw new Error(
      `Could not find a chromium executable under PLAYWRIGHT_BROWSERS_PATH=` +
        `${process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers'}`,
    );
  }
  log('Using chromium executable:', executablePath);

  let lastErr = null;
  for (const attempt of LAUNCH_ATTEMPTS) {
    log(`Attempt: ${attempt.label}`);
    let browser = null;
    try {
      browser = await chromium.launch({
        executablePath,
        headless: !KEEP_OPEN,
        args: [...BASE_CHROME_ARGS, ...attempt.extraArgs],
      });
      browserRef = browser;
      // Small viewport deliberately: the Three.js stage (rain/weather particles,
      // character portrait, antialiasing) renders every frame under SwiftShader
      // software rasterization here, and its cost scales with pixel count. A
      // first pass at 1280x800 measured ~9-10s of real time per advance click
      // (the render loop competing with the page's main thread for every CDP
      // round trip) — this cuts pixel count by ~9x, which is what actually
      // fixed it (see the final report for the before/after numbers). Still a
      // real, laid-out desktop viewport; no selector in this script depends on
      // a specific size.
      const context = await browser.newContext({ viewport: { width: 480, height: 300 } });
      const page = await context.newPage();
      pageRef = page;
      wireConsoleCapture(page);

      log('Navigating to', BASE_URL);
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT_MS });

      const probe = await page.evaluate(() => {
        try {
          const canvas = document.getElementById('stage') || document.createElement('canvas');
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          if (!gl) return { ok: false, reason: 'getContext() returned null for webgl2/webgl' };
          // The plain RENDERER/VENDOR parameters are masked to a generic
          // "WebKit WebGL"/"WebKit" string; the debug extension (when exposed)
          // reports what's actually driving the context (e.g. SwiftShader).
          const dbg = gl.getExtension('WEBGL_debug_renderer_info');
          const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
          const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
          return { ok: true, renderer, vendor };
        } catch (e) {
          return { ok: false, reason: String(e) };
        }
      });
      log('Raw WebGL probe on #stage:', JSON.stringify(probe));

      log('Waiting for the title screen to appear...');
      await page.locator('.pq-title:not([hidden])').waitFor({ state: 'visible', timeout: STORY_START_TIMEOUT_MS });

      checkConsoleForFatal(); // catches "[pq] fatal boot error" (and any uncaught page error) if boot failed
      if (!probe.ok) throw new Error(`WebGL context unavailable: ${probe.reason}`);

      log(`SUCCESS with: ${attempt.label}`);
      log(`WebGL renderer: "${probe.renderer}" vendor: "${probe.vendor}"`);
      return { browser, page, flagsLabel: attempt.label, webgl: probe };
    } catch (err) {
      lastErr = err;
      warn(`Launch attempt failed (${attempt.label}):`, err && err.message ? err.message : err);
      if (browser) {
        await browser.close().catch(() => {});
        if (browserRef === browser) browserRef = null;
        pageRef = null;
      }
    }
  }
  throw new Error(
    `All Chromium launch attempts failed to reach the title screen with a working WebGL context. ` +
      `Last error: ${lastErr && lastErr.message ? lastErr.message : lastErr}`,
  );
}

/* ─────────────────────────  page-state snapshot  ───────────────────────── */

async function snapshotUi(page) {
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
      // Not just "not hidden": ChapterCard.hide() flips `open=false` and swaps
      // is-in -> is-out synchronously, but leaves the `hidden` attribute false
      // until its CSS fade finishes (transitionend, or a 640ms fallback) — so
      // `hidden` alone lags the real state by up to that long. is-in/is-out
      // mirror the synchronous flip and keep this snapshot honest immediately.
      chapterOpen: !!chapterEl && !chapterEl.hidden && chapterEl.classList.contains('is-in') && !chapterEl.classList.contains('is-out'),
      chapterTitle: chapterEl ? (chapterEl.querySelector('.pq-chapter__title')?.textContent ?? '') : '',
      dialogueVisible: !!dialogueEl && !dialogueEl.hidden,
      dialogueSpeaker: dialogueEl ? (dialogueEl.querySelector('.pq-dialogue__name')?.textContent ?? '') : '',
      dialogueText: dialogueEl
        ? (dialogueEl.querySelector('.pq-dialogue__body')?.textContent ?? '') +
          (dialogueEl.querySelector('.pq-dialogue__tail')?.textContent ?? '')
        : '',
      advanceArmed: !!advanceEl && advanceEl.classList.contains('is-armed'),
      choiceOpen: tiles.length > 0,
      choiceTexts: tiles.map((t) => (t.textContent || '').replace(/\s+/g, ' ').trim()),
    };
  });
}

/* ─────────────────────────  scenario steps  ───────────────────────── */

async function assertTitleScreenAndDiscovery(page) {
  section('Title screen: Lumen discovered, _template excluded');
  await page.locator('.pq-title:not([hidden])').waitFor({ state: 'visible', timeout: STORY_START_TIMEOUT_MS });
  log('Title screen is visible.');

  const info = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.pq-storycard'));
    const plate = document.querySelector('.pq-title__plate');
    const lockIdx = document.querySelector('.pq-lockslot__idx');
    return {
      cardCount: cards.length,
      cardLabels: cards.map((c) => c.getAttribute('aria-label') || ''),
      plateSrc: plate ? plate.getAttribute('src') : null,
      lockText: lockIdx ? lockIdx.textContent : null,
      titleInnerText: document.querySelector('.pq-title')?.innerText ?? '',
    };
  });
  log('Discovered story card(s):', JSON.stringify(info.cardLabels));
  log('Title backdrop plate src:', info.plateSrc);
  log('Locked-slot ledger text:', JSON.stringify(info.lockText));

  if (info.cardCount !== 1) {
    throw new Error(`Expected exactly 1 discovered story card, found ${info.cardCount}: ${JSON.stringify(info.cardLabels)}`);
  }
  if (!/lumen/i.test(info.cardLabels[0])) {
    throw new Error(`Expected the discovered story to be Lumen, got aria-label ${JSON.stringify(info.cardLabels[0])}`);
  }
  if (info.cardLabels.some((l) => /template/i.test(l))) {
    throw new Error(`A story card referencing "template" was found (_template must be excluded): ${JSON.stringify(info.cardLabels)}`);
  }
  if (/template/i.test(info.titleInnerText)) {
    throw new Error('The word "template" is visible on the title screen — _template must be excluded.');
  }
  if (!info.plateSrc || !info.plateSrc.includes('/stories/lumen/')) {
    throw new Error(`The visible title backdrop does not point at Lumen's art (src=${JSON.stringify(info.plateSrc)}).`);
  }
  if (!info.lockText || !/2\s+slots/i.test(info.lockText)) {
    // Corroborating evidence only (RAIL_SLOTS - discovered count); not a hard
    // requirement in case that constant ever changes.
    warn(`Locked-slot ledger read ${JSON.stringify(info.lockText)}, expected to mention "2 slots". Continuing.`);
  }
  log('PASS: Lumen is the sole discovered story (its own art is the visible title backdrop); "_template" appears nowhere.');
}

async function applyFastSettings(page) {
  section('Settings: Text speed -> Instant, Reduced motion -> on, Cinematic -> off');
  const settingsItem = page.locator('.pq-title__menu .pq-menuitem', { hasText: 'Settings' });
  await settingsItem.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
  await page.locator('.pq-modal--set.is-open').waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  log('Settings modal is open.');

  const speedInput = page.locator('input[aria-label="Text speed"]');
  await speedInput.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  await speedInput.click();
  await speedInput.press('Home'); // native <input type=range> behavior: Home -> min (0 == instant reveal)
  let speedVal = await speedInput.inputValue();
  if (speedVal !== '0') {
    warn(`Home key left the slider at "${speedVal}", not "0" — falling back to a direct value+input-event set.`);
    await speedInput.evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, '0');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    speedVal = await speedInput.inputValue();
  }
  log('Text speed slider value:', speedVal);
  if (speedVal !== '0') throw new Error(`Text speed slider did not reach "0" (Instant); got "${speedVal}"`);

  const reducedMotion = page.locator('button[aria-label="Reduced motion"]');
  await reducedMotion.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  if ((await reducedMotion.getAttribute('aria-checked')) !== 'true') {
    await reducedMotion.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
  }
  const checked = await reducedMotion.getAttribute('aria-checked');
  log('Reduced motion aria-checked:', checked);
  if (checked !== 'true') throw new Error(`Reduced motion toggle did not report aria-checked="true" (got "${checked}")`);

  // Cinematic (bloom/DoF/grade post-processing) off: purely a render-cost cut
  // for a software-rendered (SwiftShader) headless run — same real Settings
  // control a player would use on low-end hardware. Not required for
  // correctness, but meaningfully cheaper per Three.js frame.
  const cinematic = page.locator('button[aria-label="Cinematic"]');
  await cinematic.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  if ((await cinematic.getAttribute('aria-checked')) !== 'false') {
    await cinematic.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
  }
  log('Cinematic aria-checked:', await cinematic.getAttribute('aria-checked'));

  log('Closing Settings (Escape).');
  await page.keyboard.press('Escape');
  await page.locator('.pq-modal--set').waitFor({ state: 'hidden', timeout: STEP_TIMEOUT_MS });
  log('Settings closed.');
}

async function startLumen(page) {
  section('Starting Lumen via "New Story" (only story discovered -> starts immediately, no picker)');
  const newStoryBtn = page.locator('.pq-menuitem.is-primary');
  await newStoryBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  log('Clicking primary menu button:', JSON.stringify((await newStoryBtn.innerText()).trim()));
  await newStoryBtn.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });

  await page.locator('.pq-title').waitFor({ state: 'hidden', timeout: STORY_START_TIMEOUT_MS });
  log('Title screen dismissed.');

  await page.waitForFunction(
    () => {
      const ch = document.querySelector('.pq-chapter');
      const dl = document.querySelector('.pq-dialogue');
      return (ch && !ch.hidden) || (dl && !dl.hidden);
    },
    { timeout: STORY_START_TIMEOUT_MS },
  );
  checkConsoleForFatal();
  log('First story content is on screen — Lumen is running.');
}

async function playThroughToEnding(page) {
  section('Playing Lumen to an ending');
  log('Advance gesture: click .pq-advance.is-armed. Choice gesture: click the matching .pq-tile/.pq-choice.');
  log(`Expected choice path (first/on-script reply at each of ${EXPECTED_CHOICES.length} choice points):`);
  EXPECTED_CHOICES.forEach((c, i) => log(`  ${i + 1}. "${c}..."`));

  let advanceClicks = 0;
  let choicesMade = 0;
  let lastFingerprint = null;
  let lastChangeAt = Date.now();
  // A just-clicked choice tile lingers on screen for ~90ms (UILayer.selectChoice
  // takes the plain `window.setTimeout(finish, 90)` branch once Reduced motion
  // is on, skipping the FLIP-lift animation) before the panel actually clears —
  // so the choice screen we already answered can still be the thing our very
  // next snapshot sees. That's a transitional frame, not a stuck/wrong choice,
  // so a mismatch only becomes a hard failure once it persists past a short
  // grace window (comfortably above 90ms, well under STALL_MS).
  const CHOICE_MISMATCH_GRACE_MS = 5000;
  let choiceMismatchSince = null;
  // `@wait` nodes (e.g. the two in ending_withdraw/credits_end) don't touch
  // the dialogue box, so the click that resolves one leaves the SAME text on
  // screen as the say line before it — tracked here purely so the log says
  // that plainly instead of printing the same quoted line twice in a row.
  let lastLoggedDialogue = null;

  for (let step = 0; ; step++) {
    checkConsoleForFatal();
    if (step > MAX_ADVANCE_STEPS) {
      throw new Error(`Exceeded MAX_ADVANCE_STEPS (${MAX_ADVANCE_STEPS}) without reaching the credits — likely stuck or looping.`);
    }

    const snap = await snapshotUi(page);
    const fingerprint = JSON.stringify([snap.creditsVisible, snap.chapterOpen, snap.chapterTitle, snap.dialogueText, snap.choiceTexts]);
    if (fingerprint !== lastFingerprint) {
      lastFingerprint = fingerprint;
      lastChangeAt = Date.now();
    } else if (Date.now() - lastChangeAt > STALL_MS) {
      throw new Error(`UI has not changed for ${STALL_MS}ms while playing (possible soft-lock). Last snapshot: ${fingerprint}`);
    }

    if (snap.creditsVisible) {
      log(`Credits reached after ${advanceClicks} advance click(s) and ${choicesMade} choice(s).`);
      return { advanceClicks, choicesMade };
    }

    if (snap.choiceOpen) {
      // `expected === undefined` (more choice screens than the 3 the story
      // takes on this path) and `idx === -1` (tiles that don't contain the
      // expected text) get the SAME grace-then-fail treatment: both are
      // equally likely to be the choice screen we just answered, still on
      // screen mid its ~90ms dismiss animation (see CHOICE_MISMATCH_GRACE_MS
      // above) rather than a genuinely new/wrong one.
      const expected = EXPECTED_CHOICES[choicesMade];
      const idx = expected === undefined ? -1 : snap.choiceTexts.findIndex((t) => t.includes(expected));
      if (idx === -1) {
        if (choiceMismatchSince === null) choiceMismatchSince = Date.now();
        if (Date.now() - choiceMismatchSince > CHOICE_MISMATCH_GRACE_MS) {
          const what =
            expected === undefined
              ? `an unexpected extra choice screen (#${choicesMade + 1}; only ${EXPECTED_CHOICES.length} were expected)`
              : `no visible tile contained the expected text "${expected}" (choice #${choicesMade + 1})`;
          throw new Error(`${what}, persisting for over ${CHOICE_MISMATCH_GRACE_MS}ms. Tiles seen: ${JSON.stringify(snap.choiceTexts)}`);
        }
        // Likely still the PREVIOUS choice screen mid-dismiss-animation. Give
        // it a beat and re-snapshot rather than acting on stale tiles.
        await sleep(60);
        continue;
      }
      choiceMismatchSince = null;
      log(`Choice #${choicesMade + 1}/${EXPECTED_CHOICES.length}: tile ${idx} — "${snap.choiceTexts[idx].slice(0, 72)}..."`);
      await page.locator('.pq-tile, .pq-choice').nth(idx).click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
      choicesMade++;
      continue;
    }

    try {
      await page.locator('.pq-advance.is-armed').click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
    } catch (err) {
      throw new Error(
        `Could not click the advance affordance (.pq-advance.is-armed) at step ${step}: ` +
          `${err.message}\nLast snapshot: ${fingerprint}`,
      );
    }
    advanceClicks++;
    if (snap.chapterOpen) {
      log(`  [${advanceClicks}] dismissed chapter card: "${snap.chapterTitle}"`);
      lastLoggedDialogue = null;
    } else if (snap.dialogueVisible && snap.dialogueText === lastLoggedDialogue) {
      // Same text as last time with no chapter in between: this click resolved
      // a `@wait` beat (input:continue), not a new dialogue line.
      log(`  [${advanceClicks}] (resolved a @wait beat — dialogue unchanged)`);
    } else if (snap.dialogueVisible) {
      const who = snap.dialogueSpeaker ? `${snap.dialogueSpeaker}: ` : '(narration) ';
      const txt = snap.dialogueText.length > 64 ? snap.dialogueText.slice(0, 64) + '…' : snap.dialogueText;
      log(`  [${advanceClicks}] ${who}"${txt}"`);
      lastLoggedDialogue = snap.dialogueText;
    } else {
      log(`  [${advanceClicks}] advance click (no dialogue/chapter text captured — likely a @wait beat)`);
    }
  }
}

async function finishAtCredits(page) {
  section('Credits: verifying content, then returning to title');
  const credits = await page.evaluate(() => {
    const el = document.querySelector('.pq-credits');
    return { text: el ? el.innerText : '' };
  });
  log('Credits text (first 200 chars):', JSON.stringify(credits.text.slice(0, 200)));
  if (!/Lumen/.test(credits.text) || !/Lamplighter/.test(credits.text)) {
    throw new Error(`Credits panel did not contain the expected "Lumen"/"Lamplighter" text. Got: ${JSON.stringify(credits.text)}`);
  }

  const skipBtn = page.locator('.pq-credits__skip');
  await skipBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  log('Clicking credits button:', JSON.stringify((await skipBtn.innerText()).trim()));
  await skipBtn.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });

  await page.locator('.pq-credits').waitFor({ state: 'hidden', timeout: STEP_TIMEOUT_MS });
  await page.locator('.pq-title:not([hidden])').waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
  checkConsoleForFatal();
  log('Confirmed: credits closed and the app returned cleanly to the title screen.');
}

async function runScenario(page) {
  await assertTitleScreenAndDiscovery(page);
  await applyFastSettings(page);
  await startLumen(page);
  const stats = await playThroughToEnding(page);
  await finishAtCredits(page);
  checkConsoleForFatal();

  section('Playthrough summary');
  log(`Advance clicks: ${stats.advanceClicks}`);
  log(`Choices made:   ${stats.choicesMade} / ${EXPECTED_CHOICES.length}`);
  if (stats.choicesMade !== EXPECTED_CHOICES.length) {
    throw new Error(`Expected exactly ${EXPECTED_CHOICES.length} choices to be made, made ${stats.choicesMade}`);
  }
  if (stats.advanceClicks < MIN_EXPECTED_ADVANCES) {
    warn(
      `Only ${stats.advanceClicks} advance clicks recorded (expected roughly ~40 for a full Lumen ` +
        `playthrough — see the header comment's tally). Not failing on this alone.`,
    );
  }
  return stats;
}

/* ─────────────────────────  failure diagnostics  ───────────────────────── */

async function dumpFailureArtifacts(page, err) {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(ARTIFACTS_DIR, `fail-${stamp}`);
  section('Dumping failure artifacts');

  if (page && !page.isClosed()) {
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
    const dump = consoleLog.slice(-150).map((e) => `[${e.type}] ${e.text}`).join('\n');
    writeFileSync(`${base}.console.log`, dump, 'utf8');
    log('Console dump:', `${base}.console.log`, `(${Math.min(150, consoleLog.length)} of ${consoleLog.length} entries)`);
  } catch (e) {
    warn('saving console dump failed:', e.message);
  }

  try {
    writeFileSync(`${base}.vite.log`, viteOutputLines.slice(-150).join('\n'), 'utf8');
    log('Vite server log:', `${base}.vite.log`);
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

/* ─────────────────────────  top-level orchestration  ───────────────────────── */

async function finishAndExit(code, reasonLabel) {
  if (cleaningUp) return;
  cleaningUp = true;
  if (globalTimer) clearTimeout(globalTimer);
  if (KEEP_OPEN) {
    log(`--keep-open set: leaving Chromium and the vite dev server running (${reasonLabel}). Press Ctrl+C to exit.`);
    return;
  }
  try {
    if (browserRef) await browserRef.close().catch(() => {});
  } finally {
    await stopViteServer().catch(() => {});
    log(`Exiting with code ${code} (${reasonLabel})`);
    process.exit(code);
  }
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    warn(`received ${sig} — cleaning up...`);
    void finishAndExit(1, sig);
  });
}

async function main() {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  log(`Lamplighter e2e harness starting. keepOpen=${KEEP_OPEN} port=${PORT} globalTimeout=${GLOBAL_TIMEOUT_MS}ms`);

  await startViteServer();
  const { page, flagsLabel, webgl } = await launchBrowserWithWebglFallback();
  const stats = await runScenario(page);

  bannerPass([
    `Chromium launch flags: ${flagsLabel}`,
    `WebGL renderer: ${webgl.renderer} (vendor: ${webgl.vendor})`,
    `Advance clicks: ${stats.advanceClicks}, choices made: ${stats.choicesMade}/${EXPECTED_CHOICES.length}`,
    'Path: prologue -> scene_open -> open_script -> after_open -> atrium_scene -> building_script ->',
    '      after_building -> deeper_gate -> holding -> converge -> ch2 -> final_script -> climax ->',
    '      ending_withdraw -> credits_end -> END',
  ]);
  await finishAndExit(0, 'success');
}

globalTimer = setTimeout(async () => {
  const msg = `global timeout of ${GLOBAL_TIMEOUT_MS}ms exceeded`;
  bannerFail(msg);
  await dumpFailureArtifacts(pageRef, new Error(msg)).catch(() => {});
  await finishAndExit(1, 'global-timeout');
}, GLOBAL_TIMEOUT_MS);

main().catch(async (err) => {
  const msg = err && err.message ? err.message : String(err);
  bannerFail(msg);
  await dumpFailureArtifacts(pageRef, err).catch((e) => warn('dumpFailureArtifacts itself failed:', e));
  await finishAndExit(1, 'error');
});
