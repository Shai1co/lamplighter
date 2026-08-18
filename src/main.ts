/**
 * Lamplighter — composition root.
 *
 * This is the ONLY module that knows about every subsystem at once. It wires the
 * five lanes together through a single shared Emitter (the bus) and implements the
 * AppHost the UI layer calls into for cross-subsystem lifecycle actions
 * (title-screen navigation, save/load with stage thumbnails, settings).
 *
 * Integration model: subsystems never call each other directly. The Runtime is the
 * sole emitter of scene:/char:/weather:/camera:/fx:/audio:/ui:/state: events; Stage,
 * UI, and Audio subscribe to the ones they care about; the UI is the sole emitter of
 * input:* events. main.ts only performs lifecycle: it constructs the subsystems,
 * loads stories, applies settings, and brokers save/load — never gameplay directives.
 */
import { Emitter } from './core/events';
import type {
  AppHost,
  GameState,
  SaveSlotInfo,
  Settings,
  StoryBundle,
  StoryManifest,
} from './core/types';
import { Runtime, SaveStore, SettingsStore, discoverStories } from './engine';
import { Stage } from './stage';
import { UILayer } from './ui/UILayer';
import { AudioManager } from './audio';
// Type-only — erased at emit; src/server/types.ts has no Node dependency of
// its own (see its doc comment), so this never pulls Node types into the
// browser bundle. See docs/superpowers/specs/2026-08-18-storygen-design.md §3.4.
import type { StorygenHealth } from './server/types';

/** Debounce interval for the rolling autosave triggered by state:changed. */
const AUTOSAVE_THROTTLE_MS = 1400;

/** GET /api/health's hard budget — boot must never wait longer than this for
 *  a server that may not even exist (a static dist/ deploy answers with an
 *  immediate connection refusal, not a hang, but a hung dev server should
 *  not be able to hold the title screen hostage either). */
const HEALTH_PROBE_TIMEOUT_MS = 2000;
/** The contract's major version this build understands (design doc §4.1). A
 *  minor bump is additive and safe to ignore; a major bump means the wire
 *  shapes may have changed underneath this client, so Create is hidden
 *  rather than rendered against a contract it was not built for. */
const SUPPORTED_API_MAJOR = '1';

/**
 * GET /api/health, probed once at boot. Resolves to `null` on ANY failure —
 * no server (a static `dist/`), a network error, a timeout, a non-JSON body,
 * or a major-version mismatch — which is exactly the signal AppHost.
 * storygenHealth() hands the UI: "no Create", nothing more specific. A
 * static deployment answering with an immediate connection refusal is not a
 * fault to log; see fetchRuntimeStories() in src/engine/registry.ts, which
 * makes the identical judgment call for the sibling `/api/stories` probe.
 */
async function probeHealth(): Promise<StorygenHealth | null> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(HEALTH_PROBE_TIMEOUT_MS) });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<StorygenHealth>;
    if (body.ok !== true || typeof body.api !== 'string') return null;
    if (body.api.split('.')[0] !== SUPPORTED_API_MAJOR) return null;
    return body as StorygenHealth;
  } catch {
    return null;
  }
}

/** sessionStorage, not localStorage: a reload keeps it, a new tab does not
 *  inherit somebody else's autostart, and it evaporates when the tab
 *  closes. See design doc §12.5. */
const AUTOSTART_KEY = 'pq:autostart';
/** A flag written and then survived by a crash, a rebuild and ten minutes of
 *  editing must not hijack a later boot. */
const AUTOSTART_MAX_AGE_MS = 120_000;

/** Persist the one-shot autostart flag and reload — the second half of
 *  AppHost.adoptStory(); see the host implementation below for why a reload
 *  rather than an in-place adopt. */
function writeAutostart(storyId: string): void {
  try {
    sessionStorage.setItem(AUTOSTART_KEY, JSON.stringify({ id: storyId, at: Date.now() }));
  } catch {
    /* private mode / storage disabled — the story is still on disk and in the picker */
  }
  location.reload();
}

/**
 * Consumed FIRST thing on the next boot, before anything else can throw.
 * Removed BEFORE it is read (one-shot): if the subsequent beginStory() then
 * throws, the NEXT reload lands on the title screen instead of looping into
 * the same crash — beginStory() already falls back to the title on failure,
 * this only makes that fallback reachable rather than merely likely.
 */
function takeAutostart(): string | null {
  try {
    const raw = sessionStorage.getItem(AUTOSTART_KEY);
    sessionStorage.removeItem(AUTOSTART_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { id?: unknown; at?: unknown };
    if (typeof v.id !== 'string') return null;
    if (typeof v.at !== 'number' || Date.now() - v.at > AUTOSTART_MAX_AGE_MS) return null;
    return v.id;
  } catch {
    return null;
  }
}

function requireEl<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`[pq] required element #${id} not found in index.html`);
  return node as T;
}

/** A short, human-readable label for a save slot, derived from the game state. */
function describeMoment(state: GameState, manifest: StoryManifest): string {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const entry = state.history[i];
    if (!entry?.text) continue;
    const who = entry.speakerName ? `${entry.speakerName}: ` : '';
    const text = entry.text.replace(/\s+/g, ' ').trim();
    const line = `${who}${text}`;
    return line.length > 84 ? `${line.slice(0, 83)}…` : line;
  }
  return manifest.subtitle ?? manifest.title;
}

async function boot(): Promise<void> {
  /* ── DOM handles ── */
  const canvas = requireEl<HTMLCanvasElement>('stage');
  const uiRoot = requireEl<HTMLElement>('ui');
  const bootSplash = document.getElementById('boot');

  /* ── Shared bus + persistence ── */
  const bus = new Emitter();
  const saveStore = new SaveStore();
  const settingsStore = new SettingsStore();
  let settings: Settings = settingsStore.load();

  /* ── Story discovery (auto-discovered from /stories, art-optional) and the
   *    storygen health probe, run together: both are local and both already
   *    carry their own timeout, so boot is never delayed by more than the
   *    slower of the two — 2s even with a hung dev server, and effectively
   *    instantly when there is no server at all (an immediate connection
   *    refusal). See design doc §12.5. ── */
  const [bundles, health] = await Promise.all([discoverStories(), probeHealth()]);
  const bundleById = new Map<string, StoryBundle>();
  for (const b of bundles) bundleById.set(b.manifest.id, b);
  const manifests = bundles.map((b) => b.manifest);

  /* ── Subsystems (all share the one bus) ── */
  const audio = new AudioManager(bus);
  const stage = new Stage(bus, canvas);
  const runtime = new Runtime(bus);

  /* ── Session state tracked by the host ── */
  let activeBundle: StoryBundle | null = null;
  let inStory = false;
  let starting = false;
  let audioUnlocked = false;
  let autoTimer = 0;

  const unlockAudio = (): void => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    audio.unlock();
  };

  const applyEverywhere = (next: Settings): void => {
    settings = next;
    stage.applySettings(next);
    uiLayer.applySettings(next);
    audio.applySettings(next);
    syncFullscreen(next.fullscreen);
  };

  const buildSlotInfo = (slot: number): SaveSlotInfo | null => {
    if (!activeBundle) return null;
    const state = runtime.snapshot();
    let thumbnail: string | undefined;
    try {
      thumbnail = stage.captureThumbnail();
    } catch {
      thumbnail = undefined;
    }
    const savedAt = new Date().toISOString();
    return {
      slot,
      state: { ...state, savedAt },
      thumbnail,
      savedAt,
      label: describeMoment(state, activeBundle.manifest),
      storyId: activeBundle.manifest.id,
      storyTitle: activeBundle.manifest.title,
    };
  };

  /** Load a bundle into every subsystem and begin play (optionally from a save). */
  const beginStory = async (bundle: StoryBundle, state?: GameState): Promise<void> => {
    if (starting) return;
    starting = true;
    try {
      activeBundle = bundle;
      await Promise.all([stage.loadStory(bundle), audio.loadStory(bundle)]);
      applyEverywhere(settings);
      uiLayer.applyTheme(bundle.manifest.theme);
      runtime.load(bundle, state);
      uiLayer.hideTitle();
      dismissBoot();
      stage.start();
      unlockAudio();
      inStory = true;
      runtime.start();
    } catch (err) {
      // A failed start must not brick the app — fall back to the title screen.
      // eslint-disable-next-line no-console
      console.error('[pq] failed to start story', err);
      inStory = false;
      activeBundle = null;
      stage.stop();
      uiLayer.showTitle(manifests);
      dismissBoot();
    } finally {
      starting = false;
    }
  };

  /* ── AppHost implementation the UI calls into ── */
  const host: AppHost = {
    stories() {
      return manifests;
    },
    getCoverUrl(storyId: string) {
      const bundle = bundleById.get(storyId);
      const key = bundle?.manifest.cover;
      if (!bundle || !key) return undefined;
      return bundle.assets.cg[key];
    },
    getBackdropUrl(storyId: string) {
      const bundle = bundleById.get(storyId);
      if (!bundle) return undefined;
      // A story may ship a plate authored FOR the title: the same room, composed
      // for type — the subject held in the right two thirds, the left third left
      // as wall for the wordmark to sit on. When it exists it always wins; a
      // gameplay background is a background, and it is only ever a stand-in here.
      const titlePlate = bundle.assets.cg['title_backdrop'];
      if (titlePlate) return titlePlate;
      // Otherwise the first declared background = the story's establishing shot;
      // its near-most layer is the sharpest plate we have of the place.
      for (const bg of Object.values(bundle.assets.backgrounds)) {
        const near = bg.layers[bg.layers.length - 1];
        if (near) return near;
      }
      return undefined;
    },
    startStory(storyId: string) {
      const bundle = bundleById.get(storyId);
      if (!bundle) {
        // eslint-disable-next-line no-console
        console.warn(`[pq] unknown story "${storyId}"`);
        return;
      }
      void beginStory(bundle);
    },
    continueGame() {
      const auto = saveStore.loadAuto();
      if (!auto) return;
      const bundle = bundleById.get(auto.storyId);
      if (!bundle) {
        // eslint-disable-next-line no-console
        console.warn(`[pq] autosave references missing story "${auto.storyId}"`);
        return;
      }
      void beginStory(bundle, auto.state);
    },
    hasContinue() {
      const auto = saveStore.loadAuto();
      return !!auto && bundleById.has(auto.storyId);
    },
    saveToSlot(slot: number) {
      const info = buildSlotInfo(slot);
      if (info) saveStore.save(slot, info);
    },
    loadFromSlot(slot: number) {
      const info = saveStore.load(slot);
      if (!info) return;
      const bundle = bundleById.get(info.storyId);
      if (!bundle) return;
      void beginStory(bundle, info.state);
    },
    deleteSlot(slot: number) {
      saveStore.remove(slot);
    },
    listSaves() {
      return saveStore.list();
    },
    applySettings(next: Settings) {
      settingsStore.save(next);
      applyEverywhere(next);
    },
    getSettings() {
      return { ...settings };
    },
    returnToTitle() {
      inStory = false;
      activeBundle = null;
      if (autoTimer) {
        window.clearTimeout(autoTimer);
        autoTimer = 0;
      }
      stage.stop();
      // Silence sustained beds without reaching into the audio subsystem directly.
      bus.emit('audio:music', { id: null, fade: 1.2 });
      bus.emit('audio:ambience', { id: null, fade: 1.2 });
      uiLayer.showTitle(manifests);
    },
    storygenHealth() {
      return health;
    },
    adoptStory(storyId: string) {
      writeAutostart(storyId);
    },
  };

  /* ── UI (constructed last: it reads host.getSettings() in its ctor) ── */
  const uiLayer = new UILayer(bus, uiRoot, host);

  /* ── First paint: size the stage, apply settings, then either resume a
   *    just-created story (CreateStory's "Begin" handshake) or show the
   *    title ── */
  stage.resize();
  applyEverywhere(settings);

  const autostartId = takeAutostart();
  const autostartBundle = autostartId ? bundleById.get(autostartId) : undefined;
  if (autostartBundle) {
    // beginStory() owns dismissBoot() itself, timed to when the story's own
    // assets are actually ready (it awaits stage.loadStory + audio.loadStory
    // first). Scheduling the splash's fade here too — as the title-screen
    // branch below does — would tear it away over a blank stage for the
    // whole of that load; the two paths hand off the splash differently on
    // purpose, not by accident. A failed start falls back to the title
    // screen from inside beginStory's own catch, dismissing the splash then.
    void beginStory(autostartBundle);
  } else {
    // A missing/expired/unresolvable autostart id falls through silently to
    // here — the story (if any) is still in the picker, exactly as if
    // "Create a Story" had never been used this session.
    uiLayer.showTitle(manifests);
    // Give the title screen one frame to lay out, then fade the boot splash.
    requestAnimationFrame(() => requestAnimationFrame(dismissBoot));
  }

  /* ── Rolling autosave, throttled off state:changed ── */
  bus.on('state:changed', () => {
    if (!inStory || !activeBundle) return;
    if (autoTimer) return;
    autoTimer = window.setTimeout(() => {
      autoTimer = 0;
      const info = buildSlotInfo(0);
      if (info) saveStore.autosave(info);
    }, AUTOSAVE_THROTTLE_MS);
  });

  /* ── Window / lifecycle wiring ── */
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      stage.resize();
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (!inStory) return;
    if (document.hidden) stage.stop();
    else stage.start();
  });

  // Resume the AudioContext on the first user gesture (autoplay policy).
  const onFirstGesture = (): void => {
    unlockAudio();
    window.removeEventListener('pointerdown', onFirstGesture);
    window.removeEventListener('keydown', onFirstGesture);
  };
  window.addEventListener('pointerdown', onFirstGesture, { passive: true });
  window.addEventListener('keydown', onFirstGesture);

  /* ── boot splash helpers ── */
  function dismissBoot(): void {
    if (!bootSplash || !bootSplash.isConnected) return;
    bootSplash.classList.add('is-out');
    bootSplash.setAttribute('data-out', '');
    const remove = (): void => bootSplash.remove();
    bootSplash.addEventListener('transitionend', remove, { once: true });
    // Fallback in case the transition never fires (reduced-motion, etc.).
    window.setTimeout(remove, 1200);
  }
}

/** Toggle browser fullscreen to match the setting; best-effort, never throws. */
function syncFullscreen(want: boolean): void {
  try {
    const active = !!document.fullscreenElement;
    if (want && !active) {
      void document.documentElement.requestFullscreen?.();
    } else if (!want && active) {
      void document.exitFullscreen?.();
    }
  } catch {
    /* fullscreen may be blocked outside a user gesture — non-fatal */
  }
}

boot().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[pq] fatal boot error', err);
});
