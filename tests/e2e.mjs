#!/usr/bin/env node
/**
 * Lamplighter — end-to-end Playwright harness.
 *
 *   node tests/e2e.mjs [--mode dev|preview|both] [--keep-open]
 *   npm run test:e2e                    (== --mode both)
 *
 * Boots real `vite` servers on scratch ports, drives a real headless
 * Chromium tab through the title screen, and proves the anthology AND the
 * in-app story generator both work start to finish. Exits 0 on success, 1 on
 * any failure (including any uncaught page error / "[pq] fatal boot error" /
 * "[pq:runtime]" console message — see helpers.mjs's console-error policy).
 *
 * Shared machinery (server boot/teardown, hermetic stories dirs, Chromium
 * launch, console capture, DOM snapshots, CreateStory driving helpers,
 * failure-artifact dumps) lives in tests/helpers.mjs — this file holds only
 * the six scenario bodies and the mode/group orchestration around them.
 *
 * ── Scenarios ───────────────────────────────────────────────────────────
 *   A  Boot: title screen, discovery, Create reachable.
 *   B  Play Lumen to an ending via the picker.
 *   D  API contract: /api/health, /api/stories, raw-socket traversal 404s.
 *   C  Create flow (mock, art off): menu -> premise -> Advanced -> mock ->
 *      Generate -> stage rail -> done -> Begin -> autostart lands DIRECTLY
 *      in Signal Hill (title never shown) -> advance a few lines.
 *   C2 From there: play Signal Hill to BOTH endings (derived from
 *      src/server/mock-story.ts — see ALL_SUGGESTED_CHOICES /
 *      OFF_SCRIPT_CHOICES below), restarting via the title screen between
 *      runs, asserting different final narration and two credits rolls.
 *   E  Art path: STORYGEN_IMAGE_BACKEND=mock + STORYGEN_MOCK_ART_DELAY_MS —
 *      per-asset SSE progress, "Begin now" before done, art finishes on
 *      disk after the client navigates away (the job is detached).
 *   F  Repair loop: STORYGEN_MOCK_BREAK=targets forces one bad draft;
 *      generation.json proves attempts.length===2 with a TARGET_MISSING
 *      first attempt.
 *
 * ── Server grouping (design doc §14.1) ─────────────────────────────────
 * A/B/D share one plain server per mode (nothing about them needs a
 * hermetic stories dir). C/C2 get their own hermetic server (art forced
 * OFF via STORYGEN_IMAGE_BACKEND=none, so the toggle's default state is
 * deterministic regardless of what's configured in .env.local). E and F
 * each get their own hermetic server too, and — because a full generate
 * cycle plus a real playthrough per mode adds real wall-clock time for
 * comparatively little additional proof once A-D have already run in both
 * modes — run dev-only; the design doc's own scenario table marks this
 * acceptable ("E/F may run dev-only"). That is 4 distinct server
 * configurations total (≤4 per the task brief), reused sequentially on the
 * SAME fixed port within a mode — never run concurrently, so "≤4" is about
 * distinct configurations, not simultaneous processes.
 *
 * Every hermetic server points STORYGEN_STORIES_DIR at a fresh OS-temp
 * directory seeded with copies of stories/lumen and stories/_template
 * (tests/helpers.mjs#makeHermeticStoriesDir) — nothing these scenarios
 * generate ever lands in the repo. IMPORTANT: the BUNDLED
 * `import.meta.glob` discovery path (src/engine/registry.ts) always reads
 * the REPO's own /stories/*, regardless of STORYGEN_STORIES_DIR — only the
 * RUNTIME path (/api/stories, read fresh off disk on every request) honours
 * the override. Signal Hill therefore exists ONLY via runtime discovery,
 * which is exactly the code path these scenarios exist to prove.
 *
 * ── A note on the repo's stories/ directory during this run ────────────
 * Another process in this environment may be running its own dev server on
 * a different port and writing a real generated story straight into the
 * repo's stories/ directory. This suite never touches stories/ itself
 * (every generation happens in a hermetic temp dir), and scenario A/D's
 * assertions are deliberately agnostic to how many OTHER story folders the
 * shared, non-hermetic group-1 server happens to discover there — they only
 * assert that Lumen is present and that "_template" never is, never an
 * exact count or a specific title being first.
 */

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  ART_DONE_TIMEOUT_MS,
  DEV_PORT,
  GENERATE_TIMEOUT_MS,
  PREVIEW_PORT,
  STEP_TIMEOUT_MS,
  STORY_START_TIMEOUT_MS,
  advanceFew,
  applyFastSettings,
  assertAutostartLandsInStory,
  assertCreditsContain,
  bannerFail,
  bannerPass,
  clickCreateResultButton,
  clickCreditsSkipAndReturnToTitle,
  clickGenerate,
  cleanupHermeticDir,
  dumpFailureArtifacts,
  ensureBuilt,
  fillPremiseViaChip,
  launchBrowser,
  log,
  makeHermeticStoriesDir,
  newPage,
  openCreateViaMenu,
  playToEnding,
  pollCreateUntil,
  rawHttpGet,
  readCreateStateNow,
  readGenerationJson,
  section,
  selectProvider,
  setArtToggle,
  startServer,
  startStoryFromPicker,
  stopServer,
  waitForArtSettled,
  warn,
} from './helpers.mjs';

const GLOBAL_TIMEOUT_MS = 30 * 60 * 1000; // whole-script budget across every mode/group

/* ─────────────────────────  CLI  ───────────────────────── */

function parseArgs(argv) {
  const keepOpen = argv.includes('--keep-open');
  const idx = argv.indexOf('--mode');
  const raw = idx !== -1 ? argv[idx + 1] : 'both';
  if (!['dev', 'preview', 'both'].includes(raw)) {
    throw new Error(`--mode must be one of dev|preview|both (got ${JSON.stringify(raw)})`);
  }
  const modes = raw === 'both' ? ['dev', 'preview'] : [raw];
  return { modes, keepOpen };
}
const { modes: MODES, keepOpen: KEEP_OPEN } = parseArgs(process.argv.slice(2));

/* ─────────────────────────  scenario A: boot + discovery  ───────────────────────── */

async function runScenarioA(page) {
  section('Scenario A — Boot: title screen, discovery, Create reachable');
  await page.locator('.pq-title:not([hidden])').waitFor({ state: 'visible', timeout: STORY_START_TIMEOUT_MS });
  log('Title screen is visible.');

  const before = await page.evaluate(() => ({
    wordmark: (document.querySelector('.pq-title__word-a')?.textContent ?? '') + (document.querySelector('.pq-title__word-b')?.textContent ?? ''),
    menuLabels: Array.from(document.querySelectorAll('.pq-menuitem__label')).map((l) => l.textContent || ''),
    titleInnerText: document.querySelector('.pq-title')?.innerText ?? '',
  }));
  log('Wordmark:', JSON.stringify(before.wordmark), 'Menu:', JSON.stringify(before.menuLabels));
  if (!/lamplighter/i.test(before.wordmark)) throw new Error(`Wordmark did not read "Lamplighter" (got ${JSON.stringify(before.wordmark)})`);
  if (!before.menuLabels.some((l) => /^new story$/i.test(l.trim()))) {
    throw new Error(`Menu did not contain "New Story": ${JSON.stringify(before.menuLabels)}`);
  }
  if (!before.menuLabels.some((l) => /create a story/i.test(l))) {
    throw new Error(`Expected a "Create a Story" menu entry (a live dev/preview server always answers /api/health here). Menu: ${JSON.stringify(before.menuLabels)}`);
  }
  if (/template/i.test(before.titleInnerText)) throw new Error('The word "template" is visible on the title screen.');

  // The create card and the discovered-story rail both live INSIDE the
  // picker (src/ui/TitleScreen.ts's renderRail), not on the base title
  // screen — open it via "New Story", which always opens the picker here
  // (canCreate() is true against any live server; design doc §12.1).
  const newStoryBtn = page.locator('.pq-menuitem.is-primary');
  await newStoryBtn.click({ timeout: STEP_TIMEOUT_MS, noWaitAfter: true });
  await page.locator('.pq-modal--picker.is-open').waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });

  const picker = await page.evaluate(() => {
    const allCards = Array.from(document.querySelectorAll('.pq-storycard'));
    const cards = allCards.filter((c) => !c.classList.contains('pq-storycard--create'));
    const createCard = document.querySelector('.pq-storycard--create');
    const lockslot = document.querySelector('.pq-lockslot');
    return {
      cardLabels: cards.map((c) => c.getAttribute('aria-label') || ''),
      createCardLabel: createCard ? createCard.getAttribute('aria-label') || '' : null,
      hasLockslot: !!lockslot,
    };
  });
  log('Picker cards:', JSON.stringify(picker.cardLabels), 'Create card:', JSON.stringify(picker.createCardLabel));

  // Deliberately NOT an exact count: another process in this environment may
  // have generated an extra story straight into the repo's stories/ dir
  // (see this file's header comment) — this only asserts Lumen is present
  // and _template never is, regardless of how many other cards exist.
  if (!picker.cardLabels.some((l) => /lumen/i.test(l))) {
    throw new Error(`Expected a card titled Lumen in the picker, got: ${JSON.stringify(picker.cardLabels)}`);
  }
  if (picker.cardLabels.some((l) => /template/i.test(l))) {
    throw new Error(`A story card referencing "template" was found (_template must be excluded): ${JSON.stringify(picker.cardLabels)}`);
  }
  if (!picker.createCardLabel || !/write a new/i.test(picker.createCardLabel)) {
    throw new Error(`Expected a create card on the shelf (server is up), got aria-label ${JSON.stringify(picker.createCardLabel)}`);
  }
  if (picker.hasLockslot) throw new Error('Expected .pq-lockslot to be ABSENT once a create card is shown — both rendered at once.');

  await page.keyboard.press('Escape');
  await page.locator('.pq-modal--picker').waitFor({ state: 'hidden', timeout: STEP_TIMEOUT_MS });
  log('PASS: Lumen is discovered, "_template" appears nowhere, Create is reachable via the menu and the shelf.');
}

/* ─────────────────────────  scenario B: play Lumen  ───────────────────────── */

// The suggested/on-script reply at each of Lumen's 3 choice points, in
// order — verified by hand against stories/lumen/story.pq. Matched with
// String.includes() against the rendered tile text, which is re-typeset by
// smartQuotes() (straight "/' -> curly, "--" -> em dash — src/ui/dom.ts), so
// every substring below is chosen from the middle of its sentence, clear of
// any apostrophe/quote/dash smartQuotes could touch.
const LUMEN_EXPECTED_CHOICES = [
  'Take all the time you need',
  'That sounds like a place that held real meaning',
  'LUMEN is always here whenever you need us',
];

async function runScenarioB(page, checkFatal) {
  section('Scenario B — Play Lumen to an ending');
  await applyFastSettings(page);
  await startStoryFromPicker(page, 'Lumen');
  checkFatal();

  const stats = await playToEnding(page, checkFatal, LUMEN_EXPECTED_CHOICES);
  if (stats.choicesMade !== LUMEN_EXPECTED_CHOICES.length) {
    throw new Error(`Expected exactly ${LUMEN_EXPECTED_CHOICES.length} choices, made ${stats.choicesMade}`);
  }
  await assertCreditsContain(page, ['Lumen', 'Lamplighter']);
  log(`Lumen playthrough: ${stats.advanceClicks} advance click(s), ${stats.choicesMade} choice(s).`);
  await clickCreditsSkipAndReturnToTitle(page);
  checkFatal();
  log('PASS: Lumen played start to finish, credits rolled, returned cleanly to the title screen.');
}

/* ─────────────────────────  scenario D: API contract  ───────────────────────── */

async function runScenarioD(baseUrl, port) {
  section('Scenario D — API contract');

  const health = await (await fetch(`${baseUrl}api/health`)).json();
  if (health.ok !== true) throw new Error(`/api/health: ok !== true (${JSON.stringify(health)})`);
  if (health.api !== '1.0') throw new Error(`/api/health: api !== "1.0" (got ${JSON.stringify(health.api)})`);
  if (health.providers?.mock?.configured !== true) {
    throw new Error(`/api/health: providers.mock.configured !== true (${JSON.stringify(health.providers?.mock)})`);
  }
  log('/api/health OK:', JSON.stringify({ ok: health.ok, api: health.api, mockConfigured: health.providers.mock.configured }));

  const storiesBody = await (await fetch(`${baseUrl}api/stories`)).json();
  if (storiesBody.api !== '1.0' || !Array.isArray(storiesBody.stories)) {
    throw new Error(`/api/stories: unexpected shape: ${JSON.stringify(storiesBody).slice(0, 300)}`);
  }
  const lumen = storiesBody.stories.find((s) => s.id === 'lumen');
  if (!lumen) throw new Error(`/api/stories: no "lumen" record. ids: ${storiesBody.stories.map((s) => s.id).join(', ')}`);
  if (!lumen.manifest || typeof lumen.manifest !== 'object') throw new Error('/api/stories: lumen record is missing a manifest.');
  if (typeof lumen.script !== 'string' || !lumen.script.trim()) throw new Error('/api/stories: lumen record has a missing/empty script.');
  if (!Array.isArray(lumen.assets) || lumen.assets.length < 1) throw new Error('/api/stories: lumen record has no assets.');
  for (const s of storiesBody.stories) {
    if (s.id.startsWith('_')) throw new Error(`/api/stories: a "_"-prefixed id was returned: ${s.id}`);
    for (const a of s.assets) {
      if (!a.path.startsWith('assets/')) throw new Error(`/api/stories: asset path does not start with "assets/": ${JSON.stringify(a)} (story ${s.id})`);
    }
  }
  log(`/api/stories OK: ${storiesBody.stories.length} stor${storiesBody.stories.length === 1 ? 'y' : 'ies'} total, lumen has ${lumen.assets.length} asset(s), nothing "_"-prefixed.`);

  // Raw-socket traversal checks: fetch()/curl (without --path-as-is) both
  // normalize ".." out of a URL's path BEFORE the request ever leaves the
  // process, which would silently test a different, harmless request
  // instead of the server's own defense — see rawHttpGet's doc comment.
  const traversal = await rawHttpGet('127.0.0.1', port, '/stories/lumen/../../package.json');
  if (traversal.status !== 404) throw new Error(`Traversal path did not 404 (got ${traversal.status}). Body: ${traversal.body.slice(0, 200)}`);
  if (/"name"\s*:\s*"lamplighter"/i.test(traversal.body)) throw new Error('Traversal response body looks like package.json — the traversal defense failed!');
  log('Raw traversal check (/stories/lumen/../../package.json, path-as-is) -> 404, confirmed.');

  const templateReq = await rawHttpGet('127.0.0.1', port, '/stories/_template/manifest.json');
  if (templateReq.status !== 404) throw new Error(`_template path did not 404 (got ${templateReq.status}). Body: ${templateReq.body.slice(0, 200)}`);
  log('Raw hidden-name check (/stories/_template/manifest.json) -> 404, confirmed.');
  log('PASS: API contract holds in both shape and traversal-safety.');
}

/* ─────────────────────────  scenario C / C2: Create + both endings  ───────────────────────── */

const SIGNAL_HILL_TITLE = 'Signal Hill';

// Derived by hand from src/server/mock-story.ts's fixed "Signal Hill"
// envelope (reproduced there verbatim from the design doc). Two guarded
// jump chains close the story:
//   :: close_warm / close_plain
//     -> ending_ferry {trust>=4}
//     -> ending_harbour
// `trust` starts at 0 and is only ever mutated by the OFF-SCRIPT (">!")
// option at each of the 6 choice menus (every ">" suggested option leaves it
// untouched). So:
//   - always taking the FIRST ("> suggested") option keeps trust at 0 for
//     the whole run -> falls through to ending_harbour.
//   - always taking the off-script ("!>") option accumulates trust well past
//     4 by the final menu -> ending_ferry.
// Verified line by line against the script; substrings below are chosen
// clear of any apostrophe/quote/dash smartQuotes() could touch, exactly
// like LUMEN_EXPECTED_CHOICES above.
const ALL_SUGGESTED_CHOICES = [
  'North light receiving. Go ahead, Wren',
  'Nobody is asking you to explain a bag',
  'It does not get to decide. You do',
  'You still have twenty minutes',
  'Whatever you decide, you will have decided it',
  'Still here. North light standing by',
];
const OFF_SCRIPT_CHOICES = [
  'I have got all night and nothing in it. Go on',
  'You called a radio at three in the morning to tell me you are not asking permission',
  'Then open it while I am here, and you will not have to do it alone',
  'You have been on this channel four hours to avoid twenty minutes',
  'Get on the boat, Wren',
  'Still here, Wren',
];

// backgrounds (declaration order) -> characters/poses (declaration order) ->
// cg, exactly the order tools/lib/asset-plan.mjs#planAssets walks
// Object.entries() over the manifest — see art.ts's `index/total`.
const EXPECTED_SIGNAL_HILL_ASSET_PATHS = [
  'assets/backgrounds/radio_room.png',
  'assets/backgrounds/harbour_dawn.png',
  'assets/characters/wren/guarded.png',
  'assets/characters/wren/thawing.png',
  'assets/characters/wren/decided.png',
  'assets/cg/cover_key.png',
];

async function runScenarioC_and_C2(page, checkFatal, storiesDir) {
  section('Scenario C — Create flow (mock, art off)');
  await applyFastSettings(page);

  await openCreateViaMenu(page);
  await fillPremiseViaChip(page);
  await selectProvider(page, 'Mock');
  await setArtToggle(page, false);
  await clickGenerate(page);

  // The 'connecting' view — and its stage rail, live at PLAN — is rendered
  // SYNCHRONOUSLY inside CreateStory#onGenerate(), before any network round
  // trip (src/ui/CreateStory.ts). The mock pipeline has no artificial delay
  // and can finish before a SECOND Playwright poll would ever land, so this
  // immediate, unpolled read is the only reliable place to "observe the
  // stage rail" rather than a race against however fast mock happens to be.
  const justClicked = await readCreateStateNow(page);
  const railLabels = justClicked.railSteps.map((s) => s.label);
  const expectedLabels = ['PLAN', 'WRITE', 'CHECK', 'SAVE', 'PAINT'];
  if (JSON.stringify(railLabels) !== JSON.stringify(expectedLabels)) {
    throw new Error(`Stage rail labels mismatch immediately after Generate. Expected ${JSON.stringify(expectedLabels)}, got ${JSON.stringify(railLabels)}`);
  }
  const liveStep = justClicked.railSteps.find((s) => s.state === 'live');
  if (!liveStep || liveStep.label !== 'PLAN') {
    throw new Error(`Expected the rail's live step to be PLAN immediately after clicking Generate, got ${JSON.stringify(justClicked.railSteps)}`);
  }
  log('Stage rail confirmed immediately after Generate:', JSON.stringify(justClicked.railSteps));

  const seenStages = new Set();
  const doneState = await pollCreateUntil(page, (s) => !!s.doneTitle, {
    timeoutMs: GENERATE_TIMEOUT_MS,
    onTick: (s) => {
      if (s.stagecopy) seenStages.add(s.stagecopy);
    },
  });
  log('Stage-copy line(s) observed en route to done:', JSON.stringify([...seenStages]));
  if (!doneState.doneTitle.includes(SIGNAL_HILL_TITLE)) {
    throw new Error(`Expected the done view to mention "${SIGNAL_HILL_TITLE}", got ${JSON.stringify(doneState.doneTitle)}`);
  }
  log(`Generation reached the done view: "${doneState.doneTitle}"`);

  await clickCreateResultButton(page, 'Begin');
  await assertAutostartLandsInStory(page, { expectChapterTitle: SIGNAL_HILL_TITLE });

  const seen = await advanceFew(page, 3);
  seen.forEach((snap, i) => {
    if (!snap.chapterOpen && !snap.dialogueText.trim()) {
      throw new Error(`advanceFew step ${i}: neither a chapter card nor dialogue text was visible. Snapshot: ${JSON.stringify(snap)}`);
    }
  });
  log(`Advanced ${seen.length} line(s) into Signal Hill; dialogue/chapter text present at every step.`);
  checkFatal();
  log('PASS: Create (mock, art off) -> reload lands directly in Signal Hill.');

  section('Scenario C2 — play Signal Hill to both endings');
  const run1 = await playToEnding(page, checkFatal, ALL_SUGGESTED_CHOICES);
  if (run1.choicesMade !== ALL_SUGGESTED_CHOICES.length) {
    throw new Error(`Run 1 (all-suggested -> ending_harbour): expected ${ALL_SUGGESTED_CHOICES.length} choices, made ${run1.choicesMade}`);
  }
  await assertCreditsContain(page, [SIGNAL_HILL_TITLE, 'Lamplighter']);
  log(`Run 1 (all-suggested) final narration before credits: ${JSON.stringify(run1.lastDialogueBeforeCredits)}`);
  await clickCreditsSkipAndReturnToTitle(page);
  checkFatal();

  await startStoryFromPicker(page, 'Signal Hill');
  const run2 = await playToEnding(page, checkFatal, OFF_SCRIPT_CHOICES);
  if (run2.choicesMade !== OFF_SCRIPT_CHOICES.length) {
    throw new Error(`Run 2 (off-script -> ending_ferry): expected ${OFF_SCRIPT_CHOICES.length} choices, made ${run2.choicesMade}`);
  }
  await assertCreditsContain(page, [SIGNAL_HILL_TITLE, 'Lamplighter']);
  log(`Run 2 (off-script) final narration before credits: ${JSON.stringify(run2.lastDialogueBeforeCredits)}`);

  if (!run1.lastDialogueBeforeCredits || !run2.lastDialogueBeforeCredits) {
    throw new Error('Could not capture a final narration line for one or both runs — cannot compare endings.');
  }
  if (run1.lastDialogueBeforeCredits === run2.lastDialogueBeforeCredits) {
    throw new Error(`Expected the two endings to show DIFFERENT final narration; both showed ${JSON.stringify(run1.lastDialogueBeforeCredits)}`);
  }
  log('PASS: the two runs ended on DIFFERENT final narration (different guarded-jump endings) and both rolled credits, no console error.');
  await clickCreditsSkipAndReturnToTitle(page);
  checkFatal();
}

/* ─────────────────────────  scenario E: art path  ───────────────────────── */

async function runScenarioE(page, checkFatal, storiesDir) {
  section('Scenario E — art path (STORYGEN_IMAGE_BACKEND=mock, per-asset SSE progress)');
  await applyFastSettings(page);

  await openCreateViaMenu(page);
  await fillPremiseViaChip(page);
  await selectProvider(page, 'Mock');
  await setArtToggle(page, true);
  await clickGenerate(page);

  let sawAssetLine = '';
  const readyState = await pollCreateUntil(page, (s) => !!s.readyBanner, {
    timeoutMs: GENERATE_TIMEOUT_MS,
    onTick: (s) => {
      if (s.assetline) sawAssetLine = s.assetline;
    },
  });
  if (!readyState.readyBanner.title.includes(SIGNAL_HILL_TITLE) || !/ready to play/i.test(readyState.readyBanner.title)) {
    throw new Error(`Unexpected "ready to play" banner: ${JSON.stringify(readyState.readyBanner)}`);
  }
  log('Ready-to-play banner confirmed (art still running, "ready" fired before "done"):', JSON.stringify(readyState.readyBanner));

  // STORYGEN_MOCK_ART_DELAY_MS keeps each asset observable for ~400ms —
  // comfortably above one poll tick — but poll a little longer here if the
  // very first asset hadn't started yet by the time `ready` arrived.
  if (!sawAssetLine) {
    await pollCreateUntil(page, (s) => !!s.assetline, {
      timeoutMs: 5000,
      onTick: (s) => {
        if (s.assetline) sawAssetLine = s.assetline;
      },
    }).catch(() => {});
  }
  if (!sawAssetLine) throw new Error('Never observed a per-asset progress line (.pq-create__assetline) while art was running.');
  log('Per-asset progress line observed:', JSON.stringify(sawAssetLine));

  // "Begin now" is offered BEFORE done — click it now, mid-art.
  await clickCreateResultButton(page, 'Begin now');
  await assertAutostartLandsInStory(page, { expectChapterTitle: SIGNAL_HILL_TITLE });
  checkFatal();
  log('PASS: "Begin now" adopted the story while art was still painting.');

  // The art job is detached (design doc §4.5) and keeps running server-side
  // after the client navigates away — verify completion directly on disk
  // rather than trying to keep an SSE connection alive across the reload.
  const meta = await waitForArtSettled(storiesDir, 'signal-hill', { timeoutMs: ART_DONE_TIMEOUT_MS });
  if (meta.art.state !== 'done') {
    throw new Error(`Expected generation.json art.state === 'done' once the job settled, got ${JSON.stringify(meta.art.state)}. assets: ${JSON.stringify(meta.art.assets)}`);
  }
  const storyDir = path.join(storiesDir, 'signal-hill');
  for (const rel of EXPECTED_SIGNAL_HILL_ASSET_PATHS) {
    const p = path.join(storyDir, rel);
    if (!existsSync(p)) throw new Error(`Expected asset PNG missing on disk: ${rel}`);
    if (statSync(p).size <= 0) throw new Error(`Asset PNG is empty: ${rel}`);
  }
  log(`PASS: all ${EXPECTED_SIGNAL_HILL_ASSET_PATHS.length} planned assets exist on disk; generation.json art.state === 'done'.`);
}

/* ─────────────────────────  scenario F: repair loop  ───────────────────────── */

async function runScenarioF(page, checkFatal, storiesDir) {
  section('Scenario F — repair loop (STORYGEN_MOCK_BREAK=targets)');
  await applyFastSettings(page);

  await openCreateViaMenu(page);
  await fillPremiseViaChip(page);
  await selectProvider(page, 'Mock');
  await setArtToggle(page, false);
  await clickGenerate(page);

  let sawRepairStagecopy = false;
  const doneState = await pollCreateUntil(page, (s) => !!s.doneTitle, {
    timeoutMs: GENERATE_TIMEOUT_MS,
    onTick: (s) => {
      if (/fixing|attempt/i.test(s.stagecopy)) sawRepairStagecopy = true;
    },
  });
  if (!doneState.doneTitle.includes(SIGNAL_HILL_TITLE)) {
    throw new Error(`Expected the done view to mention "${SIGNAL_HILL_TITLE}" despite the injected defect, got ${JSON.stringify(doneState.doneTitle)}`);
  }
  log(`Generation succeeded after repair: "${doneState.doneTitle}"`);
  // Best-effort/soft signal only — see this file's flake-risk notes in the
  // final report. generation.json (below) is the authoritative proof.
  if (sawRepairStagecopy) log('Also observed a "repair" stage-copy line in the UI along the way.');
  else warn('Did not observe a "repair" stage-copy line in the UI while polling (best-effort only — the mock repair pass can outrun a poll tick). generation.json is the real proof and is checked next.');

  const meta = readGenerationJson(storiesDir, 'signal-hill');
  if (!Array.isArray(meta.attempts) || meta.attempts.length !== 2) {
    throw new Error(`Expected generation.json attempts.length === 2, got ${JSON.stringify(meta.attempts)}`);
  }
  const [first, second] = meta.attempts;
  if (first.ok !== false) throw new Error(`Expected attempts[0].ok === false, got ${JSON.stringify(first)}`);
  if (!Array.isArray(first.issues) || !first.issues.includes('TARGET_MISSING')) {
    throw new Error(`Expected attempts[0].issues to contain "TARGET_MISSING", got ${JSON.stringify(first.issues)}`);
  }
  if (second.ok !== true) throw new Error(`Expected attempts[1].ok === true (the repaired attempt), got ${JSON.stringify(second)}`);
  log('PASS: generation.json confirms the repair loop — attempts[0] failed with TARGET_MISSING, attempts[1] (the repair) succeeded.');
}

/* ─────────────────────────  orchestration  ───────────────────────── */

let browser = null;
let currentDiag = { page: null, consoleLog: [], serverOutputs: [], label: 'startup' };
let globalTimer = null;
let cleaningUp = false;

/**
 * Runs one scenario group: its own server + its own fresh page/context,
 * always torn down. The browser itself is launched lazily on the very first
 * group of the whole run (and reused for every group after — WebGL launch
 * flags don't depend on which server/port is live) and verified against
 * THIS group's own server before any scenario code sees the page.
 */
async function runGroup({ mode, port, env, label, hermeticTag, run }) {
  const hermeticDir = hermeticTag ? makeHermeticStoriesDir(hermeticTag) : null;
  const finalEnv = hermeticDir ? { ...env, STORYGEN_STORIES_DIR: hermeticDir } : env;
  const server = await startServer({ mode, port, env: finalEnv, label });
  // Everything from here on MUST be inside this try/finally: once a server
  // has actually started, ANY later throw (browser launch, page creation,
  // navigation, the scenario itself) has to still stop it — a server that
  // outlives a mid-setup failure is exactly the stray-process trap the
  // preflight check in startServer() exists to catch on the NEXT run.
  let ctx = null;
  try {
    if (!browser) ({ browser } = await launchBrowser(server.baseUrl));
    ctx = await newPage(browser, label);
    currentDiag = { page: ctx.page, consoleLog: ctx.consoleLog, serverOutputs: server.outputLines, label };
    section(`Navigating to ${server.baseUrl} (${label})`);
    await ctx.page.goto(server.baseUrl, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT_MS });
    await run({ page: ctx.page, checkFatal: ctx.checkFatal, storiesDir: hermeticDir, baseUrl: server.baseUrl, port });
  } catch (err) {
    await dumpFailureArtifacts({ page: ctx?.page, err, consoleLog: ctx?.consoleLog ?? [], serverOutputs: server.outputLines, label });
    throw err;
  } finally {
    if (ctx) await ctx.context.close().catch(() => {});
    await stopServer(server);
    if (hermeticDir) cleanupHermeticDir(hermeticDir);
  }
}

async function runMode(mode) {
  const port = mode === 'dev' ? DEV_PORT : PREVIEW_PORT;
  section(`═══ MODE: ${mode} (port ${port}) ═══`);

  if (mode === 'preview') await ensureBuilt();

  // Group 1 — plain server, shared by A/B/D (design doc §14.1).
  await runGroup({
    mode,
    port,
    env: {},
    label: `${mode}-shared`,
    run: async ({ page, checkFatal, baseUrl }) => {
      await runScenarioA(page);
      await runScenarioB(page, checkFatal);
      await runScenarioD(baseUrl, port);
    },
  });

  // Group 2 — hermetic mock server (art forced off), shared by C/C2.
  await runGroup({
    mode,
    port,
    env: { STORYGEN_IMAGE_BACKEND: 'none' },
    label: `${mode}-C`,
    hermeticTag: `${mode}-c`,
    run: async ({ page, checkFatal, storiesDir }) => {
      await runScenarioC_and_C2(page, checkFatal, storiesDir);
    },
  });

  if (mode === 'dev') {
    // Group 3 — hermetic mock-art server, scenario E. Dev-only: E adds a
    // full generate+art+reload cycle for comparatively little additional
    // proof once the plugin's dev/preview parity is already established by
    // A-D running in both modes above — kept dev-only purely for run time.
    await runGroup({
      mode: 'dev',
      port,
      env: { STORYGEN_IMAGE_BACKEND: 'mock', STORYGEN_MOCK_ART_DELAY_MS: '400' },
      label: 'dev-E',
      hermeticTag: 'dev-e',
      run: async ({ page, checkFatal, storiesDir }) => {
        await runScenarioE(page, checkFatal, storiesDir);
      },
    });

    // Group 4 — hermetic repair-loop server, scenario F. Same dev-only
    // rationale as E.
    await runGroup({
      mode: 'dev',
      port,
      env: { STORYGEN_MOCK_BREAK: 'targets' },
      label: 'dev-F',
      hermeticTag: 'dev-f',
      run: async ({ page, checkFatal, storiesDir }) => {
        await runScenarioF(page, checkFatal, storiesDir);
      },
    });
  }
}

async function finishAndExit(code, reasonLabel) {
  if (cleaningUp) return;
  cleaningUp = true;
  if (globalTimer) clearTimeout(globalTimer);
  if (KEEP_OPEN && code === 0) {
    log(`--keep-open set: leaving the last Chromium instance running (${reasonLabel}). Press Ctrl+C to exit.`);
    return;
  }
  try {
    if (browser) await browser.close().catch(() => {});
  } finally {
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
  log(`Lamplighter e2e harness starting. modes=${JSON.stringify(MODES)} keepOpen=${KEEP_OPEN} globalTimeout=${GLOBAL_TIMEOUT_MS}ms`);
  for (const mode of MODES) {
    await runMode(mode);
  }

  bannerPass([
    `Modes run: ${MODES.join(', ')}`,
    'Scenario A (boot/discovery), B (Lumen playthrough), D (API contract) — every mode.',
    'Scenario C (Create, mock, art off -> autostart) and C2 (both Signal Hill endings) — every mode.',
    MODES.includes('dev') ? 'Scenario E (art path, mock backend) and F (repair loop) — dev only.' : 'Scenario E/F skipped (dev-only, dev mode not selected).',
  ]);
  await finishAndExit(0, 'success');
}

globalTimer = setTimeout(async () => {
  const msg = `global timeout of ${GLOBAL_TIMEOUT_MS}ms exceeded`;
  bannerFail(msg);
  await dumpFailureArtifacts({ ...currentDiag, err: new Error(msg), label: `${currentDiag.label}-global-timeout` }).catch(() => {});
  await finishAndExit(1, 'global-timeout');
}, GLOBAL_TIMEOUT_MS);

main().catch(async (err) => {
  const msg = err && err.message ? err.message : String(err);
  bannerFail(msg);
  await dumpFailureArtifacts({ ...currentDiag, err }).catch((e) => warn('dumpFailureArtifacts itself failed:', e));
  await finishAndExit(1, 'error');
});
