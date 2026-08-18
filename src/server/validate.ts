/**
 * Lamplighter — pure envelope validator: the real parser + the design doc's
 * §8.2 checklist (34 rules). Envelope in, ValidationResult out — no
 * filesystem, no network, no clock — which is what makes it directly
 * unit-testable from Node (tests/validate.test.ts) and safe to run against an
 * untrusted model reply before a single byte reaches disk.
 *
 * It imports `../engine/parser` (and lexer/guards) DIRECTLY, never
 * `../engine/index`, because that barrel re-exports `registry.ts`, which
 * calls `import.meta.glob` and only exists inside a Vite browser bundle.
 *
 * Deviation from the doc worth recording up front: `Issue.line` is populated
 * only where a real line number exists — `parse().warnings[].line` (rule 6)
 * and the raw-text scan in rule 32 (TEXT_HYGIENE). Every other structural
 * rule (9, 10, 11, ... walking the parsed AST) leaves `line` undefined and
 * names the offending label/target/speaker in `message`/`at` instead, because
 * `StoryNode` (src/core/types.ts) carries no per-node line metadata — only
 * the lexer's transient `LexLine` and the parser's `ParseWarning` do, and
 * recovering positions for every node would mean re-implementing the
 * parser's tokenizer a second time inside the validator.
 */

import type { ParsedStory, StoryManifest, StoryNode } from '../core/types';
import { evalGuard } from '../engine/guards';
import { lex } from '../engine/lexer';
import { parse } from '../engine/parser';
import { STATE_GUARDS_MIN, STATE_SETS_MIN, STATE_SET_VARS_MIN } from './limits';
import type { LengthProfile } from './prompt';

export type Severity = 'fatal' | 'warn';

export type IssueCode =
  | 'ENVELOPE_SHAPE'
  | 'ID_INVALID'
  | 'TITLE_INVALID'
  | 'THEME_COLOR'
  | 'THEME_RANGE'
  | 'PARSE_WARNING'
  | 'LABELS_COUNT'
  | 'ENTRY_MISSING'
  | 'TARGET_MISSING'
  | 'LABEL_ORPHAN'
  | 'SPEAKER_UNDECLARED'
  | 'CHAR_UNDECLARED'
  | 'POSE_UNDECLARED'
  | 'BG_UNDECLARED'
  | 'AUDIO_UNDECLARED'
  | 'SYNTH_UNKNOWN'
  | 'FILE_KEY_PRESENT'
  | 'MENUS_COUNT'
  | 'OFFSCRIPT_TOO_FEW'
  | 'SETS_TOO_FEW'
  | 'GUARDS_TOO_FEW'
  | 'GUARD_UNKNOWN_VAR'
  | 'GUARD_UNPARSEABLE'
  | 'ENDINGS_TOO_FEW'
  | 'ENDING_UNGUARDED'
  | 'CYCLE_NO_PROGRESS'
  | 'LINES_RANGE'
  | 'ASSET_BUDGET'
  | 'COVER_MISSING'
  | 'PROMPT_EMPTY'
  | 'ARTSTYLE_SUFFIX'
  | 'TEXT_HYGIENE'
  | 'VARS_COUNT'
  | 'CREDITS_SHAPE';

/** The §8.2 table's own 1-34 numbering — used to sort a repair message structure-first. */
export const ISSUE_RULE_NUMBER: Record<IssueCode, number> = {
  ENVELOPE_SHAPE: 1,
  ID_INVALID: 2,
  TITLE_INVALID: 3,
  THEME_COLOR: 4,
  THEME_RANGE: 5,
  PARSE_WARNING: 6,
  LABELS_COUNT: 7,
  ENTRY_MISSING: 8,
  TARGET_MISSING: 9,
  LABEL_ORPHAN: 10,
  SPEAKER_UNDECLARED: 11,
  CHAR_UNDECLARED: 12,
  POSE_UNDECLARED: 13,
  BG_UNDECLARED: 14,
  AUDIO_UNDECLARED: 15,
  SYNTH_UNKNOWN: 16,
  FILE_KEY_PRESENT: 17,
  MENUS_COUNT: 18,
  OFFSCRIPT_TOO_FEW: 19,
  SETS_TOO_FEW: 20,
  GUARDS_TOO_FEW: 21,
  GUARD_UNKNOWN_VAR: 22,
  GUARD_UNPARSEABLE: 23,
  ENDINGS_TOO_FEW: 24,
  ENDING_UNGUARDED: 25,
  CYCLE_NO_PROGRESS: 26,
  LINES_RANGE: 27,
  ASSET_BUDGET: 28,
  COVER_MISSING: 29,
  PROMPT_EMPTY: 30,
  ARTSTYLE_SUFFIX: 31,
  TEXT_HYGIENE: 32,
  VARS_COUNT: 33,
  CREDITS_SHAPE: 34,
};

export interface Issue {
  code: IssueCode;
  severity: Severity;
  message: string;
  /** 1-based script line where the problem is, when it is locatable. */
  line?: number;
  /** Dotted manifest path, e.g. "characters.wren.poses.tired". */
  at?: string;
}

export interface StoryEnvelope {
  manifest: StoryManifest;
  script: string;
}

export interface ValidationResult {
  /** No fatal issues. */
  ok: boolean;
  issues: Issue[];
  /** Present when ok — the parsed script, so the caller need not re-parse. */
  parsed?: ParsedStory;
  /**
   * Present when ok — the envelope with every auto-repair applied (slugified
   * id, appended artStyle suffix, clamped theme numbers, defaulted credits/
   * author/home/scale/defaultPose/parallax/focus, unknown keys dropped).
   * NOT in the design doc's ValidationResult shape verbatim: the doc
   * describes `validate.ts` as pure (no filesystem/network/clock, and no
   * mutation of its input either), yet its own auto-repair list has to reach
   * the caller somehow to actually land on disk. This field is the minimal,
   * non-mutating way to do that — write-story.ts must write THIS envelope,
   * never the model's raw, un-repaired one.
   */
  envelope?: StoryEnvelope;
  stats: {
    labels: number;
    lines: number;
    menus: number;
    offscriptOptions: number;
    sets: number;
    guards: number;
    endings: number;
    vars: number;
    backgrounds: number;
    characters: number;
    poses: number;
    cg: number;
    images: number;
  };
}

const ZERO_STATS: ValidationResult['stats'] = {
  labels: 0,
  lines: 0,
  menus: 0,
  offscriptOptions: 0,
  sets: 0,
  guards: 0,
  endings: 0,
  vars: 0,
  backgrounds: 0,
  characters: 0,
  poses: 0,
  cg: 0,
  images: 0,
};

const ALLOWED_SYNTHS = new Set(['pad', 'drone', 'rain', 'hum', 'wind', 'chime', 'click', 'tone']);
const ARTSTYLE_SUFFIX_TEXT = 'no text, no UI, no border, no watermark.';

/* ─────────────────────────────  small pure helpers  ───────────────────────────── */

function mk(code: IssueCode, severity: Severity, message: string, extra?: { line?: number; at?: string }): Issue {
  const issue: Issue = { code, severity, message };
  if (extra?.line !== undefined) issue.line = extra.line;
  if (extra?.at !== undefined) issue.at = extra.at;
  return issue;
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function slugify(s: string): string {
  let out = s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (out.length > 40) out = out.slice(0, 40).replace(/-+$/g, '');
  return out;
}

function isValidId(s: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(s);
}

/** id as authored → slugified id → slugified title → give up. */
function resolveId(rawId: unknown, title: unknown): { id: string | null; changed: boolean } {
  const idStr = typeof rawId === 'string' ? rawId : '';
  const fromId = slugify(idStr);
  if (isValidId(fromId)) return { id: fromId, changed: fromId !== rawId };
  const titleStr = typeof title === 'string' ? title : '';
  const fromTitle = slugify(titleStr);
  if (isValidId(fromTitle)) return { id: fromTitle, changed: true };
  return { id: null, changed: false };
}

function endsWithSuffixCI(s: string, suffix: string): boolean {
  const norm = (x: string) => x.trim().toLowerCase().replace(/\.?\s*$/, '');
  return norm(s).endsWith(norm(suffix));
}

function clampField(obj: Record<string, unknown>, key: string, lo: number, hi: number, notes: string[], label: string): void {
  const v = obj[key];
  if (typeof v === 'number' && (v < lo || v > hi)) {
    const c = Math.min(hi, Math.max(lo, v));
    obj[key] = c;
    notes.push(`${label} ${v}→${c}`);
  }
}

/** Deep-scans an arbitrary manifest value for a literal `file`/`files`/`layers` key (rule 17). */
function findForbiddenKeys(v: unknown, path: string, hits: string[]): void {
  if (Array.isArray(v)) {
    v.forEach((item, i) => findForbiddenKeys(item, `${path}[${i}]`, hits));
    return;
  }
  if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const p = path ? `${path}.${k}` : k;
      if (k === 'file' || k === 'files' || k === 'layers') hits.push(p);
      findForbiddenKeys(val, p, hits);
    }
  }
}

/* ─────────────────────────────  AST walking  ───────────────────────────── */

function allNodes(parsed: ParsedStory): Array<{ label: string; node: StoryNode }> {
  const out: Array<{ label: string; node: StoryNode }> = [];
  for (const label of parsed.order) {
    for (const node of parsed.labels[label] ?? []) out.push({ label, node });
  }
  return out;
}

/** label → declared jump/choice targets (guard-insensitive: a guard could be true). */
function buildEdges(parsed: ParsedStory): Map<string, string[]> {
  const edges = new Map<string, string[]>();
  for (const label of parsed.order) {
    const targets: string[] = [];
    for (const node of parsed.labels[label] ?? []) {
      if (node.kind === 'jump' && node.target !== 'END') targets.push(node.target);
      if (node.kind === 'choice') for (const opt of node.options) if (opt.target !== 'END') targets.push(opt.target);
    }
    edges.set(label, targets);
  }
  return edges;
}

function reachableFrom(entry: string, edges: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  if (!edges.has(entry)) return seen;
  const stack = [entry];
  while (stack.length) {
    const l = stack.pop() as string;
    if (seen.has(l)) continue;
    seen.add(l);
    for (const t of edges.get(l) ?? []) {
      if (!seen.has(t) && edges.has(t)) stack.push(t);
    }
  }
  return seen;
}

/** say/chapter/wait/choice — the node kinds that block for input at runtime (see runtime.ts). */
function hasProgress(nodes: StoryNode[]): boolean {
  return nodes.some((n) => n.kind === 'say' || n.kind === 'chapter' || n.kind === 'wait' || n.kind === 'choice');
}

/**
 * True when some cycle among reachable, progress-free labels exists — the
 * runtime would spin through jump/set/staging nodes forever without ever
 * pausing for input, tripping `Runtime.STEP_CAP`. 3-color DFS restricted to
 * the "silent" (no say/chapter/wait/choice) reachable subgraph.
 */
function hasSilentCycle(reachable: Set<string>, parsed: ParsedStory, edges: Map<string, string[]>): boolean {
  const silent = new Set([...reachable].filter((l) => !hasProgress(parsed.labels[l] ?? [])));
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const l of silent) color.set(l, WHITE);
  let found = false;
  const stack: Array<{ node: string; iter: number }> = [];

  const visit = (start: string): void => {
    stack.push({ node: start, iter: 0 });
    color.set(start, GRAY);
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const outs = edges.get(frame.node) ?? [];
      let advanced = false;
      while (frame.iter < outs.length) {
        const v = outs[frame.iter++];
        if (!silent.has(v)) continue;
        const c = color.get(v);
        if (c === GRAY) {
          found = true;
          return;
        }
        if (c === WHITE) {
          color.set(v, GRAY);
          stack.push({ node: v, iter: 0 });
          advanced = true;
          break;
        }
      }
      if (!advanced && frame.iter >= outs.length) {
        color.set(frame.node, BLACK);
        stack.pop();
      }
    }
  };

  for (const l of silent) {
    if (found) break;
    if (color.get(l) === WHITE) visit(l);
  }
  return found;
}

/** ≥2 consecutive jump nodes in one label, ≥1 guarded, reaching END or an ending label. */
function hasGuardedChainToEnding(parsed: ParsedStory, endingLabels: Set<string>): boolean {
  for (const label of parsed.order) {
    const nodes = parsed.labels[label] ?? [];
    let runStart = -1;
    for (let i = 0; i <= nodes.length; i++) {
      const isJump = i < nodes.length && nodes[i].kind === 'jump';
      if (isJump) {
        if (runStart === -1) runStart = i;
        continue;
      }
      if (runStart !== -1) {
        const run = nodes.slice(runStart, i).filter((n): n is Extract<StoryNode, { kind: 'jump' }> => n.kind === 'jump');
        if (run.length >= 2) {
          const anyGuarded = run.some((j) => !!j.guard);
          const reachesEnding = run.some((j) => j.target === 'END' || endingLabels.has(j.target));
          if (anyGuarded && reachesEnding) return true;
        }
        runStart = -1;
      }
    }
  }
  return false;
}

/* ─────────────────────────────  auto-repairs  ───────────────────────────── */

const KNOWN_MANIFEST_KEYS = new Set([
  'id',
  'title',
  'subtitle',
  'author',
  'synopsis',
  'entry',
  'narrator',
  'cover',
  'credits',
  'artStyle',
  'theme',
  'characters',
  'backgrounds',
  'cg',
  'music',
  'sfx',
  'ambience',
  'vars',
]);

/**
 * Mutates the working manifest clone in place, applying every unambiguous
 * repair from §8.2's closing paragraph, and returns the warn-severity issues
 * each one produced (empty when nothing needed touching). Order matches the
 * doc: these run BEFORE the fatal checks below, so a successful repair means
 * its corresponding rule never raises fatal at all.
 */
function applyAutoRepairs(manifest: Record<string, unknown>): Issue[] {
  const issues: Issue[] = [];

  const dropped: string[] = [];
  for (const k of Object.keys(manifest)) {
    if (!KNOWN_MANIFEST_KEYS.has(k)) {
      delete manifest[k];
      dropped.push(k);
    }
  }

  // id
  const idRes = resolveId(manifest.id, manifest.title);
  if (idRes.id) {
    if (idRes.changed) issues.push(mk('ID_INVALID', 'warn', `id auto-repaired to "${idRes.id}"`));
    manifest.id = idRes.id;
  }
  // (When idRes.id is null, id stays as authored — the fatal ID_INVALID check below reports it.)

  // artStyle suffix
  const artStyle = typeof manifest.artStyle === 'string' ? manifest.artStyle : '';
  if (!endsWithSuffixCI(artStyle, ARTSTYLE_SUFFIX_TEXT) || artStyle.trim().length < 40) {
    manifest.artStyle = artStyle.trim().length ? `${artStyle.trim()} ${ARTSTYLE_SUFFIX_TEXT}` : ARTSTYLE_SUFFIX_TEXT;
    issues.push(mk('ARTSTYLE_SUFFIX', 'warn', 'artStyle was missing/too short or missing its required suffix; the suffix was appended.'));
  }

  // theme range clamps
  const theme = asRecord(manifest.theme);
  const clampNotes: string[] = [];
  clampField(theme, 'bloom', 0, 2, clampNotes, 'theme.bloom');
  clampField(theme, 'vignette', 0, 1, clampNotes, 'theme.vignette');
  clampField(theme, 'grain', 0, 1, clampNotes, 'theme.grain');
  const grade = asRecord(theme.grade);
  clampField(grade, 'splitTone', 0, 1, clampNotes, 'theme.grade.splitTone');
  clampField(grade, 'contrast', 0.9, 1.2, clampNotes, 'theme.grade.contrast');
  clampField(grade, 'saturation', 0.7, 1.2, clampNotes, 'theme.grade.saturation');
  if (Object.keys(theme.grade ?? {}).length || Object.keys(grade).length) theme.grade = grade;
  manifest.theme = theme;
  if (clampNotes.length) issues.push(mk('THEME_RANGE', 'warn', `Clamped out-of-range theme value(s): ${clampNotes.join(', ')}`));

  // credits: default when absent, otherwise normalize shape (rule 34 is always a warn, never fatal)
  if (!Array.isArray(manifest.credits)) {
    const title = typeof manifest.title === 'string' && manifest.title.trim() ? manifest.title.trim() : 'Untitled';
    manifest.credits = [title, '', 'Written by Lamplighter', 'Made with Lamplighter'];
    issues.push(mk('CREDITS_SHAPE', 'warn', 'credits was missing; defaulted.'));
  } else {
    const arr = manifest.credits as unknown[];
    const allStrings = arr.every((x) => typeof x === 'string');
    if (!allStrings || arr.length > 24) {
      manifest.credits = (allStrings ? arr : arr.filter((x) => typeof x === 'string')).slice(0, 24);
      issues.push(mk('CREDITS_SHAPE', 'warn', 'credits had non-string entries or more than 24; normalized.'));
    }
  }

  // Defaults with no dedicated rule of their own (optional fields the rest of the
  // engine already falls back on at read time — runtime.ts's `?? def?.home`,
  // registry.ts's `def.parallax ?? 0.04`). Writing them explicitly just makes
  // the generated manifest self-documenting; folded into one issue so
  // generation.json/warnings[] isn't spammed with one line per field.
  const normalized: string[] = [];
  if (typeof manifest.author !== 'string' || !manifest.author.trim()) {
    manifest.author = 'Lamplighter';
    normalized.push('author');
  }
  const characters = asRecord(manifest.characters);
  for (const [charKey, rawDef] of Object.entries(characters)) {
    const def = asRecord(rawDef);
    if (typeof def.home !== 'string') {
      def.home = 'center';
      normalized.push(`characters.${charKey}.home`);
    }
    if (typeof def.scale !== 'number') {
      def.scale = 1;
      normalized.push(`characters.${charKey}.scale`);
    }
    const poses = asRecord(def.poses);
    if (typeof def.defaultPose !== 'string' || !(def.defaultPose in poses)) {
      const firstPose = Object.keys(poses)[0];
      if (firstPose) {
        def.defaultPose = firstPose;
        normalized.push(`characters.${charKey}.defaultPose`);
      }
    }
    def.poses = poses;
    characters[charKey] = def;
  }
  manifest.characters = characters;

  const backgrounds = asRecord(manifest.backgrounds);
  for (const [bgId, rawDef] of Object.entries(backgrounds)) {
    const def = asRecord(rawDef);
    if (typeof def.parallax !== 'number') {
      def.parallax = 0.05;
      normalized.push(`backgrounds.${bgId}.parallax`);
    }
    if (typeof def.focus !== 'number') {
      def.focus = 0.5;
      normalized.push(`backgrounds.${bgId}.focus`);
    }
    backgrounds[bgId] = def;
  }
  manifest.backgrounds = backgrounds;

  // Attach the remaining containers so every later rule can rely on real objects.
  manifest.cg = asRecord(manifest.cg);
  manifest.music = asRecord(manifest.music);
  manifest.ambience = asRecord(manifest.ambience);
  manifest.sfx = asRecord(manifest.sfx);
  manifest.vars = asRecord(manifest.vars);

  if (dropped.length || normalized.length) {
    const parts: string[] = [];
    if (dropped.length) parts.push(`dropped unknown key(s) ${dropped.join(', ')}`);
    if (normalized.length) parts.push(`defaulted ${normalized.join(', ')}`);
    // No dedicated rule covers "unknown manifest key" or "optional field defaulted" —
    // ENVELOPE_SHAPE is the closest fit (both are about the manifest's own shape)
    // and severity stays 'warn', so this never blocks validation.
    issues.push(mk('ENVELOPE_SHAPE', 'warn', `Normalized manifest: ${parts.join('; ')}.`));
  }

  return issues;
}

/* ─────────────────────────────  the entry point  ───────────────────────────── */

export function validateEnvelope(raw: unknown, profile: LengthProfile): ValidationResult {
  const issues: Issue[] = [];

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    issues.push(mk('ENVELOPE_SHAPE', 'fatal', 'Top-level value must be a JSON object with "manifest" and "script".'));
    return { ok: false, issues, stats: ZERO_STATS };
  }
  const obj = raw as Record<string, unknown>;
  const extraKeys = Object.keys(obj).filter((k) => k !== 'manifest' && k !== 'script');
  if (extraKeys.length) {
    issues.push(mk('ENVELOPE_SHAPE', 'fatal', `Unexpected top-level key(s): ${extraKeys.join(', ')}. Only "manifest" and "script" are allowed.`));
  }
  const manifestOk = typeof obj.manifest === 'object' && obj.manifest !== null && !Array.isArray(obj.manifest);
  if (!manifestOk) issues.push(mk('ENVELOPE_SHAPE', 'fatal', '"manifest" must be an object.'));
  const scriptOk = typeof obj.script === 'string' && obj.script.trim().length > 0;
  if (!scriptOk) issues.push(mk('ENVELOPE_SHAPE', 'fatal', '"script" must be a non-empty string.'));
  if (!manifestOk || !scriptOk) return { ok: false, issues, stats: ZERO_STATS };

  // Working copy — validate never mutates the caller's object.
  const manifest = deepClone(obj.manifest as Record<string, unknown>);
  const script = obj.script as string;

  issues.push(...applyAutoRepairs(manifest));

  // ---- 2: ID_INVALID (fatal path only — the repairable path already ran above) ----
  if (typeof manifest.id !== 'string' || !isValidId(manifest.id)) {
    issues.push(mk('ID_INVALID', 'fatal', 'manifest.id is missing/invalid and no usable title exists to derive one from.'));
  }

  // ---- 3: TITLE_INVALID ----
  const title = manifest.title;
  if (typeof title !== 'string' || title.length < 1 || title.length > 48) {
    issues.push(
      mk('TITLE_INVALID', 'fatal', `manifest.title must be a 1-48 character string (got ${typeof title === 'string' ? `${title.length} chars` : typeof title}).`),
    );
  }

  // ---- 4: THEME_COLOR ----
  const theme = asRecord(manifest.theme);
  for (const key of ['key', 'accent', 'ink', 'paper'] as const) {
    const v = theme[key];
    if (typeof v !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(v)) {
      issues.push(mk('THEME_COLOR', 'fatal', `theme.${key} must be a "#rrggbb" hex color.`, { at: `theme.${key}` }));
    }
  }

  // ---- 6: PARSE_WARNING (+ parse once, reused by every AST rule below) ----
  const parsed = parse(script);
  for (const w of parsed.warnings) issues.push(mk('PARSE_WARNING', 'fatal', w.message, { line: w.line }));

  const labelSet = new Set(parsed.order);
  const characters = asRecord(manifest.characters);
  const backgrounds = asRecord(manifest.backgrounds);
  const cgMap = asRecord(manifest.cg);
  const musicMap = asRecord(manifest.music);
  const ambienceMap = asRecord(manifest.ambience);
  const sfxMap = asRecord(manifest.sfx);
  const varsMap = asRecord(manifest.vars);

  // ---- 7: LABELS_COUNT ----
  if (parsed.order.length < profile.labelsMin || parsed.order.length > profile.labelsMax) {
    issues.push(mk('LABELS_COUNT', 'fatal', `${parsed.order.length} labels; the ${profile.id} profile wants ${profile.labelsMin}-${profile.labelsMax}.`));
  }

  // ---- 8: ENTRY_MISSING ----
  const declaredEntry = typeof manifest.entry === 'string' ? manifest.entry : '';
  let effectiveEntry = '';
  if (declaredEntry && labelSet.has(declaredEntry)) {
    effectiveEntry = declaredEntry;
  } else if (parsed.entry && labelSet.has(parsed.entry)) {
    effectiveEntry = parsed.entry;
    manifest.entry = parsed.entry;
    issues.push(
      mk(
        'ENTRY_MISSING',
        'warn',
        `manifest.entry ("${declaredEntry || '(missing)'}") is not a declared label; fell back to the script's first label "${parsed.entry}".`,
      ),
    );
  } else {
    issues.push(mk('ENTRY_MISSING', 'fatal', 'manifest.entry is missing/invalid and the script declares no usable first label either.'));
  }

  const edges = buildEdges(parsed);
  const reachable = effectiveEntry ? reachableFrom(effectiveEntry, edges) : new Set<string>();

  // ---- 9: TARGET_MISSING ----
  for (const { label, node } of allNodes(parsed)) {
    if (node.kind === 'jump' && node.target !== 'END' && !labelSet.has(node.target)) {
      issues.push(mk('TARGET_MISSING', 'fatal', `jump to "${node.target}" from label "${label}" — no such label.`));
    }
    if (node.kind === 'choice') {
      for (const opt of node.options) {
        if (opt.target !== 'END' && !labelSet.has(opt.target)) {
          issues.push(mk('TARGET_MISSING', 'fatal', `choice "${opt.text}" in label "${label}" targets "${opt.target}" — no such label.`));
        }
      }
    }
  }

  // ---- 10: LABEL_ORPHAN ----
  if (effectiveEntry) {
    for (const label of parsed.order) {
      if (!reachable.has(label)) {
        issues.push(mk('LABEL_ORPHAN', 'fatal', `label "${label}" is declared but not reachable from entry ("${effectiveEntry}").`));
      }
    }
  }

  // ---- 11-16: declarations ----
  for (const { label, node } of allNodes(parsed)) {
    switch (node.kind) {
      case 'say':
        if (node.speaker !== null && !(node.speaker in characters)) {
          issues.push(mk('SPEAKER_UNDECLARED', 'fatal', `speaker "${node.speaker}" is not in manifest.characters (label "${label}").`));
        }
        break;
      case 'enter':
        if (!(node.char in characters)) {
          issues.push(mk('CHAR_UNDECLARED', 'fatal', `character "${node.char}" (@enter) is not declared (label "${label}").`));
        } else if (node.pose && !(node.pose in asRecord(asRecord(characters[node.char]).poses))) {
          issues.push(mk('POSE_UNDECLARED', 'fatal', `pose "${node.pose}" is not declared on character "${node.char}" (label "${label}").`));
        }
        break;
      case 'exit':
        if (!(node.char in characters)) {
          issues.push(mk('CHAR_UNDECLARED', 'fatal', `character "${node.char}" (@exit) is not declared (label "${label}").`));
        }
        break;
      case 'pose':
        if (!(node.char in characters)) {
          issues.push(mk('CHAR_UNDECLARED', 'fatal', `character "${node.char}" (@pose) is not declared (label "${label}").`));
        } else if (!(node.pose in asRecord(asRecord(characters[node.char]).poses))) {
          issues.push(mk('POSE_UNDECLARED', 'fatal', `pose "${node.pose}" is not declared on character "${node.char}" (label "${label}").`));
        }
        break;
      case 'move':
        if (!(node.char in characters)) {
          issues.push(mk('CHAR_UNDECLARED', 'fatal', `character "${node.char}" (@move) is not declared (label "${label}").`));
        }
        break;
      case 'bg':
        if (!(node.id in backgrounds)) {
          issues.push(mk('BG_UNDECLARED', 'fatal', `background "${node.id}" is not declared (label "${label}").`));
        }
        break;
      case 'music':
        if (node.id !== null && !(node.id in musicMap)) {
          issues.push(mk('AUDIO_UNDECLARED', 'fatal', `music id "${node.id}" is not in manifest.music (label "${label}").`));
        }
        break;
      case 'ambience':
        if (node.id !== null && !(node.id in ambienceMap)) {
          issues.push(mk('AUDIO_UNDECLARED', 'fatal', `ambience id "${node.id}" is not in manifest.ambience (label "${label}").`));
        }
        break;
      case 'sfx':
        if (!(node.id in sfxMap)) {
          issues.push(mk('AUDIO_UNDECLARED', 'fatal', `sfx id "${node.id}" is not in manifest.sfx (label "${label}").`));
        }
        break;
      default:
        break;
    }
  }
  // defaultPose must also exist on its own character.
  for (const [charKey, rawDef] of Object.entries(characters)) {
    const def = asRecord(rawDef);
    const poses = asRecord(def.poses);
    if (typeof def.defaultPose === 'string' && !(def.defaultPose in poses)) {
      issues.push(mk('POSE_UNDECLARED', 'fatal', `characters.${charKey}.defaultPose "${def.defaultPose}" does not exist on that character.`, { at: `characters.${charKey}.defaultPose` }));
    }
  }

  // ---- 16: SYNTH_UNKNOWN ----
  for (const [group, map] of [
    ['music', musicMap],
    ['ambience', ambienceMap],
    ['sfx', sfxMap],
  ] as const) {
    for (const [id, rawDef] of Object.entries(map)) {
      const synth = asRecord(rawDef).synth;
      if (synth !== undefined && !ALLOWED_SYNTHS.has(String(synth))) {
        issues.push(mk('SYNTH_UNKNOWN', 'fatal', `${group}.${id}.synth "${String(synth)}" is not one of: pad, drone, rain, hum, wind, chime, click, tone.`, { at: `${group}.${id}.synth` }));
      }
    }
  }

  // ---- 17: FILE_KEY_PRESENT ----
  const forbiddenHits: string[] = [];
  findForbiddenKeys(manifest, '', forbiddenHits);
  for (const hit of forbiddenHits) {
    issues.push(mk('FILE_KEY_PRESENT', 'fatal', `manifest.${hit} is not allowed — generated manifests have no binary asset references.`, { at: hit }));
  }

  // ---- gather choice/set/guard facts once ----
  let menus = 0;
  let offscriptOptions = 0;
  let sets = 0;
  let guarded = 0;
  const guardTexts: string[] = [];
  const setTargets = new Set<string>();
  for (const { node } of allNodes(parsed)) {
    if (node.kind === 'choice') {
      menus++;
      for (const opt of node.options) {
        if (opt.kind === 'offscript') offscriptOptions++;
        if (opt.guard) {
          guarded++;
          guardTexts.push(opt.guard);
        }
      }
    }
    if (node.kind === 'set') {
      sets++;
      setTargets.add(node.target);
    }
    if (node.kind === 'say' && node.guard) {
      guarded++;
      guardTexts.push(node.guard);
    }
    if (node.kind === 'jump' && node.guard) {
      guarded++;
      guardTexts.push(node.guard);
    }
  }

  // ---- 18: MENUS_COUNT ----
  if (menus < profile.menusMin || menus > profile.menusMax) {
    issues.push(mk('MENUS_COUNT', 'fatal', `${menus} choice menus; the ${profile.id} profile wants ${profile.menusMin}-${profile.menusMax}.`));
  }
  // ---- 19: OFFSCRIPT_TOO_FEW ----
  if (offscriptOptions < 2) {
    issues.push(mk('OFFSCRIPT_TOO_FEW', 'fatal', `only ${offscriptOptions} off-script (">!") option(s); at least 2 are required.`));
  }
  // ---- 20: SETS_TOO_FEW ----
  if (sets < STATE_SETS_MIN || setTargets.size < STATE_SET_VARS_MIN) {
    issues.push(
      mk(
        'SETS_TOO_FEW',
        'fatal',
        `${sets} @set node(s) over ${setTargets.size} var(s); at least ${STATE_SETS_MIN} @set nodes over at least ${STATE_SET_VARS_MIN} vars are required.`,
      ),
    );
  }
  // ---- 21: GUARDS_TOO_FEW ----
  if (guarded < STATE_GUARDS_MIN) {
    issues.push(mk('GUARDS_TOO_FEW', 'fatal', `only ${guarded} guarded node(s) (say/choice-option/jump); at least ${STATE_GUARDS_MIN} are required.`));
  }

  // ---- 22: GUARD_UNKNOWN_VAR ----
  const knownVars = new Set([...Object.keys(varsMap), ...setTargets]);
  const unknownVars = new Set<string>();
  for (const g of guardTexts) {
    const ids = g.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
    for (const id of ids) {
      if (id === 'true' || id === 'false') continue;
      if (!knownVars.has(id)) unknownVars.add(id);
    }
  }
  for (const id of unknownVars) {
    issues.push(mk('GUARD_UNKNOWN_VAR', 'fatal', `guard identifier "${id}" is not a key of manifest.vars and is never set with @set — it silently evaluates to 0.`));
  }

  // ---- 23: GUARD_UNPARSEABLE ----
  for (const g of guardTexts) {
    try {
      evalGuard(g, {});
    } catch {
      issues.push(mk('GUARD_UNPARSEABLE', 'fatal', `guard "${g}" could not be evaluated.`));
    }
  }

  // ---- 24: ENDINGS_TOO_FEW / 25: ENDING_UNGUARDED ----
  const allEndingLabels = new Set(parsed.order.filter((l) => (parsed.labels[l] ?? []).some((n) => n.kind === 'jump' && n.target === 'END')));
  const reachableEndings = new Set([...allEndingLabels].filter((l) => reachable.has(l)));
  if (reachableEndings.size < profile.endingsMin) {
    issues.push(mk('ENDINGS_TOO_FEW', 'fatal', `only ${reachableEndings.size} reachable ending(s); at least ${profile.endingsMin} are required.`));
  }
  if (reachableEndings.size > 0 && !hasGuardedChainToEnding(parsed, allEndingLabels)) {
    issues.push(mk('ENDING_UNGUARDED', 'warn', 'No guarded jump chain (>=2 consecutive jumps, >=1 guarded) reaches an ending — every ending looks reachable the same way regardless of state.'));
  }

  // ---- 26: CYCLE_NO_PROGRESS ----
  if (effectiveEntry && hasSilentCycle(reachable, parsed, edges)) {
    issues.push(mk('CYCLE_NO_PROGRESS', 'fatal', 'A reachable cycle consists solely of jump/set/staging nodes — the runtime would spin without ever pausing for input.'));
  }

  // ---- 27: LINES_RANGE ----
  const lineCount = lex(script).length;
  if (lineCount < profile.linesMin || lineCount > profile.linesMax) {
    issues.push(mk('LINES_RANGE', 'fatal', `${lineCount} non-blank, non-comment script lines; the ${profile.id} profile wants ${profile.linesMin}-${profile.linesMax}.`));
  }

  // ---- 28: ASSET_BUDGET ----
  const backgroundsCount = Object.keys(backgrounds).length;
  const charactersCount = Object.keys(characters).length;
  let posesTotal = 0;
  for (const rawDef of Object.values(characters)) posesTotal += Object.keys(asRecord(asRecord(rawDef).poses)).length;
  const cgCount = Object.keys(cgMap).length;
  const images = backgroundsCount + posesTotal + cgCount;

  if (backgroundsCount < profile.backgroundsMin || backgroundsCount > profile.backgroundsMax) {
    issues.push(mk('ASSET_BUDGET', 'fatal', `${backgroundsCount} backgrounds; the ${profile.id} profile wants ${profile.backgroundsMin}-${profile.backgroundsMax}.`));
  }
  if (charactersCount < profile.charactersMin || charactersCount > profile.charactersMax) {
    issues.push(mk('ASSET_BUDGET', 'fatal', `${charactersCount} characters; the ${profile.id} profile wants ${profile.charactersMin}-${profile.charactersMax}.`));
  }
  for (const [charKey, rawDef] of Object.entries(characters)) {
    const n = Object.keys(asRecord(asRecord(rawDef).poses)).length;
    if (n < profile.posesPerCharMin || n > profile.posesPerCharMax) {
      issues.push(mk('ASSET_BUDGET', 'fatal', `character "${charKey}" has ${n} poses; the ${profile.id} profile wants ${profile.posesPerCharMin}-${profile.posesPerCharMax} per character.`));
    }
  }
  if (images > profile.imageBudget) {
    issues.push(mk('ASSET_BUDGET', 'fatal', `${images} total generated images (backgrounds+poses+cg) exceeds the ${profile.id} budget of ${profile.imageBudget}.`));
  }

  // ---- 29: COVER_MISSING ----
  const coverKey = manifest.cover;
  if (typeof coverKey !== 'string' || !(coverKey in cgMap)) {
    issues.push(mk('COVER_MISSING', 'fatal', `manifest.cover ("${String(coverKey)}") is not a key in manifest.cg.`));
  }

  // ---- 30: PROMPT_EMPTY ----
  for (const [bgId, rawDef] of Object.entries(backgrounds)) {
    const p = asRecord(rawDef).prompt;
    if (typeof p !== 'string' || p.trim().length < 24) {
      issues.push(mk('PROMPT_EMPTY', 'fatal', `backgrounds.${bgId}.prompt is missing or shorter than 24 characters.`, { at: `backgrounds.${bgId}.prompt` }));
    }
  }
  for (const [charKey, rawDef] of Object.entries(characters)) {
    const poses = asRecord(asRecord(rawDef).poses);
    for (const [pose, rawPose] of Object.entries(poses)) {
      const p = asRecord(rawPose).prompt;
      if (typeof p !== 'string' || p.trim().length < 24) {
        issues.push(mk('PROMPT_EMPTY', 'fatal', `characters.${charKey}.poses.${pose}.prompt is missing or shorter than 24 characters.`, { at: `characters.${charKey}.poses.${pose}.prompt` }));
      }
    }
  }
  for (const [cgId, rawDef] of Object.entries(cgMap)) {
    const p = asRecord(rawDef).prompt;
    if (typeof p !== 'string' || p.trim().length < 24) {
      issues.push(mk('PROMPT_EMPTY', 'fatal', `cg.${cgId}.prompt is missing or shorter than 24 characters.`, { at: `cg.${cgId}.prompt` }));
    }
  }

  // ---- 32: TEXT_HYGIENE (the one rule with real line numbers, scanned from raw text) ----
  const rawLines = script.split(/\r?\n/);
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const lineNo = i + 1;
    if (line.length > 320) {
      issues.push(mk('TEXT_HYGIENE', 'fatal', `line is ${line.length} characters, over the 320 limit.`, { line: lineNo }));
    }
    if (line.includes('\t')) {
      issues.push(mk('TEXT_HYGIENE', 'fatal', 'line contains a tab character.', { line: lineNo }));
    }
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      issues.push(mk('TEXT_HYGIENE', 'fatal', 'leftover markdown code fence inside the script.', { line: lineNo }));
    }
    if (trimmed.startsWith('>')) {
      const quoteCount = (trimmed.match(/"/g) ?? []).length;
      if (quoteCount % 2 !== 0) {
        issues.push(mk('TEXT_HYGIENE', 'fatal', 'unbalanced " in a choice line.', { line: lineNo }));
      }
    }
  }

  // ---- 33: VARS_COUNT ----
  const varEntries = Object.entries(varsMap);
  if (varEntries.length < 2 || varEntries.length > 5) {
    issues.push(mk('VARS_COUNT', 'fatal', `manifest.vars has ${varEntries.length} entries; must be 2-5.`));
  }
  for (const [k, v] of varEntries) {
    if (typeof v !== 'number' && typeof v !== 'boolean') {
      issues.push(mk('VARS_COUNT', 'fatal', `manifest.vars.${k} must be a number or boolean.`, { at: `vars.${k}` }));
    }
  }

  const stats: ValidationResult['stats'] = {
    labels: parsed.order.length,
    lines: lineCount,
    menus,
    offscriptOptions,
    sets,
    guards: guarded,
    endings: reachableEndings.size,
    vars: varEntries.length,
    backgrounds: backgroundsCount,
    characters: charactersCount,
    poses: posesTotal,
    cg: cgCount,
    images,
  };

  const ok = !issues.some((i) => i.severity === 'fatal');
  return {
    ok,
    issues,
    parsed: ok ? parsed : undefined,
    envelope: ok ? { manifest: manifest as unknown as StoryManifest, script } : undefined,
    stats,
  };
}
