/**
 * Lamplighter — shared type & interface contract.
 *
 * This file is the single source of truth that the engine, stage, ui, and audio
 * subsystems all code against. Subsystems communicate through the typed event bus
 * (see ./events.ts) plus the small set of direct interfaces declared at the bottom.
 * Nothing here imports three, howler, or the DOM — it stays pure and portable.
 */

/* ─────────────────────────────  PQScript AST  ───────────────────────────── */

/** A raw guard expression, e.g. "trust>=3" or "seen_building && coherence<2". */
export type Guard = string;

export type CameraMove = 'push' | 'pull' | 'pan-left' | 'pan-right' | 'still';
export type CharSide = 'left' | 'center' | 'right';
export type WeatherKind = 'none' | 'rain' | 'snow' | 'dust' | 'fog';
export type FxKind = 'flash' | 'shake' | 'dissolve' | 'glitch';
export type ChoiceKind = 'suggested' | 'offscript' | 'neutral';
export type SetOp = '=' | '+' | '-' | '+=' | '-=';

export interface SayNode {
  kind: 'say';
  /** Character key (into manifest.characters) or null for narration. */
  speaker: string | null;
  text: string;
  guard?: Guard;
}
export interface BgNode {
  kind: 'bg';
  id: string;
  mood?: string;
  /** Optional named transition into this background (default chosen by stage). */
  transition?: string;
}
export interface EnterNode {
  kind: 'enter';
  char: string;
  from?: CharSide;
  pose?: string;
}
export interface ExitNode {
  kind: 'exit';
  char: string;
  to?: CharSide;
}
export interface PoseNode {
  kind: 'pose';
  char: string;
  pose: string;
}
export interface MoveNode {
  kind: 'move';
  char: string;
  to: CharSide;
}
export interface WeatherNode {
  kind: 'weather';
  weather: WeatherKind;
  intensity?: number;
}
export interface CameraNode {
  kind: 'camera';
  move: CameraMove;
  zoom?: number;
  duration?: number;
}
export interface MusicNode {
  kind: 'music';
  /** null => stop current music. */
  id: string | null;
  fade?: number;
}
export interface SfxNode {
  kind: 'sfx';
  id: string;
}
export interface AmbienceNode {
  kind: 'ambience';
  id: string | null;
  fade?: number;
}
export interface WaitNode {
  kind: 'wait';
  seconds: number;
}
export interface FxNode {
  kind: 'fx';
  effect: FxKind;
  params?: Record<string, number>;
}
export interface SetNode {
  kind: 'set';
  target: string;
  op: SetOp;
  value: number | boolean;
}
export interface ChapterNode {
  kind: 'chapter';
  title: string;
  subtitle?: string;
}
export interface ChoiceOption {
  text: string;
  target: string;
  kind: ChoiceKind;
  guard?: Guard;
}
export interface ChoiceNode {
  kind: 'choice';
  options: ChoiceOption[];
}
export interface JumpNode {
  kind: 'jump';
  /** Target label, or the special value "END". */
  target: string;
  guard?: Guard;
}

export type StoryNode =
  | SayNode
  | BgNode
  | EnterNode
  | ExitNode
  | PoseNode
  | MoveNode
  | WeatherNode
  | CameraNode
  | MusicNode
  | SfxNode
  | AmbienceNode
  | WaitNode
  | FxNode
  | SetNode
  | ChapterNode
  | ChoiceNode
  | JumpNode;

export interface ParseWarning {
  line: number;
  message: string;
}

/** Output of parse(): labels in order + a map from label -> statement list. */
export interface ParsedStory {
  /** Ordered list of label names as they appear in the source. */
  order: string[];
  labels: Record<string, StoryNode[]>;
  warnings: ParseWarning[];
  /** Label the story starts at if the manifest does not override it. */
  entry: string;
}

/* ─────────────────────────────  Manifest  ───────────────────────────── */

export interface ThemeGrade {
  /** Additive lift in linear space, per-channel [-0.2..0.2]. */
  lift?: [number, number, number];
  /** Gamma per-channel, ~[0.8..1.2]. */
  gamma?: [number, number, number];
  /** Multiplicative gain per-channel, ~[0.8..1.2]. */
  gain?: [number, number, number];
  /** Overall teal↔orange split-tone amount 0..1. */
  splitTone?: number;
  /** Contrast multiplier around 0.5, ~[0.9..1.2]. */
  contrast?: number;
  /** Saturation multiplier, ~[0.7..1.2]. */
  saturation?: number;
}

export interface StoryTheme {
  /** Primary UI accent / character-neutral highlight. */
  key: string;
  /** Secondary warm accent. */
  accent: string;
  /** Foreground text ink. */
  ink: string;
  /** Panel/paper base (dark). */
  paper: string;
  grade?: ThemeGrade;
  /** Optional bloom strength override 0..2. */
  bloom?: number;
  /** Optional vignette strength override 0..1. */
  vignette?: number;
  /** Optional grain strength override 0..1. */
  grain?: number;
}

export interface CharacterPose {
  /** Generation prompt for this pose (used by tools/gen-assets). */
  prompt?: string;
  /** Optional explicit asset filename (relative to assets/characters). */
  file?: string;
}

export interface CharacterDef {
  name: string;
  /** Nameplate / accent color. */
  color: string;
  /** Short descriptor used to keep art cohesive across poses. */
  description?: string;
  poses: Record<string, CharacterPose>;
  /** Default pose when @enter has no pose. */
  defaultPose?: string;
  /** Screen anchor when entering without an explicit side. */
  home?: CharSide;
  /** Base scale multiplier for this character's sprite (default 1). */
  scale?: number;
}

export interface BackgroundDef {
  prompt?: string;
  /** Optional explicit filename or list of layer filenames (far→near). */
  file?: string;
  files?: string[];
  /** Parallax strength 0..0.2 (how much layers separate). */
  parallax?: number;
  /** Focal depth hint for DoF 0..1. */
  focus?: number;
}

export interface CgDef {
  prompt?: string;
  file?: string;
}

export interface AudioDef {
  file?: string;
  loop?: boolean;
  /** Base volume 0..1. */
  volume?: number;
  /** If no file is present, an optional procedural synth preset name. */
  synth?: string;
}

export interface StoryManifest {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  synopsis?: string;
  /** Starting label; falls back to ParsedStory.entry then first label. */
  entry?: string;
  credits?: string[];
  /** Cover art key (into cg) shown on the title/story-picker. */
  cover?: string;
  /** Art-director style preamble prepended to every asset prompt for cohesion. */
  artStyle?: string;
  /**
   * Nameplate shown on narration lines (lines with no speaker) — the role the
   * player is reading as. Omitted ⇒ narration runs without a plate.
   */
  narrator?: string;
  theme: StoryTheme;
  characters: Record<string, CharacterDef>;
  backgrounds: Record<string, BackgroundDef>;
  cg?: Record<string, CgDef>;
  music?: Record<string, AudioDef>;
  sfx?: Record<string, AudioDef>;
  ambience?: Record<string, AudioDef>;
  /** Optional named variables with defaults (numbers or booleans). */
  vars?: Record<string, number | boolean>;
}

/* ─────────────────────────────  Resolved assets  ───────────────────────────── */

/** A background resolved to concrete texture URLs (far→near). */
export interface ResolvedBackground {
  id: string;
  layers: string[];
  parallax: number;
  focus: number;
}

/** Resolved, load-ready asset URLs for one story. */
export interface AssetTable {
  backgrounds: Record<string, ResolvedBackground>;
  /** characters[charKey][pose] = url */
  characters: Record<string, Record<string, string>>;
  cg: Record<string, string>;
  music: Record<string, { url?: string; def: AudioDef }>;
  sfx: Record<string, { url?: string; def: AudioDef }>;
  ambience: Record<string, { url?: string; def: AudioDef }>;
}

/** A story as discovered by the registry: manifest + parsed script + assets. */
export interface StoryBundle {
  manifest: StoryManifest;
  script: ParsedStory;
  assets: AssetTable;
}

/* ─────────────────────────────  Runtime state  ───────────────────────────── */

export interface GameState {
  storyId: string;
  /** Current label being executed. */
  label: string;
  /** Index of the next node within the label. */
  cursor: number;
  vars: Record<string, number | boolean>;
  history: HistoryEntry[];
  /** Labels the player has entered at least once. */
  seen: string[];
  /** ISO timestamp of last save. */
  savedAt?: string;
}

export interface HistoryEntry {
  speaker: string | null;
  /** Display name for the speaker at the time (resolved). */
  speakerName?: string;
  text: string;
  /** If this entry was a chosen reply, its kind. */
  choiceKind?: ChoiceKind;
}

export interface SaveSlotInfo {
  slot: number;
  state: GameState;
  /** PNG data URL captured from the stage at save time. */
  thumbnail?: string;
  savedAt: string;
  /** Human label for the moment (e.g. current chapter or speaker line). */
  label: string;
  storyId: string;
  storyTitle: string;
}

/* ─────────────────────────────  Settings  ───────────────────────────── */

export interface Settings {
  /** Characters per second for the typewriter (0 = instant). */
  textSpeed: number;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  /** Post-processing grain amount 0..1. */
  grain: number;
  /** Reduce/disable camera drift, shake, heavy motion. */
  reducedMotion: boolean;
  /** Enable bloom + DoF + grade (off = flat, for low-end). */
  cinematic: boolean;
  fullscreen: boolean;
  /** Auto-advance dialogue. */
  autoAdvance: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  textSpeed: 45,
  masterVolume: 0.9,
  musicVolume: 0.7,
  sfxVolume: 0.85,
  grain: 0.5,
  reducedMotion: false,
  cinematic: true,
  fullscreen: false,
  autoAdvance: false,
};

/* ─────────────────────────────  View models (runtime → UI)  ───────────────────────────── */

export interface CharacterView {
  key: string;
  name: string;
  color: string;
}

export interface ResolvedChoice {
  /** Jump target (also the id sent back on input:choose). */
  target: string;
  text: string;
  kind: ChoiceKind;
}

/* ─────────────────────────────  Event bus contract  ───────────────────────────── */

/**
 * The typed event map carried by the Emitter (see ./events.ts).
 * Runtime is the sole emitter of "scene:*"/"char:*"/"audio:*"/"ui:*"/"fx:*"/"camera:*"
 * /"weather:*"/"state:*". UI is the sole emitter of "input:*". Stage/UI/Audio subscribe.
 */
export interface EngineEventMap {
  // scene / background
  'scene:bg': { id: string; mood?: string; transition?: string };
  // characters
  'char:enter': { char: string; from: CharSide; pose?: string };
  'char:exit': { char: string; to: CharSide };
  'char:pose': { char: string; pose: string };
  'char:move': { char: string; to: CharSide };
  /** Highlight the speaking character; null = narration (dim all). */
  'char:speaking': { char: string | null };
  // atmosphere
  'weather:set': { weather: WeatherKind; intensity: number };
  'camera:move': { move: CameraMove; zoom: number; duration: number };
  'fx:play': { effect: FxKind; params: Record<string, number> };
  // audio
  'audio:music': { id: string | null; fade: number };
  'audio:sfx': { id: string };
  'audio:ambience': { id: string | null; fade: number };
  // narrative (→ UI)
  'ui:say': { speaker: CharacterView | null; text: string; auto: boolean };
  'ui:choices': { options: ResolvedChoice[] };
  'ui:chapter': { title: string; subtitle?: string };
  'ui:clear': Record<string, never>;
  'ui:end': { credits?: string[] };
  'wait:begin': { seconds: number };
  // state
  'state:changed': { state: GameState };
  'runtime:ready': { story: StoryManifest };
  // input (UI → runtime)
  'input:advance': Record<string, never>;
  'input:choose': { target: string };
  'input:skip': Record<string, never>;
  /** Fired by UI when a wait/animation should be cut short. */
  'input:continue': Record<string, never>;
}

export type EngineEventName = keyof EngineEventMap;
export type EngineEventHandler<K extends EngineEventName> = (payload: EngineEventMap[K]) => void;

/* ─────────────────────────────  Subsystem interfaces  ───────────────────────────── */

/** The typed emitter shared by all subsystems (implemented in ./events.ts). */
export interface IEmitter {
  on<K extends EngineEventName>(event: K, handler: EngineEventHandler<K>): () => void;
  once<K extends EngineEventName>(event: K, handler: EngineEventHandler<K>): () => void;
  off<K extends EngineEventName>(event: K, handler: EngineEventHandler<K>): void;
  emit<K extends EngineEventName>(event: K, payload: EngineEventMap[K]): void;
}

export interface IStage {
  /** Load & warm all textures for the story; resolves when ready to render. */
  loadStory(bundle: StoryBundle): Promise<void>;
  /** Begin the render loop. */
  start(): void;
  /** Pause the render loop (e.g. on title screen when desired). */
  stop(): void;
  applySettings(settings: Settings): void;
  /** Capture the current WebGL frame as a PNG data URL (for save thumbnails). */
  captureThumbnail(width?: number, height?: number): string;
  resize(): void;
  dispose(): void;
}

export interface IUILayer {
  /** Show the cinematic title screen with the discovered stories. */
  showTitle(stories: StoryManifest[]): void;
  hideTitle(): void;
  applyTheme(theme: StoryTheme): void;
  applySettings(settings: Settings): void;
  dispose(): void;
}

export interface IAudioManager {
  loadStory(bundle: StoryBundle): Promise<void>;
  applySettings(settings: Settings): void;
  /** Resume the AudioContext after a user gesture (autoplay policy). */
  unlock(): void;
  dispose(): void;
}

export interface IRuntime {
  /** Load a parsed story; optionally restore from a saved state. */
  load(bundle: StoryBundle, state?: GameState): void;
  /** Kick off execution from the current cursor. */
  start(): void;
  snapshot(): GameState;
  dispose(): void;
}

/**
 * The application controller the UI layer calls into for cross-subsystem actions
 * (title-screen navigation, save/load with stage thumbnails, settings). main.ts
 * implements this and passes it to the UILayer constructor as the 3rd argument.
 */
export interface AppHost {
  /** All discovered stories, for the title/story-picker. */
  stories(): StoryManifest[];
  /**
   * Resolved URL of a story's cover art (`manifest.cover` → `AssetTable.cg`), or
   * undefined when the story has no cover key or the art has not been generated
   * yet — callers fall back to a themed placeholder.
   */
  getCoverUrl(storyId: string): string | undefined;
  /**
   * Resolved URL of the plate the title screen runs full-bleed behind the menu —
   * the story's first declared background (its establishing environment), or
   * undefined when the story has no background art yet.
   */
  getBackdropUrl(storyId: string): string | undefined;
  startStory(storyId: string): void;
  /** Resume the rolling autosave, if any. */
  continueGame(): void;
  hasContinue(): boolean;
  saveToSlot(slot: number): void;
  loadFromSlot(slot: number): void;
  deleteSlot(slot: number): void;
  listSaves(): SaveSlotInfo[];
  applySettings(settings: Settings): void;
  getSettings(): Settings;
  returnToTitle(): void;
}
