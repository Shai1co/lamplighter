/**
 * Picture Quest — procedural WebAudio fallback synths.
 *
 * When a story ships without binary audio (art & audio are generated in a later
 * phase), the AudioManager still needs *something* to play. These generators
 * build tasteful, deliberately QUIET ambient textures and UI one-shots straight
 * from an `AudioContext`, with no external samples — so the slice is fully
 * playable and atmospheric before a single sound file exists.
 *
 * Every generator returns the same tiny handle:  { start, stop, setVolume }.
 * `setVolume(v, ramp?)` drives a single master gain the AudioManager owns; the
 * optional `ramp` (seconds) lets the manager crossfade procedural beds exactly
 * like it crossfades real Howler tracks.
 *
 * All textures are parameterizable by the story theme's key-color HUE so, e.g.,
 * a cool teal story hums a little lower and bluer than a warm amber one.
 *
 * This module is browser-only (WebAudio). It never touches the DOM.
 */

/** The uniform handle every procedural source exposes. */
export interface SynthVoice {
  /** Begin producing sound (idempotent). */
  start(): void;
  /** Stop and release all nodes (idempotent). */
  stop(): void;
  /**
   * Ramp the source's master gain toward `v` (0..1, already scaled by the
   * caller) over `ramp` seconds. `ramp` defaults to a short de-click smoothing.
   */
  setVolume(v: number, ramp?: number): void;
}

export interface SynthOptions {
  /** Story key-color hue in degrees (0..360). Tints pitch/timbre. */
  hue?: number;
  /** Approximate playtime for one-shots; ignored by looping beds. */
  seconds?: number;
}

/** Presets the AudioManager may request. Unknown names fall back to `pad`. */
export type SynthPreset =
  | 'pad'
  | 'drone'
  | 'rain'
  | 'hum'
  | 'wind'
  | 'chime'
  | 'click'
  | 'tone';

const SMOOTH = 0.06; // default de-click ramp (s)
const TWO_PI = Math.PI * 2;

/* ───────────────────────────── helpers ───────────────────────────── */

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Map a 0..360 hue to a soft, low musical root frequency (Hz). */
function hueToRoot(hue: number): number {
  // Pentatonic-ish sweep across roughly A2..A3 so beds stay warm and low.
  const h = ((hue % 360) + 360) % 360;
  const semis = [0, 3, 5, 7, 10]; // minor pentatonic degrees
  const idx = Math.floor((h / 360) * semis.length) % semis.length;
  const base = 110; // A2
  return base * Math.pow(2, semis[idx] / 12);
}

/** Fill a mono buffer with white noise, ready to loop seamlessly. */
function makeNoiseBuffer(ctx: AudioContext, seconds = 2.5): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Common master-gain plumbing shared by every voice. */
interface VoiceCore {
  master: GainNode;
  /** Nodes/oscillators to be stopped on teardown. */
  register(node: { disconnect(): void; stop?: (when?: number) => void }): void;
  started: boolean;
  disposed: boolean;
  /** Standard setVolume implementation over `master`. */
  setVolume(v: number, ramp?: number): void;
  /** Standard teardown; fades then disconnects. */
  stop(): void;
}

function makeCore(ctx: AudioContext): VoiceCore {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const nodes: Array<{ disconnect(): void; stop?: (when?: number) => void }> = [];
  const core: VoiceCore = {
    master,
    started: false,
    disposed: false,
    register(node) {
      nodes.push(node);
    },
    setVolume(v, ramp = SMOOTH) {
      if (core.disposed) return;
      const t = ctx.currentTime;
      const target = clamp(v, 0, 1);
      const g = master.gain;
      // Cancel any in-flight automation and ramp from the *current* value.
      g.cancelScheduledValues(t);
      g.setValueAtTime(Math.max(g.value, 1e-4), t);
      if (ramp <= 0.001) g.setValueAtTime(target, t);
      else g.linearRampToValueAtTime(Math.max(target, 1e-4), t + ramp);
    },
    stop() {
      if (core.disposed) return;
      core.disposed = true;
      const t = ctx.currentTime;
      // Quick fade to avoid clicks, then tear down.
      try {
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(Math.max(master.gain.value, 1e-4), t);
        master.gain.linearRampToValueAtTime(1e-4, t + 0.08);
      } catch {
        /* context may already be closed */
      }
      const stopAt = t + 0.1;
      for (const node of nodes) {
        try {
          node.stop?.(stopAt);
        } catch {
          /* already stopped */
        }
      }
      window.setTimeout(() => {
        for (const node of nodes) {
          try {
            node.disconnect();
          } catch {
            /* noop */
          }
        }
        try {
          master.disconnect();
        } catch {
          /* noop */
        }
      }, 160);
    },
  };
  return core;
}

/** A low-frequency oscillator used to modulate a param, with a target node. */
function makeLfo(
  ctx: AudioContext,
  rateHz: number,
  depth: number,
  center: number,
  target: AudioParam,
): OscillatorNode {
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = rateHz;
  const amp = ctx.createGain();
  amp.gain.value = depth;
  target.value = center;
  lfo.connect(amp).connect(target);
  return lfo;
}

/* ───────────────────────────── generators ───────────────────────────── */

/**
 * A slow, evolving ambient PAD: a soft chord of detuned sine/triangle voices
 * through a lowpass whose cutoff drifts on a very slow LFO. The signature bed.
 */
function makePad(ctx: AudioContext, opts: SynthOptions): SynthVoice {
  const core = makeCore(ctx);
  const root = hueToRoot(opts.hue ?? 200) / 2; // an octave down: warmer
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  filter.Q.value = 0.4;
  filter.connect(core.master);

  // Chord: root, fifth, octave — each a pair of slightly detuned voices.
  const ratios = [1, 1.5, 2];
  const detunes = [-6, 7];
  const oscs: OscillatorNode[] = [];
  for (const r of ratios) {
    for (const d of detunes) {
      const osc = ctx.createOscillator();
      osc.type = r === 2 ? 'triangle' : 'sine';
      osc.frequency.value = root * r;
      osc.detune.value = d;
      const vg = ctx.createGain();
      vg.gain.value = 0.16 / ratios.length;
      osc.connect(vg).connect(filter);
      core.register(osc);
      core.register(vg);
      oscs.push(osc);
    }
  }

  // Slow timbral drift + breathing amplitude.
  const cutoffLfo = makeLfo(ctx, 0.05, 260, 620, filter.frequency);
  const ampLfo = ctx.createOscillator();
  ampLfo.type = 'sine';
  ampLfo.frequency.value = 0.08;
  const ampDepth = ctx.createGain();
  ampDepth.gain.value = 0.12;
  const bias = ctx.createConstantSource();
  bias.offset.value = 0.88;
  const breathe = ctx.createGain();
  breathe.gain.value = 1;
  filter.disconnect();
  filter.connect(breathe).connect(core.master);
  ampLfo.connect(ampDepth).connect(breathe.gain);
  bias.connect(breathe.gain);
  core.register(cutoffLfo);
  core.register(ampLfo);
  core.register(bias);
  core.register(breathe);
  core.register(filter);

  return {
    start() {
      if (core.started || core.disposed) return;
      core.started = true;
      const t0 = ctx.currentTime + 0.02;
      for (const o of oscs) o.start(t0);
      cutoffLfo.start(t0);
      ampLfo.start(t0);
      bias.start(t0);
    },
    stop: () => core.stop(),
    setVolume: (v, ramp) => core.setVolume(v, ramp),
  };
}

/** A darker single-note DRONE (for tense scenes). */
function makeDrone(ctx: AudioContext, opts: SynthOptions): SynthVoice {
  const core = makeCore(ctx);
  const root = hueToRoot(opts.hue ?? 210) / 4;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 380;
  filter.Q.value = 0.6;
  filter.connect(core.master);

  const oscs: OscillatorNode[] = [];
  for (const [mult, det] of [
    [1, -4],
    [1, 5],
    [2, 0],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = mult === 2 ? 'sine' : 'sawtooth';
    osc.frequency.value = root * mult;
    osc.detune.value = det;
    const vg = ctx.createGain();
    vg.gain.value = mult === 2 ? 0.05 : 0.14;
    osc.connect(vg).connect(filter);
    core.register(osc);
    core.register(vg);
    oscs.push(osc);
  }
  const lfo = makeLfo(ctx, 0.03, 120, 340, filter.frequency);
  core.register(lfo);
  core.register(filter);

  return {
    start() {
      if (core.started || core.disposed) return;
      core.started = true;
      const t0 = ctx.currentTime + 0.02;
      for (const o of oscs) o.start(t0);
      lfo.start(t0);
    },
    stop: () => core.stop(),
    setVolume: (v, ramp) => core.setVolume(v, ramp),
  };
}

/** Filtered-noise RAIN bed with gentle windshield-y swell. */
function makeRain(ctx: AudioContext, _opts: SynthOptions): SynthVoice {
  const core = makeCore(ctx);
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, 3);
  src.loop = true;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 900;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 6500;
  const body = ctx.createGain();
  body.gain.value = 0.5;

  src.connect(hp).connect(lp).connect(body).connect(core.master);

  // Slow swell so the rain feels like it "breathes" past a window.
  const swell = makeLfo(ctx, 0.07, 0.18, 0.5, body.gain);
  core.register(src);
  core.register(hp);
  core.register(lp);
  core.register(body);
  core.register(swell);

  return {
    start() {
      if (core.started || core.disposed) return;
      core.started = true;
      const t0 = ctx.currentTime + 0.02;
      src.start(t0);
      swell.start(t0);
    },
    stop: () => core.stop(),
    setVolume: (v, ramp) => core.setVolume(v, ramp),
  };
}

/** Soft room HUM: a low fundamental + a whisper of filtered noise. */
function makeHum(ctx: AudioContext, opts: SynthOptions): SynthVoice {
  const core = makeCore(ctx);
  const root = hueToRoot(opts.hue ?? 200) / 4;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = clamp(root, 45, 90);
  const oGain = ctx.createGain();
  oGain.gain.value = 0.12;
  osc.connect(oGain).connect(core.master);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = clamp(root, 45, 90) * 1.5;
  osc2.detune.value = 4;
  const o2Gain = ctx.createGain();
  o2Gain.gain.value = 0.04;
  osc2.connect(o2Gain).connect(core.master);

  const noise = ctx.createBufferSource();
  noise.buffer = makeNoiseBuffer(ctx, 2.5);
  noise.loop = true;
  const nlp = ctx.createBiquadFilter();
  nlp.type = 'lowpass';
  nlp.frequency.value = 420;
  const nGain = ctx.createGain();
  nGain.gain.value = 0.05;
  noise.connect(nlp).connect(nGain).connect(core.master);

  core.register(osc);
  core.register(osc2);
  core.register(oGain);
  core.register(o2Gain);
  core.register(noise);
  core.register(nlp);
  core.register(nGain);

  return {
    start() {
      if (core.started || core.disposed) return;
      core.started = true;
      const t0 = ctx.currentTime + 0.02;
      osc.start(t0);
      osc2.start(t0);
      noise.start(t0);
    },
    stop: () => core.stop(),
    setVolume: (v, ramp) => core.setVolume(v, ramp),
  };
}

/** Airy WIND: band-passed noise swept slowly. */
function makeWind(ctx: AudioContext, _opts: SynthOptions): SynthVoice {
  const core = makeCore(ctx);
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, 3);
  src.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 500;
  bp.Q.value = 1.2;
  const body = ctx.createGain();
  body.gain.value = 0.5;
  src.connect(bp).connect(body).connect(core.master);
  const sweep = makeLfo(ctx, 0.05, 380, 620, bp.frequency);
  const swell = makeLfo(ctx, 0.09, 0.22, 0.5, body.gain);
  core.register(src);
  core.register(bp);
  core.register(body);
  core.register(sweep);
  core.register(swell);
  return {
    start() {
      if (core.started || core.disposed) return;
      core.started = true;
      const t0 = ctx.currentTime + 0.02;
      src.start(t0);
      sweep.start(t0);
      swell.start(t0);
    },
    stop: () => core.stop(),
    setVolume: (v, ramp) => core.setVolume(v, ramp),
  };
}

/** A soft bell CHIME one-shot: a few inharmonic partials, quick decay. */
function makeChime(ctx: AudioContext, opts: SynthOptions): SynthVoice {
  const core = makeCore(ctx);
  const root = hueToRoot(opts.hue ?? 200);
  const partials: Array<[number, number]> = [
    [1, 0.5],
    [2.01, 0.28],
    [3.02, 0.16],
    [4.75, 0.08],
  ];
  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  for (const [mult, amp] of partials) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = root * mult;
    const g = ctx.createGain();
    g.gain.value = 0;
    osc.connect(g).connect(core.master);
    core.register(osc);
    core.register(g);
    oscs.push(osc);
    gains.push(g);
  }

  return {
    start() {
      if (core.started || core.disposed) return;
      core.started = true;
      const t0 = ctx.currentTime + 0.01;
      const decay = clamp(opts.seconds ?? 2.4, 0.6, 4);
      oscs.forEach((osc, i) => {
        const amp = partials[i][1];
        const g = gains[i].gain;
        g.setValueAtTime(0, t0);
        g.linearRampToValueAtTime(amp, t0 + 0.008);
        g.exponentialRampToValueAtTime(0.0001, t0 + decay * (1 - i * 0.12));
        osc.start(t0);
        osc.stop(t0 + decay + 0.1);
      });
    },
    stop: () => core.stop(),
    setVolume: (v, ramp) => core.setVolume(v, ramp === undefined ? 0.005 : ramp),
  };
}

/** A soft UI CLICK one-shot: a short filtered blip. */
function makeClick(ctx: AudioContext, opts: SynthOptions): SynthVoice {
  const core = makeCore(ctx);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = clamp(hueToRoot(opts.hue ?? 200) * 3, 300, 900);
  const g = ctx.createGain();
  g.gain.value = 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  osc.connect(g).connect(lp).connect(core.master);
  core.register(osc);
  core.register(g);
  core.register(lp);
  return {
    start() {
      if (core.started || core.disposed) return;
      core.started = true;
      const t0 = ctx.currentTime + 0.005;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.4, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      osc.frequency.setValueAtTime(osc.frequency.value, t0);
      osc.frequency.exponentialRampToValueAtTime(osc.frequency.value * 0.6, t0 + 0.14);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    },
    stop: () => core.stop(),
    setVolume: (v, ramp) => core.setVolume(v, ramp === undefined ? 0.005 : ramp),
  };
}

/** A pure sustained TONE (utility / test / neutral confirmation). */
function makeTone(ctx: AudioContext, opts: SynthOptions): SynthVoice {
  const core = makeCore(ctx);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = hueToRoot(opts.hue ?? 200);
  const g = ctx.createGain();
  g.gain.value = 0.2;
  osc.connect(g).connect(core.master);
  core.register(osc);
  core.register(g);
  return {
    start() {
      if (core.started || core.disposed) return;
      core.started = true;
      osc.start(ctx.currentTime + 0.02);
    },
    stop: () => core.stop(),
    setVolume: (v, ramp) => core.setVolume(v, ramp),
  };
}

/* ───────────────────────────── factory ───────────────────────────── */

/** True for presets that loop forever (beds); false for transient one-shots. */
export function isLoopingPreset(preset: string): boolean {
  switch (preset) {
    case 'chime':
    case 'click':
      return false;
    default:
      return true;
  }
}

/**
 * Build a procedural voice for `preset`, tinted by `opts`. Unknown presets fall
 * back to the ambient pad so the caller always gets audible, tasteful output.
 */
export function createSynthVoice(
  ctx: AudioContext,
  preset: string,
  opts: SynthOptions = {},
): SynthVoice {
  switch (preset) {
    case 'pad':
      return makePad(ctx, opts);
    case 'drone':
      return makeDrone(ctx, opts);
    case 'rain':
      return makeRain(ctx, opts);
    case 'hum':
      return makeHum(ctx, opts);
    case 'wind':
      return makeWind(ctx, opts);
    case 'chime':
      return makeChime(ctx, opts);
    case 'click':
      return makeClick(ctx, opts);
    case 'tone':
      return makeTone(ctx, opts);
    default:
      return makePad(ctx, opts);
  }
}
