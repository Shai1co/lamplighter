/**
 * Picture Quest — composition root.
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

/** Debounce interval for the rolling autosave triggered by state:changed. */
const AUTOSAVE_THROTTLE_MS = 1400;

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

  /* ── Story discovery (auto-discovered from /stories, art-optional) ── */
  const bundles = await discoverStories();
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
  };

  /* ── UI (constructed last: it reads host.getSettings() in its ctor) ── */
  const uiLayer = new UILayer(bus, uiRoot, host);

  /* ── First paint: size the stage, apply settings, show the title ── */
  stage.resize();
  applyEverywhere(settings);
  uiLayer.showTitle(manifests);
  // Give the title screen one frame to lay out, then fade the boot splash.
  requestAnimationFrame(() => requestAnimationFrame(dismissBoot));

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
