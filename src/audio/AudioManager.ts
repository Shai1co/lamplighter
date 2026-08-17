/**
 * Lamplighter — AudioManager.
 *
 * The sole audio subsystem. It never talks to the runtime, stage, or UI
 * directly: it subscribes to the three audio directives on the shared bus
 * (`audio:music`, `audio:ambience`, `audio:sfx`) and turns them into sound.
 *
 * Every story is playable with ZERO binary audio: entries that resolve to a
 * real file are driven by Howler; entries without a file fall back to a
 * tasteful, quiet procedural texture from ./synth.ts. There is always
 * *something* to play, and a missing asset never throws.
 *
 * Volume model (single, predictable):
 *   effective = master × busVolume × baseVolume × fadeLevel
 * where the "music" bus also carries ambience (Settings exposes only
 * master/music/sfx). For Howler sources `master` is applied once by
 * `Howler.volume()`; procedural sources apply it by hand on their own
 * AudioContext.
 */
import { Howl, Howler } from 'howler';
import type { AudioDef, IAudioManager, IEmitter, Settings, StoryBundle } from '../core/types';
import { createSynthVoice, isLoopingPreset, type SynthVoice } from './synth';

type Category = 'music' | 'ambience' | 'sfx';

/** Default base volume when a manifest AudioDef omits `volume`. */
const DEFAULT_BASE: Record<Category, number> = {
  music: 0.7,
  ambience: 0.55,
  sfx: 0.85,
};

/** Extra trim so procedural beds/one-shots stay ambient and non-fatiguing. */
const PROC_BED_TRIM = 0.5;
const PROC_SHOT_TRIM = 0.8;

const DEFAULT_FADE = 0.6;

interface SoundEntry {
  id: string;
  category: Category;
  def: AudioDef;
  url?: string;
  /** Resolved procedural preset used when there is no file. */
  preset: string;
  /** Lazily created Howl (only when `url` is present). */
  howl?: Howl;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Parse a #rgb / #rrggbb color into a hue in degrees (0..360). */
function hexToHue(hex: string): number {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length < 6) return 200;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return 200;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 200;
  let hue: number;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue *= 60;
  return hue < 0 ? hue + 360 : hue;
}

/* ───────────────────────────── looping bed voice ───────────────────────────── */

/**
 * A single sustained bed (music or ambience). Wraps either a Howler instance
 * or a procedural synth; if it has neither (no file, no AudioContext) it is a
 * silent no-op so callers never branch on availability.
 */
class BedVoice {
  level = 0;
  private howlId?: number;
  private howlVol = 0;
  private freeTimer?: number;
  private freed = false;

  constructor(
    private readonly mgr: AudioManager,
    readonly category: Category,
    private readonly base: number,
    private readonly howl?: Howl,
    private readonly synth?: SynthVoice,
  ) {}

  start(): void {
    if (this.howl) {
      this.howlId = this.howl.play();
      this.howl.loop(true, this.howlId);
      this.howlVol = 0;
      this.howl.volume(0, this.howlId);
    } else if (this.synth) {
      this.synth.start();
      this.synth.setVolume(0, 0.01);
    }
  }

  fadeTo(level: number, seconds: number): void {
    this.level = clamp01(level);
    const cat = this.mgr.busVolume(this.category);
    if (this.howl && this.howlId !== undefined) {
      const to = cat * this.base * this.level;
      const ms = Math.max(0, Math.round(seconds * 1000));
      if (ms < 20) this.howl.volume(to, this.howlId);
      else this.howl.fade(this.howlVol, to, ms, this.howlId);
      this.howlVol = to;
    } else if (this.synth) {
      const to = this.mgr.masterVolume * cat * this.base * this.level;
      this.synth.setVolume(to, Math.max(0, seconds));
    }
  }

  /** Re-assert the current level under freshly changed volume settings. */
  refresh(): void {
    this.fadeTo(this.level, 0.12);
  }

  stop(seconds: number): void {
    if (this.freed) return;
    this.fadeTo(0, seconds);
    const ms = Math.max(0, Math.round(seconds * 1000)) + 140;
    this.freeTimer = window.setTimeout(() => this.free(), ms);
  }

  free(): void {
    if (this.freed) return;
    this.freed = true;
    if (this.freeTimer !== undefined) {
      clearTimeout(this.freeTimer);
      this.freeTimer = undefined;
    }
    if (this.howl && this.howlId !== undefined) {
      try {
        this.howl.stop(this.howlId);
      } catch {
        /* already stopped */
      }
    }
    if (this.synth) {
      try {
        this.synth.stop();
      } catch {
        /* already stopped */
      }
    }
  }
}

/* ───────────────────────────── manager ───────────────────────────── */

export class AudioManager implements IAudioManager {
  // Public so BedVoice can read the live mix without a back-channel.
  masterVolume = 0.9;
  private musicVol = 0.7;
  private sfxVol = 0.85;

  private readonly unsubs: Array<() => void> = [];

  private ctx?: AudioContext;
  private hue = 200;

  private music: Record<string, SoundEntry> = {};
  private ambience: Record<string, SoundEntry> = {};
  private sfx: Record<string, SoundEntry> = {};

  private musicChannel?: BedVoice;
  private ambienceChannel?: BedVoice;
  private currentMusicId: string | null = null;
  private currentAmbienceId: string | null = null;

  private readonly transientSynths = new Set<SynthVoice>();
  private readonly transientTimers = new Set<number>();
  private readonly ownedHowls = new Set<Howl>();

  constructor(private readonly bus: IEmitter) {
    this.unsubs.push(
      bus.on('audio:music', ({ id, fade }) => this.setBed('music', id, fade ?? DEFAULT_FADE)),
      bus.on('audio:ambience', ({ id, fade }) =>
        this.setBed('ambience', id, fade ?? DEFAULT_FADE),
      ),
      bus.on('audio:sfx', ({ id }) => this.playSfx(id)),
    );
  }

  /* ── lifecycle ── */

  async loadStory(bundle: StoryBundle): Promise<void> {
    this.teardownSounds();
    this.hue = hexToHue(bundle.manifest.theme.key ?? '#7db4c8');
    this.ensureContext();

    this.music = this.buildEntries('music', bundle.assets.music);
    this.ambience = this.buildEntries('ambience', bundle.assets.ambience);
    this.sfx = this.buildEntries('sfx', bundle.assets.sfx);

    // Warm real files so the first cue starts cleanly. Never hang on a broken
    // path: each entry resolves on 'load' OR 'loaderror', and the whole batch
    // is capped so a missing asset can't stall story start.
    const toWarm: Promise<void>[] = [];
    for (const table of [this.music, this.ambience, this.sfx]) {
      for (const entry of Object.values(table)) {
        if (entry.url) toWarm.push(this.warmHowl(entry));
      }
    }
    if (toWarm.length > 0) {
      await Promise.race([
        Promise.all(toWarm),
        new Promise<void>((resolve) => window.setTimeout(resolve, 4000)),
      ]);
    }
  }

  applySettings(settings: Settings): void {
    this.masterVolume = clamp01(settings.masterVolume);
    this.musicVol = clamp01(settings.musicVolume);
    this.sfxVol = clamp01(settings.sfxVolume);
    try {
      Howler.volume(this.masterVolume);
    } catch {
      /* Howler global not ready */
    }
    this.musicChannel?.refresh();
    this.ambienceChannel?.refresh();
  }

  unlock(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        /* ignore */
      });
    }
    try {
      const hctx = Howler.ctx;
      if (hctx && hctx.state === 'suspended') void hctx.resume();
    } catch {
      /* Howler context not created yet */
    }
  }

  dispose(): void {
    for (const off of this.unsubs) off();
    this.unsubs.length = 0;
    this.teardownSounds();
    if (this.ctx) {
      this.ctx.close().catch(() => {
        /* ignore */
      });
      this.ctx = undefined;
    }
  }

  /* ── bus-exposed mix helpers (used by BedVoice) ── */

  busVolume(category: Category): number {
    // Settings has no dedicated ambience bus; ambience rides the music bus.
    return category === 'sfx' ? this.sfxVol : this.musicVol;
  }

  /* ── internals ── */

  private ensureContext(): void {
    if (this.ctx) return;
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return; // no WebAudio → procedural sources become silent no-ops
    try {
      this.ctx = new Ctor();
    } catch {
      this.ctx = undefined;
    }
  }

  private buildEntries(
    category: Category,
    table: Record<string, { url?: string; def: AudioDef }>,
  ): Record<string, SoundEntry> {
    const out: Record<string, SoundEntry> = {};
    for (const [id, { url, def }] of Object.entries(table)) {
      out[id] = { id, category, def, url, preset: this.resolvePreset(category, def) };
    }
    return out;
  }

  private resolvePreset(category: Category, def: AudioDef): string {
    if (def.synth && def.synth.trim().length > 0) return def.synth.trim();
    switch (category) {
      case 'music':
        return 'pad';
      case 'ambience':
        return 'hum';
      case 'sfx':
      default:
        return 'chime';
    }
  }

  private baseFor(entry: SoundEntry): number {
    const raw = entry.def.volume ?? DEFAULT_BASE[entry.category];
    if (entry.url) return clamp01(raw);
    const trim = isLoopingPreset(entry.preset) ? PROC_BED_TRIM : PROC_SHOT_TRIM;
    return clamp01(raw) * trim;
  }

  private ensureHowl(entry: SoundEntry): Howl | undefined {
    if (!entry.url) return undefined;
    if (!entry.howl) {
      const looping = entry.category !== 'sfx' && (entry.def.loop ?? true);
      entry.howl = new Howl({
        src: [entry.url],
        loop: looping,
        volume: 1,
        preload: true,
        html5: false,
      });
      this.ownedHowls.add(entry.howl);
    }
    return entry.howl;
  }

  private warmHowl(entry: SoundEntry): Promise<void> {
    const howl = this.ensureHowl(entry);
    if (!howl) return Promise.resolve();
    if (howl.state() === 'loaded') return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = (): void => resolve();
      howl.once('load', done);
      howl.once('loaderror', done);
    });
  }

  private makeBedVoice(entry: SoundEntry): BedVoice {
    const base = this.baseFor(entry);
    if (entry.url) {
      return new BedVoice(this, entry.category, base, this.ensureHowl(entry), undefined);
    }
    if (this.ctx) {
      const synth = createSynthVoice(this.ctx, entry.preset, { hue: this.hue });
      return new BedVoice(this, entry.category, base, undefined, synth);
    }
    // No file, no audio context: an inert but valid bed.
    return new BedVoice(this, entry.category, base, undefined, undefined);
  }

  private setBed(channel: 'music' | 'ambience', id: string | null, fade: number): void {
    const isMusic = channel === 'music';
    const currentId = isMusic ? this.currentMusicId : this.currentAmbienceId;
    const currentVoice = isMusic ? this.musicChannel : this.ambienceChannel;

    if (id !== null && id === currentId && currentVoice) return; // already playing this cue

    if (currentVoice) currentVoice.stop(fade);

    if (id === null) {
      if (isMusic) {
        this.musicChannel = undefined;
        this.currentMusicId = null;
      } else {
        this.ambienceChannel = undefined;
        this.currentAmbienceId = null;
      }
      return;
    }

    const table = isMusic ? this.music : this.ambience;
    const entry = table[id];
    if (!entry) {
      // Unknown cue id: leave silence rather than crash.
      if (isMusic) {
        this.musicChannel = undefined;
        this.currentMusicId = null;
      } else {
        this.ambienceChannel = undefined;
        this.currentAmbienceId = null;
      }
      return;
    }

    const voice = this.makeBedVoice(entry);
    voice.start();
    voice.fadeTo(1, fade);
    if (isMusic) {
      this.musicChannel = voice;
      this.currentMusicId = id;
    } else {
      this.ambienceChannel = voice;
      this.currentAmbienceId = id;
    }
  }

  private playSfx(id: string): void {
    const entry = this.sfx[id];
    if (!entry) return; // unknown sfx → silence, never throw
    const cat = this.busVolume('sfx');
    const base = this.baseFor(entry);

    if (entry.url) {
      const howl = this.ensureHowl(entry);
      if (!howl) return;
      const sid = howl.play();
      howl.loop(false, sid);
      howl.volume(cat * base, sid); // master applied by Howler global
      return;
    }

    if (!this.ctx) return; // no WebAudio → silent
    const voice = createSynthVoice(this.ctx, entry.preset, { hue: this.hue, seconds: 2.4 });
    voice.start();
    voice.setVolume(this.masterVolume * cat * base, 0.02);
    this.transientSynths.add(voice);
    const timer = window.setTimeout(() => {
      try {
        voice.stop();
      } catch {
        /* noop */
      }
      this.transientSynths.delete(voice);
      this.transientTimers.delete(timer);
    }, 3400);
    this.transientTimers.add(timer);
  }

  /** Stop & release everything owned by the current story (keeps the context). */
  private teardownSounds(): void {
    this.musicChannel?.free();
    this.ambienceChannel?.free();
    this.musicChannel = undefined;
    this.ambienceChannel = undefined;
    this.currentMusicId = null;
    this.currentAmbienceId = null;

    for (const t of this.transientTimers) clearTimeout(t);
    this.transientTimers.clear();
    for (const v of this.transientSynths) {
      try {
        v.stop();
      } catch {
        /* noop */
      }
    }
    this.transientSynths.clear();

    for (const howl of this.ownedHowls) {
      try {
        howl.stop();
        howl.unload();
      } catch {
        /* noop */
      }
    }
    this.ownedHowls.clear();

    this.music = {};
    this.ambience = {};
    this.sfx = {};
  }
}
