/**
 * Lamplighter — validator unit tests (design doc §14.2).
 *
 * `validate.ts` is pure, so it is directly testable — but it imports
 * `../engine/parser` extensionlessly, which Node's ESM resolver will not
 * resolve even though Node 22.22 strips TS types natively. This file
 * esbuild-bundles `src/server/validate.ts` (plus `prompt.ts` and
 * `mock-story.ts`, its only same-lane dependencies) once into `.tmp/` and
 * imports that — the same trick the real server relies on Vite's own
 * esbuild-based config loader for when it bundles `parser.ts` into the
 * plugin (design doc §2, §17.4).
 *
 * Deliberately self-contained rather than delegated to `tests/helpers.mjs`:
 * per the design doc's own file manifest, that file's job is e2e server
 * boot/teardown and Chromium path resolution — the e2e suite's concern, not
 * this one's — so bundling locally here avoids competing over that file.
 *
 * `node --test tests/validate.test.ts` runs this directly; Node 22 strips
 * the file's own top-level TypeScript syntax natively, and everything it
 * imports from the server lane comes from the pre-bundled, type-free output
 * of the `before()` hook below.
 */

import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, '.tmp', 'storygen-unit-test');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

// Populated in before(), read by every test below.
let validateEnvelope: (raw: unknown, profile: unknown) => {
  ok: boolean;
  issues: Array<{ code: string; severity: 'fatal' | 'warn'; message: string }>;
  envelope?: { manifest: { artStyle?: string } };
  stats: Record<string, number>;
};
let LENGTH_PROFILES: Record<'short' | 'standard' | 'long', unknown>;
let SYSTEM_PROMPT: string;
let MOCK_STORY: unknown;

before(async () => {
  await mkdir(OUT_DIR, { recursive: true });
  await esbuild.build({
    entryPoints: [
      path.join(ROOT, 'src/server/validate.ts'),
      path.join(ROOT, 'src/server/prompt.ts'),
      path.join(ROOT, 'src/server/mock-story.ts'),
    ],
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    outdir: OUT_DIR,
    chunkNames: 'chunk-[hash]',
  });
  // Cache-bust: re-running the test suite in one process (unlikely, but
  // cheap insurance) must not silently import a stale bundle.
  const bust = `?t=${Date.now()}`;
  const importFrom = (file: string) => import(`${pathToFileURL(path.join(OUT_DIR, file)).href}${bust}`);
  const validateMod = (await importFrom('validate.js')) as { validateEnvelope: typeof validateEnvelope };
  const promptMod = (await importFrom('prompt.js')) as { LENGTH_PROFILES: typeof LENGTH_PROFILES; SYSTEM_PROMPT: string };
  const mockMod = (await importFrom('mock-story.js')) as { MOCK_STORY: unknown };
  validateEnvelope = validateMod.validateEnvelope;
  LENGTH_PROFILES = promptMod.LENGTH_PROFILES;
  SYSTEM_PROMPT = promptMod.SYSTEM_PROMPT;
  MOCK_STORY = mockMod.MOCK_STORY;
});

async function loadFixture(name: string): Promise<unknown> {
  const raw = await readFile(path.join(FIXTURES_DIR, `${name}.json`), 'utf8');
  return JSON.parse(raw);
}

function fatalCodes(result: { issues: Array<{ code: string; severity: string }> }): string[] {
  return result.issues.filter((i) => i.severity === 'fatal').map((i) => i.code);
}

/** One fixture per rule family (design doc §14.2's table). */
const CASES: Array<{ fixture: string; expect: string[] }> = [
  { fixture: 'good-standard', expect: [] },
  { fixture: 'bad-shape', expect: ['ENVELOPE_SHAPE'] },
  { fixture: 'bad-parse', expect: ['PARSE_WARNING'] },
  { fixture: 'bad-target', expect: ['TARGET_MISSING'] },
  { fixture: 'bad-orphan', expect: ['LABEL_ORPHAN'] },
  { fixture: 'bad-speaker', expect: ['SPEAKER_UNDECLARED'] },
  { fixture: 'bad-pose', expect: ['POSE_UNDECLARED'] },
  { fixture: 'bad-audio', expect: ['AUDIO_UNDECLARED', 'SYNTH_UNKNOWN'] },
  { fixture: 'bad-file-key', expect: ['FILE_KEY_PRESENT'] },
  { fixture: 'bad-guard-var', expect: ['GUARD_UNKNOWN_VAR'] },
  { fixture: 'bad-one-ending', expect: ['ENDINGS_TOO_FEW'] },
  { fixture: 'bad-loop', expect: ['CYCLE_NO_PROGRESS'] },
  { fixture: 'bad-budget', expect: ['ASSET_BUDGET'] },
  { fixture: 'warn-artstyle', expect: [] },
];

for (const { fixture, expect } of CASES) {
  test(`validateEnvelope: ${fixture}`, async () => {
    const envelope = await loadFixture(fixture);
    const result = validateEnvelope(envelope, (LENGTH_PROFILES as Record<string, unknown>).standard);
    if (expect.length === 0) {
      assert.equal(result.ok, true, `expected ok:true, got fatal issues: ${JSON.stringify(fatalCodes(result))}`);
    } else {
      assert.equal(result.ok, false, `expected ok:false (fatal ${expect.join(', ')}), but validation passed`);
      const codes = fatalCodes(result);
      for (const code of expect) {
        assert.ok(codes.includes(code), `expected fatal code "${code}", got [${codes.join(', ')}]`);
      }
    }
  });
}

test('good-standard: stats land inside every standard-profile band', async () => {
  const envelope = await loadFixture('good-standard');
  const result = validateEnvelope(envelope, (LENGTH_PROFILES as Record<string, any>).standard);
  assert.equal(result.ok, true);
  const p = (LENGTH_PROFILES as Record<string, any>).standard;
  assert.ok(result.stats.lines >= p.linesMin && result.stats.lines <= p.linesMax, `lines=${result.stats.lines}`);
  assert.ok(result.stats.menus >= p.menusMin && result.stats.menus <= p.menusMax, `menus=${result.stats.menus}`);
  assert.ok(
    result.stats.backgrounds >= p.backgroundsMin && result.stats.backgrounds <= p.backgroundsMax,
    `backgrounds=${result.stats.backgrounds}`,
  );
  assert.ok(
    result.stats.characters >= p.charactersMin && result.stats.characters <= p.charactersMax,
    `characters=${result.stats.characters}`,
  );
  assert.ok(result.stats.endings >= p.endingsMin, `endings=${result.stats.endings}`);
  assert.ok(result.stats.labels >= p.labelsMin && result.stats.labels <= p.labelsMax, `labels=${result.stats.labels}`);
  assert.ok(result.stats.images <= p.imageBudget, `images=${result.stats.images}`);
  assert.ok(result.stats.offscriptOptions >= 2);
  assert.ok(result.stats.sets >= 6);
  assert.ok(result.stats.guards >= 3);
});

test('warn-artstyle: ok:true and the missing suffix was auto-appended', async () => {
  const envelope = await loadFixture('warn-artstyle');
  const result = validateEnvelope(envelope, (LENGTH_PROFILES as Record<string, unknown>).standard);
  assert.equal(result.ok, true);
  const warnCodes = result.issues.filter((i) => i.severity === 'warn').map((i) => i.code);
  assert.ok(warnCodes.includes('ARTSTYLE_SUFFIX'), `expected an ARTSTYLE_SUFFIX warning, got [${warnCodes.join(', ')}]`);
  assert.ok(result.envelope, 'expected the repaired envelope to be present when ok');
  const artStyle = result.envelope?.manifest.artStyle ?? '';
  assert.ok(
    artStyle.toLowerCase().trim().endsWith('no text, no ui, no border, no watermark.'),
    `artStyle does not end with the required suffix: "${artStyle}"`,
  );
});

/* ── the two direct assertions on the mock story (design doc §14.2, closing paragraph) ── */

test('mock story ("Signal Hill") validates cleanly at the short profile', () => {
  const result = validateEnvelope(MOCK_STORY, (LENGTH_PROFILES as Record<string, unknown>).short);
  assert.equal(result.ok, true, `mock story failed validation: ${JSON.stringify(fatalCodes(result))}`);
});

test('SYSTEM_PROMPT names every synth preset (guards against drift from src/audio/synth.ts)', () => {
  const synthPresets = ['pad', 'drone', 'rain', 'hum', 'wind', 'chime', 'click', 'tone'];
  for (const preset of synthPresets) {
    assert.ok(SYSTEM_PROMPT.includes(preset), `SYSTEM_PROMPT is missing synth preset "${preset}"`);
  }
});
