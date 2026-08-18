/**
 * Lamplighter — the cinematic Three.js stage.
 *
 * Owns the WebGL renderer, scene graph (parallax background layers → characters
 * → near-plane weather), the Ken Burns camera, shader transitions, and the
 * post-processing stack. It is a pure subscriber on the shared bus: the Runtime
 * emits scene/char/weather/camera/fx directives; the Stage renders them. It
 * never emits, never touches narrative state, and degrades gracefully to
 * procedural placeholders when art has not been generated yet.
 */
import * as THREE from 'three';
import type {
  IStage,
  IEmitter,
  StoryBundle,
  StoryTheme,
  Settings,
  CharSide,
  CharacterDef,
  ResolvedBackground,
} from '../core/types';
import { DEFAULT_SETTINGS } from '../core/types';
import { KenBurns } from './camera';
import { Layer } from './Layer';
import { Character } from './Character';
import { Weather } from './weather';
import type { PaneSpec, RainWindowSpec } from './weather';
import { Transitions } from './transitions';
import { PostFX } from './postfx';

const FOV = 35;
const CAM_Z = 6;
const FAR_Z = -7;
const NEAR_Z = -1.8;
const CHAR_Z = -0.7;
/** Weather sits between the painted layers and the character plane. */
const WEATHER_Z = -1.25;
const OVERSCAN = 1.3;

/* ── How much bigger the weather fence is than the plate's solid core ────────
 *
 * The published footprint is Character.CORE — a superellipse fitted to the
 * presence mask, and deliberately conservative, because the SAME bounds also
 * position and scale the contact shadow under her (a shadow drawn to a generous
 * bound is a shadow that runs out from under her feet).
 *
 * The fence wants the opposite bias. Its job is that no drop, rivulet, dried
 * track or frame member may cross her SILHOUETTE — which is her face, her hair,
 * the hand at her temple, the near shoulder and the forearm, i.e. a good deal
 * more than the core the shadow is struck from. Under-scaled, the fence releases
 * across her shoulder and her arm, and those are the two large smooth planes
 * where a stray mark is most visible; over-scaled it starts deleting weather in
 * the empty bay outboard of her, where nothing is watching.
 *
 * 1.20 × 1.10, wider in x than in y because the plate's core is already tall
 * (hy 0.40 against hx 0.30) and it is her arm and shoulder, not her crown, that
 * the mask was missing. Read together with pqFigure's 0.82 plateau this puts
 * full-strength cover out to ~0.98 of the core radius and releases to nothing by
 * ~1.39 of it — clear of every part of her that reads, still inboard of the
 * second mullion.
 */
const FENCE_SCALE_X = 1.2;
const FENCE_SCALE_Y = 1.1;

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '').trim();
  const n =
    h.length === 3
      ? h.split('').map((c) => c + c).join('')
      : h.padEnd(6, '0').slice(0, 6);
  const int = parseInt(n, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

const css = (c: RGB, a = 1): string => `rgba(${c.r},${c.g},${c.b},${a})`;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Unsharp mask with a negative amount, in place, on RGBA bytes.
 *
 * `out = blur + (src - blur) · (1 - amount)`, so `amount` is literally the
 * fraction of local contrast removed. Two separable box passes approximate the
 * Gaussian closely enough at this radius and cost O(w·h) rather than O(w·h·r) —
 * the running sum is what makes a 15% detail knock-down affordable at load time
 * on a full-size portrait.
 *
 * Alpha is never touched: this runs before the presence mask, on a plate that
 * is still fully opaque, and the silhouette is not its business.
 */
function softenLocalContrast(
  px: Uint8ClampedArray,
  w: number,
  h: number,
  amount: number,
  radius: number,
): void {
  if (amount <= 0 || radius < 1) return;
  const n = w * h;
  const src = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    src[i * 3] = px[i * 4];
    src[i * 3 + 1] = px[i * 4 + 1];
    src[i * 3 + 2] = px[i * 4 + 2];
  }
  const blur = Float32Array.from(src);
  const tmp = new Float32Array(n * 3);
  const win = radius * 2 + 1;

  for (let pass = 0; pass < 2; pass++) {
    // Horizontal.
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          sum += blur[(row + Math.min(w - 1, Math.max(0, k))) * 3 + c];
        }
        for (let x = 0; x < w; x++) {
          tmp[(row + x) * 3 + c] = sum / win;
          const add = Math.min(w - 1, x + radius + 1);
          const drop = Math.max(0, x - radius);
          sum += blur[(row + add) * 3 + c] - blur[(row + drop) * 3 + c];
        }
      }
    }
    // Vertical.
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          sum += tmp[(Math.min(h - 1, Math.max(0, k)) * w + x) * 3 + c];
        }
        for (let y = 0; y < h; y++) {
          blur[(y * w + x) * 3 + c] = sum / win;
          const add = Math.min(h - 1, y + radius + 1);
          const drop = Math.max(0, y - radius);
          sum += tmp[(add * w + x) * 3 + c] - tmp[(drop * w + x) * 3 + c];
        }
      }
    }
  }

  const keep = 1 - amount;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      const b = blur[i * 3 + c];
      px[i * 4 + c] = b + (src[i * 3 + c] - b) * keep;
    }
  }
}

/**
 * Local-contrast GAIN over a soft elliptical region, in place, on RGBA bytes.
 *
 * The inverse of `softenLocalContrast` and built on the same two separable box
 * passes: `out = blur + (src - blur) · (1 + amount · w)`, where `w` is a soft
 * elliptical window in plate UV. It is a classic unsharp mask, and it is the
 * only instrument that can answer the note it exists for.
 *
 * That note: the desk vignette and the city bokeh were rendered at the SAME
 * sharpness, so the frame had no focal statement — and softness applied
 * uniformly across a picture does not read as depth of field, it reads as an
 * upscale. The far half is now genuinely resolved away in the grade (see
 * uFieldBlur), and the near half has to move the other way to meet it: a lamp
 * rim, a mug lip, a headset band and a monitor bezel that are demonstrably
 * CRISP are what make the softness beyond them read as a lens rather than as a
 * rendering failure.
 *
 * Confined to the region and feathered to nothing at its boundary, so nothing
 * anywhere acquires an edge; run once, at load, beside the practical shoulder.
 */
/*
 * …and it runs BOTH WAYS. `amount` was guarded at > 0 because the only caller
 * wanted gain, but the arithmetic — `blur + (src − blur)·(1 + amount·w)` — is
 * symmetric, and a NEGATIVE amount is a region-confined unsharp *soften*: the
 * one instrument that can answer the note about the sweater specifically.
 * See PLATE_SOFTEN.
 */
function crispenRegion(
  px: Uint8ClampedArray,
  w: number,
  h: number,
  amount: number,
  radius: number,
  region: { cx: number; cy: number; rx: number; ry: number; soft: number },
): void {
  if (amount === 0 || radius < 1) return;
  const n = w * h;
  const src = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    src[i * 3] = px[i * 4];
    src[i * 3 + 1] = px[i * 4 + 1];
    src[i * 3 + 2] = px[i * 4 + 2];
  }
  const blur = Float32Array.from(src);
  const tmp = new Float32Array(n * 3);
  const win = radius * 2 + 1;

  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          sum += blur[(row + Math.min(w - 1, Math.max(0, k))) * 3 + c];
        }
        for (let x = 0; x < w; x++) {
          tmp[(row + x) * 3 + c] = sum / win;
          sum +=
            blur[(row + Math.min(w - 1, x + radius + 1)) * 3 + c] -
            blur[(row + Math.max(0, x - radius)) * 3 + c];
        }
      }
    }
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          sum += tmp[(Math.min(h - 1, Math.max(0, k)) * w + x) * 3 + c];
        }
        for (let y = 0; y < h; y++) {
          blur[(y * w + x) * 3 + c] = sum / win;
          sum +=
            tmp[(Math.min(h - 1, y + radius + 1) * w + x) * 3 + c] -
            tmp[(Math.max(0, y - radius) * w + x) * 3 + c];
        }
      }
    }
  }

  const inner = Math.max(1 - region.soft, 0);
  const outer = 1 + region.soft;
  for (let y = 0; y < h; y++) {
    const dv = ((y + 0.5) / h - region.cy) / Math.max(region.ry, 1e-4);
    for (let x = 0; x < w; x++) {
      const du = ((x + 0.5) / w - region.cx) / Math.max(region.rx, 1e-4);
      const d = Math.sqrt(du * du + dv * dv);
      if (d >= outer) continue;
      const gain = 1 + amount * (1 - smoothstep(inner, outer, d));
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const b = blur[(y * w + x) * 3 + c];
        px[i + c] = b + (src[(y * w + x) * 3 + c] - b) * gain;
      }
    }
  }
}

/**
 * Tuning for the character "presence" treatment (see `toPresenceTexture`).
 * All coordinates are normalized image space, origin top-left.
 *
 * The mask is the product of three falloffs, each of which independently reaches
 * 0 before its own frame edge — so no straight edge of the source art can ever
 * survive, whatever the portrait's proportions:
 *   1. a superellipse that owns left/right (and rounds the corners),
 *   2. a short ramp that dissolves the crown of the head into the scene,
 *   3. a long ramp that trails the torso away below the chest.
 */
const PRESENCE = {
  /** Mask centre — sits on the face / upper chest of a 3:4 portrait crop. */
  cx: 0.45,
  cy: 0.43,
  /* Superellipse half-extents; alpha reaches 0 at exactly ±r from the centre.
   *
   * ASYMMETRIC, and the asymmetry is the fix rather than a tuning nicety. A
   * portrait plate ships with a painted backdrop, and this one's is not empty:
   * the lamp motivating her key is IN it, hard against the left edge, with a
   * wall of mid-value grey around it. At rLeft 0.43 the matte held content out
   * to u≈0.02 — i.e. it kept the entire backdrop, lamp and all — so what the
   * composite showed was a second desk lamp floating in a lighter rectangle of
   * wall, bounded by the only clean curve in the frame. That is the whole of
   * the "curved-glass cutout" note: the arc was never a stroke, it was the
   * silhouette of a pane of someone else's room.
   *
   * 0.34 puts the zero-crossing at u≈0.11, which is outboard of her hand and
   * inboard of that lamp: her side of the plate survives, the other room does
   * not. The right stays generous (0.50) because there is nothing over there
   * but her shoulder and dark, and a shoulder wants room to trail away in.
   */
  rLeft: 0.34,
  rRight: 0.5,
  /** Vertical extents are deliberately generous — the two ramps below own
   *  top and bottom, so the superellipse only rounds the shape there. */
  rTop: 0.58,
  rBottom: 0.95,
  /** Superellipse exponent; slightly over 2 keeps the core a touch squarer. */
  power: 2.1,
  /* ── The feather ──────────────────────────────────────────────────────────
   * 0.92 → 0.78, and the ramp gamma with it.
   *
   * This is the single loudest note the frame came back with, and the geometry
   * says why. The zero-crossing sits at rLeft × plate-width from the centre —
   * ~268px on screen once the plate is drawn at 0.72 of frame height — so a
   * ramp running from d=0.92 to d=1.0 was 21 pixels wide. Twenty-one pixels is
   * not a feather, it is an EDGE, and because the superellipse is a smooth
   * closed curve that edge is a clean arc: a curved-glass cutout with the
   * portrait sitting inside it, which is precisely what the critic named. Both
   * rim bands below then paint their light along it, drawing the arc a second
   * time in amber and a third in teal.
   *
   * A 0.22-wide ramp against the wider radii is ~59px, inside the 40–60px the
   * brief asks for, and it dissolves rather than terminates. rampGamma comes
   * down with it (1.35 → 1.10): a gamma over 1 pulls the whole ramp toward
   * transparent, which concentrates what is left of the transition back into
   * its outer third — i.e. re-sharpens the very thing the width just fixed.
   */
  /* 0.75 → 0.70. The ramp is now ~78px rather than ~59px at the same radii, and
   * the reason is a specific note rather than a general preference: the cutout
   * is still findable at her SWEATER SHOULDER and her FOREARM. Everywhere else
   * on the silhouette the plate dissolves into hair or into dark, both of which
   * hide a transition; a wool shoulder is a large, smooth, mid-value plane, and
   * a mid-value plane terminating over 59px against a near-black room is the one
   * place on this figure where the eye can measure the edge. A quarter more run
   * costs nothing at the crown (the head dissolve owns it) and is the difference
   * between an edge and a falloff on the two contours that were being read. */
  /* 0.70 → 0.83, and the ramp gamma inverts with it (1.10 → 0.90).
   *
   * The note that came back is no longer "a curved cutout" — it is the opposite
   * failure and it is worse: SHE IS SEMI-TRANSPARENT. A 30%-of-radius ramp on
   * the right reaches ~87px inboard of the matte's zero, and the matte's zero on
   * that side sits at u≈0.95 — i.e. off the plate entirely — so the whole outer
   * third of her near shoulder and forearm was printing at alpha 0.4–0.8 over a
   * wall of city bokeh. Every bright disc behind her came through her wool. A
   * critic reads that in one glance and calls it a composite, correctly.
   *
   * The two operators are dosed together because they answer opposite failures.
   * A 17%-of-radius ramp is ~50px on the right and ~35px on the left — still a
   * falloff and not an edge (the note that set 0.70 measured the failure at 21px)
   * — and a gamma UNDER one pulls the ramp toward OPAQUE, so what is left of the
   * transition is spent in its outermost pixels, where the plate has already been
   * crushed by `vignette` and the backdrop falloff. Solid where she is a person,
   * dissolving only where she is already dark. */
  core: 0.83,
  rampGamma: 0.9,
  /** Crown dissolve: alpha 0 at the very top, full by `headStart`. */
  headStart: 0.08,
  headEnd: 0.0,
  /** Torso dissolve: full until `tailStart`, gone by `tailEnd`. */
  tailStart: 0.72,
  tailEnd: 0.84,
  /** Edge darkening, applied as rgb *= 1 - v·(1-a)^g, so the feather sinks into
   *  the scene's depth instead of hazing over it. Kept light on purpose: too
   *  much and the falloff becomes a dark smear over bright backgrounds. */
  /* 0.30 → 0.44, gamma 1.2 → 1.0. The feather is now half as wide (see `core`),
   * so the same darkening has half the area to work in and has to be twice as
   * decided to do the same job: sink the last 50px of plate into the room's own
   * black rather than haze it over the window behind. A linear gamma starts the
   * darkening the moment the alpha does, which is what makes the transition read
   * as a form turning away from the light instead of as a matte running out. */
  vignette: 0.44,
  vignetteGamma: 1,

  /* ── Edge light ───────────────────────────────────────────────────────────
   * The darkening above answers half the question — it stops the feather
   * hazing over the scene — but it leaves the other half open: a dark plate
   * dissolving into a dark scene has no boundary at all, and dark hair against
   * dark foliage reads as a compositing accident rather than as a decision.
   * Nothing about it says "this edge is where the light stopped".
   *
   * So the feather is also LIT. A warm band is added through the middle of the
   * ramp — zero where the plate is solid, zero where it has gone, peaking just
   * inside the edge — which is what a rim light does. It is directional (the
   * key is camera-left in every plate this story ships) and weighted toward the
   * crown, because that is where the dissolve is longest and the merge worst.
   *
   * The result is one consistent, deliberate falloff all the way round: dark
   * outside, warm just inside, plate beyond that.
   */
  /** Alpha at which the rim band opens, peaks, and closes. Tightened from
   *  0.30/0.62/0.94: the band now sits closer in against the solid core, so it
   *  reads as a kicker catching an EDGE rather than as a glow around a shape. */
  rimIn: 0.36,
  rimPeak: 0.66,
  rimOut: 0.95,
  /** Peak strength of the added light, as a fraction of the rim colour.
   *  0.24 → 0.15. Not a retreat: the light budget MOVED. A band that lives in
   *  alpha space paints wherever the matte happens to be dissolving, which is
   *  out in the feather — so at 24% it was drawing a bright arc around her
   *  silhouette and calling it a kicker, and the arc was half of what made the
   *  plate read as a pasted cutout. The lamp's actual work is now done by KEY
   *  below, which lands on her cheek and shoulder because it is weighted by the
   *  plate's own values rather than by its matte. This is left as what it
   *  honestly is: a small warm separation on the outermost lit pixels.
   *  0.10 → 0.13, and only that: the lamp's rim on her hair and shoulder is now
   *  drawn where it belongs — on her actual contour, in screen space, by the
   *  room grade (ui.css → .pq-roomgrade::after layers 10–11) — so this stays
   *  what it is, a hair more of it because the plate around it got 15% lighter
   *  in the midtones and a separation term has to keep pace with its ground. */
  /* 0.13 → 0.095. Both rim bands live in ALPHA space, so halving the ramp's
   * width (see `core`) doubles their density per pixel for free; the note is a
   * "milky haze/halo along her camera-right edge", and a band that just got
   * twice as concentrated is most of it. */
  rimAmt: 0.095,
  /** Floor of the directional weight on the shadow side (camera-right). Pulled
   *  down with the strength, so the extra light lands on the lamp side and the
   *  far side of her stays as dark as the room does. */
  rimDirMin: 0.24,
  /** The light itself — the lamp amber the rest of the grade is struck from. */
  rimR: 232,
  rimG: 164,
  rimB: 92,

  /* ── Cool kicker ──────────────────────────────────────────────────────────
   * One rim is one light, and a figure lit by exactly one light in a room that
   * demonstrably has two is a figure that was lit somewhere else. Behind her is
   * a wall of glass carrying a whole city of teal bokeh; the amber band above
   * cannot account for it, so the outermost pixels of her silhouette — the ones
   * sitting directly against that bokeh — arrive as the only edge in frame with
   * no window in them.
   *
   * So the feather is lit TWICE, in two colours, at two depths:
   *   • this cool band sits just INBOARD of the warm one (0.44–0.96 against
   *     0.36–0.95), hugging the solid edge of the silhouette;
   *   • it is weighted to camera-left, where the pane runs closest past her and
   *     the reduction carries the most transmitted light, and floored (not
   *     zeroed) on the far side so the wrap is continuous around the crown.
   *
   * The hue is the room's own key (#7db4c8) pushed a step cooler and brighter
   * — the same teal the glass, the rain and the split-tone are all struck from,
   * so this is the grade arriving at her edge rather than a second palette.
   *
   * The window was first authored OUTBOARD of the warm one (0.22–0.86), on the
   * reasoning that a distant source wraps furthest round. It printed a grey
   * aura the width of her hair. The reason is worth keeping: at alpha ~0.5 the
   * band is not on her edge at all, it is out in the dissolving backdrop, and
   * a teal lift of 20 units over near-black bokeh is a THREE-FOLD lift — the
   * brightest relative change anywhere in the frame, landing on the one thing
   * that is supposed to be disappearing. Rim light belongs where there is a
   * surface to catch it; past alpha ~0.9 there is one, below ~0.4 there is not.
   */
  rimCoolIn: 0.44,
  rimCoolPeak: 0.7,
  rimCoolOut: 0.96,
  /** Well under the amber, and under its own first draft (0.19): a key names
   *  the light, a kicker only separates, and this one is separating her from a
   *  background that is already almost black. Down again (0.11 → 0.07) for the
   *  same reason the amber came down — over a 59px feather the band has three
   *  times the area it had over a 21px one, so the same amount is three times
   *  as much light, and what it would be lighting is the dissolve. */
  /* 0.045 → 0.024, for the reason rimAmt came down and one more: this is the
   * TEAL band, it sits on the side of her the window is on, and "a milky halo on
   * her camera-right edge" is a literal description of a cool lift painted into
   * a dissolving matte. The separation it buys is real; at a quarter of the
   * ramp's old area it only needs half the level to buy the same amount. */
  /* 0.024 → 0.015. The note names this band twice from opposite directions — "a
   * hard composite seam around her hair and right shoulder" and "add a light
   * wrap to kill the halo" — and both are the same object. A rim that lives in
   * ALPHA space is painted into the dissolving matte, i.e. outboard of her
   * actual contour, so what it draws is not a wrap: it is a bright line tracing
   * the matte's own shape. A wrap is the background bleeding INWARD over the
   * subject; this is the subject bleeding outward over the background, which is
   * the definition of the halo it was being read as. The separation it buys on
   * the crown is real and it does not need this much of it — at ~40% off, the
   * band no longer resolves as a contour of its own against the city bokeh her
   * camera-right edge sits on, which is the one place it was findable. */
  rimCoolAmt: 0.015,
  /** Floor on the camera-right side — the wrap never fully closes. */
  rimCoolDirMin: 0.34,
  rimCoolR: 116,
  rimCoolG: 186,
  rimCoolB: 204,

  /* ── Local contrast ───────────────────────────────────────────────────────
   * The plate is a photograph and the room is a painting, and the difference
   * survives every colour operation in the pipeline: a photograph carries an
   * octave of micro-detail — pore, stray hair, fabric weave — that no painted
   * surface in the frame has anywhere. Graded identically, the two still read
   * as two renderers, and the eye finds the sharper one and calls it pasted.
   *
   * So the plate is unsharp-masked with a NEGATIVE amount: a wide blur is taken
   * of it and 15% of its own detail-over-blur is subtracted back out. Values,
   * edges and silhouette are untouched — only the finest octave comes down,
   * which is precisely the octave the painting does not have. Run once, at
   * load, on the CPU beside the presence mask.
   */
  /* 0.15 → 0.24. The note came back sharper than it went out — not "the plate
   * is a little crisp" but "the woman is a colour-graded photograph inside a
   * painted set", which is a claim about MEDIUM, not about contrast. Fifteen
   * percent of one octave was a hedge; at 24% the pore-and-stray-hair band is
   * genuinely below the painted room's own finest mark, which is the condition
   * for the two to read as one renderer. Form, edge and silhouette are still
   * untouched — this operator cannot move any of them by construction. */
  localContrast: 0.24,
  /** Blur radius as a fraction of plate width; ~1.4% ≈ 8px on a 600px plate,
   *  which is a skin-texture radius rather than a form-shadow one. */
  localRadius: 0.014,

  /* ── Midtones ─────────────────────────────────────────────────────────────
   * Everything above this line is a LIGHT — direction, surface, falloff — and
   * none of it can answer the note that her torso dissolves into the background
   * rather than sitting in front of it, because that note is about EXPOSURE.
   * Her lit planes are keyed, her blacks are correct, and the entire middle of
   * her range — the wool, the collar, the shadow side of the jaw, the forearm —
   * was printing within about four values of the room behind it.
   *
   * So the plate carries a midtone-weighted gain: `1 + midLift·4L(1−L)`, which
   * is exactly +15% at L = 0.5 and exactly zero at both ends. It cannot lift a
   * black (the composited-plate tell this whole block exists to avoid) and it
   * cannot clip a specular; it only opens the range that separation actually
   * lives in. Folded into `shade` below, so the falloffs still own it.
   */
  /* 0.15 → 0.22. The room's own print exposure has just come up half a stop
   * (see Stage → PLATE_FOCUS.midLift), and a figure whose midtones do not move
   * with the room she is standing in loses exactly the separation the room
   * gained: the note is that she sits within ~10 luminance points of her
   * background, and that gap is measured, so both sides of it have to be paid.
   * This is the half that lands on her wool, her collar and the shadow side of
   * her jaw — the band the separation actually lives in — and it still cannot
   * lift a black or clip a specular, which is the whole reason the operator is
   * shaped the way it is. */
  midLift: 0.19,

  /* ── The knit ─────────────────────────────────────────────────────────────
   * `localContrast` above is uniform across the plate, and it has to be: it is
   * removing a photographic OCTAVE, which is everywhere. The sweater needs
   * something else. A knit rendered photographically carries a regular stitch
   * lattice — the single most obviously photographic surface on her, and the
   * one the painted room has no counterpart for anywhere — and knocking the
   * whole plate down far enough to kill it would take her eyes with it.
   *
   * So the region gets its own pass: `crispenRegion` at a negative amount,
   * confined to the torso and feathered to nothing well before her face, which
   * is a painterly edge-softening in the literal sense — it dissolves the marks
   * and leaves the form. Radius is ~4× the skin pass's, because a stitch is a
   * bigger mark than a pore.
   */
  softenAmt: -0.34,
  softenRadius: 0.0075,
  softenCx: 0.5,
  softenCy: 0.78,
  softenRx: 0.52,
  softenRy: 0.3,
  softenSoft: 0.5,

  /* ── Torso falloff ────────────────────────────────────────────────────────
   * The alpha tail above dissolves the bottom of the plate, which is right for
   * her SILHOUETTE and wrong for her VALUE: a lit torso fading to transparent
   * hands the frame a half-present chest with the city bokeh and the rain on
   * the glass showing straight through it, and a critic reads that — correctly
   * — as a compositing seam rather than as a figure sitting in shadow.
   *
   * So the same region is also multiplied toward black, and the darkening
   * leads the dissolve. She falls into the dark first and only then stops
   * being there, which is what a body at the bottom of a night frame does.
   * Runs on the RGB, not the alpha, so nothing about her outline changes. */
  shadeStart: 0.72,
  shadeEnd: 0.88,
  /** How black the bottom goes. 0.92 → 0.76: the band this governs is the same
   *  band the frame came back calling "a murky undefined mass", and the two
   *  halves of that read pulled in opposite directions — the alpha tail was
   *  dissolving her forearm while this was crushing what was left of it to
   *  within two values of the plate behind. What survived was neither a lit
   *  torso nor an absence, which is the only outcome that reads as mush. With
   *  the laptop lid now drawn as an OBJECT in front of her (see ui.css →
   *  .pq-roomgrade::after) there is something for the bottom of her to be
   *  occluded BY, so it no longer has to disappear on its own account, and
   *  0.76 leaves the arm and the near shoulder as forms sitting in shadow. */
  /* 0.76 → 0.66, with the ramp itself moved down two points (0.70/0.86 →
   * 0.72/0.88). The note is that her lower body DISSOLVES into the dark laptop
   * shape rather than being occluded by it, and those are two different pictures:
   * an object in front of a figure has an edge and the figure continues behind
   * it; a figure fading out where an object happens to be has neither. The lid is
   * drawn as a committed silhouette with its own arris (see ui.css →
   * .pq-roomgrade::after layers 1–4), so the occlusion is real and this term no
   * longer has to fake it. At 0.66 the near shoulder and the forearm stay legible
   * FORMS right up to the lid's edge and then stop because something is in front
   * of them, which is the read the whole pass is after. */
  shadeAmt: 0.66,

  /* ── The key ──────────────────────────────────────────────────────────────
   * Both rims above are matte-driven: they can only ever paint where the alpha
   * is between two values, which is a ribbon around her outline. That is a
   * separation device. It is not a LIGHT, and the note the frame came back with
   * — "she is lit neutrally from nowhere" — is a note about light.
   *
   * So the desk practical is finally allowed onto her form. The weight is the
   * product of three things a real key would obey and a matte cannot:
   *   • DIRECTION — full on camera-left, where the lamp is (it is in shot, in
   *     her own plate, at u≈0.10), falling to zero across her by u≈0.61;
   *   • SURFACE — gated on the plate's own luminance, so it lands on the cheek
   *     that is already turned toward the lamp, on the hand at her temple, on
   *     the lit edge of the shoulder, and NOT on the black cardigan. A wash
   *     that ignores this is a colour cast on a photograph; one that obeys it
   *     is light falling on a form;
   *   • PRESENCE — × alpha × the torso falloff, so it cannot light the feather
   *     or the part of her already committed to shadow.
   *
   * Applied as a per-channel GAIN, never an add: a light scales what a surface
   * already reflects. An additive lift of the same size blooms her highlights
   * to paper and, worse, lifts her blacks — which is the exact signature of a
   * badly composited plate.
   *
   * The ratio is a 2700K tungsten source normalised to red (1.00 : 0.67 : 0.36)
   * — the same fixture the room grade's practical is struck from, so the lamp
   * on the desk and the light on her face are demonstrably one bulb.
   *
   * 0.25 → 0.34. The note was that the lamp shade's interior was the brightest
   * value in the frame and her face was not, which is a luminance HIERARCHY
   * failure — the eye goes to the brightest thing and the brightest thing was a
   * prop. It is fixed from both ends, because a face cannot simply be printed
   * brighter without going chalky: the practical comes down 15% at the plate
   * bake (see compressPracticals) and her lit planes come up here. The two
   * moves together are worth about half a stop of separation, which is the
   * amount asked for; either one alone would have been worth an eighth of it
   * and would have cost either her skin or the room's key light.
   */
  /* 0.34 → 0.46, and this is the "the lamp outshines the protagonist" note paid
   * from the subject's side. The previous round fixed the hierarchy by taking
   * the practical DOWN (compressPracticals) and bringing her up an eighth of a
   * stop; the frame came back still reading the shade's interior as the brightest
   * thing in it and her face as merely present. A key is the light that says
   * which object the frame is about, and at 0.34 hers was a wash. At 0.46 her lit
   * cheek, the hand at her temple and the lit edge of the shoulder come up about
   * a third of a stop over the room — she out-reads the lamp, which is the
   * correct hierarchy for a portrait, and the gate above still keeps every bit of
   * it off the black cardigan and out of the existing speculars.
   *
   * …and it lands at 0.40, not the 0.46 the first pass tried, because 0.46 with
   * the old highlight roll printed a BLOWN WRIST: the back of the hand at her
   * temple is the brightest skin plane on the plate, it sits dead centre of the
   * key's direction ramp, and half a stop on top of a plane already near 0.7
   * clips. A key that burns out the one gesture in the frame is not a hierarchy
   * fix, it is a highlight. So the level comes down a step and the ROLL comes up
   * hard (see keyRoll / keyLumRollFrom): the same light budget is redistributed
   * off the lit planes and onto the midtones, which is where separation actually
   * lives and is what the note was about. Net at lum 0.3 — wool, the shadowed
   * cheek, the forearm — is +18% on the old key; net at lum 0.7 is −50%. */
  keyAmt: 0.4,
  keyR: 1.0,
  keyG: 0.67,
  keyB: 0.36,
  /** Direction ramp across the plate, in u−cx. Zero past `keyDirEnd`. */
  keyDirStart: -0.24,
  keyDirEnd: 0.16,
  /** Luminance gate (0..1). Opens on lit planes, and rolls back off at the very
   *  top so an existing specular is not driven into clipping. */
  keyLumIn: 0.1,
  keyLumFull: 0.44,
  /* The shoulder on the key, and it does most of the work now. 0.62/0.95 at 0.55
   *  was a token roll-off — barely 8% off a plane at lum 0.7 — which is why
   *  raising the level at all clipped the brightest skin on the plate. Opened to
   *  0.50/0.88 at 0.74 the key becomes what a key on a photographed subject has
   *  to be: full strength on the form, retired before the specular. */
  keyLumRollFrom: 0.5,
  keyLumRollTo: 0.88,
  keyRoll: 0.74,

  /* ── The monitor ──────────────────────────────────────────────────────────
   * Her frontal soft key had no source. The lamp above accounts for the warm
   * side of her — camera-left, upper, falling off across the cheek — and it
   * accounts for nothing at all about the soft fill on the front of her face,
   * which was simply *there*, at an even level, from a direction the room does
   * not contain. Unmotivated fill is the exact signature of a portrait lit in
   * one place and composited into another, and it is what the frame was being
   * called on.
   *
   * The room already owns the answer and the story insists on it: she is on a
   * call, at a desk, in front of a relay screen — there is a lit panel eighteen
   * inches from her chin at lower screen-left, and it is IN SHOT (the LUMEN
   * RELAY board, painted into the plate). So the fill is given to it.
   *
   * A monitor is not a second key and must not be shaped like one. Three things
   * separate a screen bounce from a lamp, and all three are in the weights:
   *   • it comes from BELOW — spillRise runs zero across the crown and full by
   *     the jaw, so it lights the underside of the chin, the throat and the
   *     near shoulder, which is where anybody sitting at a screen catches it;
   *   • it is DIM and it therefore lives in the MIDTONES and the shadow side. Its
   *     luminance gate opens far lower than the key's (0.06 rather than 0.10)
   *     and then rolls hard back off above 0.45, so it never touches a specular
   *     the lamp already owns. A screen bounce that lands on a highlight is a
   *     colour cast; one that lands on a shadow plane is light;
   *   • it is COOL — the room key #7db4c8 peak-normalised to (0.63, 0.90, 1.00),
   *     the same teal the glass, the rain, the split-tone and the relay board's
   *     own emissive are all struck from. Not a fourth colour in the frame: the
   *     grade, arriving on her face from the object that emits it.
   *
   * Applied as a per-channel GAIN alongside the key, for the same reason the key
   * is — light scales what a surface reflects, and an additive fill lifts blacks,
   * which is precisely the composited-plate tell this whole block exists to kill.
   */
  /* 0.20 → 0.32. Not a change of mind about how loud a screen bounce should be:
   * the EMITTER changed. When this was authored the only motivated cool source
   * in shot was the relay board across the room, and a panel that far away
   * justifies a whisper. The frame now has a laptop lid a foot from her chest
   * with its arris lit and its throw drawn (ui.css → .pq-roomgrade::after
   * layers 1–5), and a source that is visibly there is allowed — is REQUIRED —
   * to be doing visible work. This is the fill that separates her jaw and her
   * hands from the dark, and it is the half of her key the room can point at. */
  /* 0.32 → 0.42. The note names this source explicitly — a motivated key on her
   * face from the laptop screen at below-left, cool against the amber lamp — and
   * asks for it at roughly a stop and a half over ambient. The emitter is in shot
   * with its arris drawn and its throw painted (ui.css → .pq-roomgrade::after
   * layers 1–5); a source that visible is required to be doing visible work. The
   * ratio below is already 5500K-ish against the key's 2700K, so raising the
   * level is the whole of the change: her jaw, her throat and her near shoulder
   * separate from the dark on a light the audience can point at. */
  spillAmt: 0.42,
  spillR: 0.63,
  spillG: 0.9,
  spillB: 1.0,
  /** Direction ramp in u−cx: full at the screen side, gone across her far cheek.
   *  Reaches further left and dies sooner than the key's — the panel is closer,
   *  lower and much weaker than the lamp, so its throw is shorter. */
  spillDirStart: -0.34,
  spillDirEnd: 0.06,
  /** The from-below ramp, in v. Zero at the crown, full by the jaw/shoulder.
   *  0.24/0.56 → 0.18/0.48: the lid sits lower and nearer than the relay board
   *  did, so its throw reaches further up her — onto the underside of the cheek
   *  and the hand at her temple, not merely the collar. */
  spillRiseStart: 0.18,
  spillRiseEnd: 0.48,
  /** Luminance gate — opens in the shadow planes, rolls off before the speculars. */
  spillLumIn: 0.06,
  spillLumFull: 0.3,
  spillLumRollFrom: 0.45,
  spillLumRollTo: 0.85,
  spillRoll: 0.72,

  /* ── Backdrop falloff ─────────────────────────────────────────────────────
   * The matte says where the plate ENDS. It says nothing about what the plate
   * still contains inside it, and what this one contains is a painted room —
   * mid-value wall, a lamp, a corner — which arrives at full strength right up
   * to the ramp and then dissolves. Two rooms in one frame, one of them
   * bounded by a smooth closed curve. Widening the feather softens that
   * boundary; it cannot remove it, because the boundary is a VALUE difference
   * and a feather is an alpha operation.
   *
   * So the plate carries a falloff of its own, keyed on the superellipse
   * DISTANCE rather than on alpha, opening well inside the solid core and
   * reaching most of the way to black by the time the matte starts to go. Her
   * face and torso sit under d≈0.45 and are untouched; everything the eye would
   * read as "her backdrop" is between there and the ramp, and it goes.
   *
   * Directional, because the problem is: the lamp side of this plate holds a
   * lit wall and the far side holds nothing but shadow, so the far side needs a
   * quarter of the treatment. It is also the right optical answer — the light
   * in her plate falls off away from its own source — which is why it can be
   * this strong without reading as a mask.
   */
  /* backdropIn 0.46 → 0.41 and backdropRight 0.34 → 0.52.
   *
   * With the matte now solid out to d = 0.83 (see `core`) this falloff stops
   * being a nicety and becomes the term that pays for it: everything the eye
   * would call "her backdrop" is now printed at full alpha, so the plate's own
   * painted wall has to be taken to the room's black by the operator that knows
   * where it is. The right side is where the note lands — "an ambiguous flat
   * blue patch behind her head" is exactly the plate's painted backdrop arriving
   * at 66% strength over a window — and half is the level at which it reads as
   * the dark side of a room rather than as a second, bluer one. Still well short
   * of the left's 0.72, because that side holds a whole lit wall and this one
   * holds shadow. */
  backdropIn: 0.41,
  backdropOut: 0.95,
  backdropLeft: 0.72,
  backdropRight: 0.52,
} as const;

/* ── Screen props baked into a plate ─────────────────────────────────────────
 *
 * The ops-room plate paints a monitor on the desk and gives it a soft teal
 * smudge for a screen — which is exactly what the art prompt asked for, and
 * exactly what a critic reads as AI mush: the brightest cool object in the left
 * third carries no information, so the eye arrives at it, finds nothing, and
 * leaves. Eliza solves the same shot with a legible prop (the keynote slide is
 * *readable*), and a legible prop is worth more here than anywhere else in the
 * frame, because this one is the fiction's own software.
 *
 * So the call board is PAINTED INTO THE PLATE, once, at load, rather than
 * overlaid in the DOM. That is the whole design decision and it is not
 * incidental: a screen-space overlay is registered to the frame, and the frame
 * is a Ken Burns camera over an overscanned, parallaxing plane — within a few
 * seconds any such overlay has slid off the monitor it belongs to. Baked into
 * the texture it is part of the painting: it parallaxes, it takes the grade, the
 * bloom and the one shared emulsion, and it can never drift by a pixel.
 *
 * The panel is described as a PARALLELOGRAM in plate UV (origin + the screen's
 * own two axes) rather than as a rect, because the monitor is turned a couple of
 * degrees toward camera. Drawing through that basis means the board's type is
 * sheared onto the screen's plane, which is most of what sells it as a surface in
 * the room rather than a sticker on one.
 */
interface PlateScreen {
  /** Top-left corner of the screen's active area, in plate UV. */
  ox: number;
  oy: number;
  /** The screen's own +x axis, as a UV delta across its full width. */
  ux: number;
  uy: number;
  /** …and its +y axis, as a UV delta down its full height. */
  vx: number;
  vy: number;
  /** Authoring space for the board, in design px (kept ≈1:1 with plate px). */
  bw: number;
  bh: number;
}

/** Keyed by background id. A plate with no entry is left exactly as painted. */
const PLATE_SCREENS: Record<string, PlateScreen> = {
  /* RE-MEASURED, and the previous numbers were wrong in both of the ways a
   * projected quad can be wrong.
   *
   * They described the active area as (326,534) → (506,526) → (523,671): a
   * 180 × 146 panel whose top edge RISES eight pixels to the right. The monitor
   * in ops_room.png is turned the other way. Its glass runs (337,487) →
   * (610,501) → (625,688) → (356,680) — 273 × 193, with the top edge FALLING
   * fourteen pixels to the right, because the screen is angled toward camera-
   * left and we are looking at it from camera-right. So the board was sheared
   * against the plane it is supposed to be lying on: every row of type ran a
   * couple of degrees off the bezel it sits inside, which is the whole of the
   * "the readout sits flat and frontal against a screen plane that is angled"
   * note — the shear was present, it was simply pointing the wrong way, and a
   * wrong shear reads worse than none because the eye has the bezel right there
   * to compare it against.
   *
   * And it covered barely half the glass: a 180 × 146 panel with a nearly-opaque
   * ground inside a 273 × 193 screen printed a hard-edged rectangle of UI
   * floating in the middle of a bigger lit rectangle, i.e. a sticker on a
   * monitor rather than a monitor. The quad below is the measured glass inset by
   * one bezel margin (2.5% across, 3% down) so the board fills its screen the
   * way a running application does, and `bw`/`bh` stay ≈1:1 with plate px so the
   * type keeps the absolute size it was tuned at.
   */
  ops_room: {
    ox: 0.179372,
    oy: 0.456608,
    ux: 0.135079,
    uy: 0.012051,
    vx: 0.009302,
    vy: 0.167982,
    bw: 260,
    bh: 182,
  },
};

/* ── What is on THIS side of the glass ───────────────────────────────────────
 *
 * The weather rig draws rain, rivulets, a sheet and a mullion, and every one of
 * those belongs to a plane the camera is BEHIND. The ops room puts a desk, a
 * task lamp, a monitor, a mug and a headset between the lens and that plane,
 * and until now the rig had no way to know: streaks fell across the lamp's own
 * shade, rivulets tracked down the monitor bezel, and the frame's loudest note
 * ("unmotivated rain over the whole picture") was the direct consequence.
 *
 * A figure can be projected every frame because it is an object in the scene
 * graph. Furniture cannot — it is paint on a plate — so it is DECLARED here,
 * beside the plate's other authored geometry, in the framed screen (0..1, y-up)
 * the light field is already sampled in. Ellipses only: a rectangle of "no
 * rain" has corners, and a corner in a weather field is a matte.
 *
 * The numbers are measured off a 1920×1080 capture of the framed plate, not off
 * the texture — the plate is drawn at 1.3× overscan and slid by the framing
 * bias, so texture coordinates and screen coordinates are two different things
 * here (see computeFraming).
 */
interface InteriorSpec {
  lobes: ReadonlyArray<{ cx: number; cy: number; rx: number; ry: number; soft: number }>;
  amount: number;
}

const PLATE_INTERIORS: Record<string, InteriorSpec> = {
  ops_room: {
    lobes: [
      // The desk vignette: lamp, shade, monitor, mug, headset and the desktop
      // they sit on. Screen x 60→700, y 320→890 at 1920×1080.
      //
      // rx 0.24 → 0.27 and ry 0.32 → 0.36. The note is that streaks still render
      // over the interior desk area, and the geometry says where: at the old
      // radii this lobe reached x≈0.44 only at its own centre height, so between
      // y≈0.55 and y≈0.75 (y-up) — the band that holds the top of the monitor,
      // the lamp's arm and the wall behind them — the fence had a gap the width
      // of two bays. A drop crossing a lamp arm is the same error as a drop
      // crossing the shade, one object over.
      { cx: 0.19, cy: 0.44, rx: 0.27, ry: 0.36, soft: 0.34 },
      // The floor. Wide and flat and hung off the bottom edge, so the whole
      // band below the horizon is room rather than window — the rig used to
      // rain onto the carpet, which is the same error one storey down. The
      // glass/floor junction sits at y≈740 (0.315 y-up), so the ellipse is
      // centred low enough to be at full strength by the time it is under the
      // desk line and to release into nothing at the junction itself: a streak
      // on the far pane that dies where the floor begins is exactly what a
      // window in a lit room does.
      { cx: 0.5, cy: 0.02, rx: 0.9, ry: 0.3, soft: 0.35 },
      // The OPERATOR'S CHAIR, re-measured a second time and this time off the
      // establishing frame rather than the dialogue one.
      //
      // The previous numbers (cx 0.489, cy 0.435, rx 0.075, ry 0.115) described a
      // chair the size of a mug at the height of the desk lamp. The mass the
      // plate actually paints in the centre of the empty composition runs screen
      // x 875→1245, y 612→1005 at 1920×1080 — i.e. x 0.456→0.649, y-up
      // 0.069→0.433 — nearly four times the area and 150px lower. Everything
      // above the floor lobe's own shoulder (y-up ≳ 0.30) was therefore
      // unfenced, which is precisely the band the critic names: streaks falling
      // down the crown and the shoulders of a chair that is on the camera's side
      // of the window.
      //
      // A chair back is also not an ellipse-shaped hole in the weather, it is a
      // padded rectangle with rounded corners; the lobe is sized to the object's
      // INSCRIBED ellipse plus its shoulder, so the fence is at full strength
      // across the mass and releases in the bay either side of it rather than
      // cutting a shape out of the rain.
      //
      // The shoulder is also pulled in, 0.40 → 0.28. Every other lobe on this
      // plate fences a soft object against a soft ground and wants the long
      // release; this one fences the single largest opaque mass in the frame,
      // and at a 0.40 shoulder the fence was only reaching ~85% over the crown —
      // i.e. a sixth of the field was still falling down it, which at this
      // field's exposure is exactly the "streaks visibly cross the office chair"
      // note. 0.28 still spends 63px of frame on the transition, so there is no
      // edge for the eye to find; it simply reaches full strength on the object
      // instead of just short of it.
      { cx: 0.552, cy: 0.235, rx: 0.118, ry: 0.225, soft: 0.28 },
      // The wall and ceiling ABOVE the desk. This is the one the first pass
      // missed and it is the most visible of the four: two streaks were falling
      // down a flat dark partition at x≈0.08 and x≈0.15, well clear of any
      // window, and a raindrop over an interior wall is the single most
      // literal version of the note. The window wall does not begin until
      // x≈0.36, so the lobe can be generous.
      // …widened with the desk lobe, and for the same reason: at rx 0.28 / ry
      // 0.30 the wall's cover ran out at x≈0.40 and, at the very top of frame,
      // sooner than that. The window wall does not begin until x≈0.36 at any
      // height, so there is nothing to lose out there and a gap to close.
      { cx: 0.11, cy: 0.82, rx: 0.31, ry: 0.34, soft: 0.42 },
    ],
    amount: 1,
  },
};

/* ── …and where the glass IS ─────────────────────────────────────────────────
 *
 * The interior spec above is the SUBTRACTIVE half of the statement: name every
 * prop between the lens and the pane and take the weather off it. Four soft
 * ellipses cannot spell "window", though, and the frame kept proving it — the
 * complement of a union of ellipses leaks between them, above them and past
 * their shoulders, and every leak printed as a vertical streak standing on a
 * concrete wall, a desk edge or a chair back. Read at a glance that is the
 * screen-space-overlay tell in its purest form, and no amount of extra ellipses
 * fixes it, because the problem is that the description is inside-out.
 *
 * So the window wall is declared POSITIVELY, once, as the rectangle of frame it
 * occupies, with a long shoulder on each side (a hard boundary in a weather
 * field is a matte — the same rule the ellipses live by). Outside it there is no
 * weather at all: not thinned, absent. See weather.ts → setPaneMask and
 * LIGHTFIELD_GLSL → pqPane.
 *
 * Measured off a framed 1920×1080 capture, like everything else in this file:
 * the concrete partition runs out at x≈760 (0.396) and the glass runs from there
 * to the frame edge; the glass/floor junction sits at y≈745, i.e. y-up 0.310.
 * Both extents are pushed a little past the frame so the shoulder is spent
 * outside the picture rather than inside it.
 */
const PLATE_PANES: Record<string, PaneSpec> = {
  // …and x0 lands at 0.425, not the 0.396 the partition's own silhouette
  // suggests. The concrete runs out at 0.396 and the near partition MEMBER —
  // its lit leading edge, its body and the catch on its far side (see ui.css →
  // .pq-roomgrade::before, layer 0a) — occupies 0.4135 to 0.429. That member is
  // interior: it is the jamb the glass is set into, on the camera's side of the
  // sheet. Starting the pane at the concrete put the first two centimetres of
  // weather on the frame rather than in it, which is the same error one object
  // in from the one this matte exists to fix.
  ops_room: { x0: 0.425, y0: 0.31, x1: 1.06, y1: 1.08, softX: 0.05, softY: 0.055 },
};

/* ── …and where the glass is, PER PLATE, with a vertical extent ──────────────
 *
 * The pane matte above is one rectangle and it is authored for one background.
 * Every other plate in the story is a window too — and every one of them has a
 * different amount of room in front of it — so a rig that knows the geometry of
 * exactly one of them will rain down the front of the other three. That is what
 * this map is: the same statement, made once per background, in the shape the
 * statement actually needs.
 *
 * Two things it can say that a single rect cannot:
 *
 *   • TWO RANGES. A wall of glass with a wooden mullion across it, or with a
 *     task chair standing in the middle of it, is two runs of glass and one
 *     obstruction — not one run. Ellipses were tried on exactly this problem and
 *     the frames came back with the same note four times, because subtracting
 *     round holes from a rectangle leaks at every gap between them.
 *   • A SILL PER RANGE. The ops room's window goes to the floor out in the
 *     outboard bay and stops at a chair's crown in the middle of frame. The
 *     upper range therefore ends at the crown and the lower one runs on to the
 *     floor line, so the field terminates in mid-air only where an object is
 *     standing in it. A rain field that ends on a horizontal everywhere at once
 *     is a layer; one that ends where a chair is is occlusion.
 *
 * EVERY NUMBER HERE WAS MEASURED, not chosen, off a framed 1920×1080 capture of
 * each plate as the stage actually composes it — the plate is drawn at 1.3×
 * overscan and slid by the framing bias, so texture coordinates and screen
 * coordinates are two different things (see computeFraming). The feathers are
 * then set so the mask reaches exactly ZERO on the near face of whatever solid
 * object bounds the range; each range below records that clearance.
 */
const PLATE_RAIN_WINDOWS: Record<string, RainWindowSpec> = {
  /* THE OPS ROOM. Left to right: concrete out to x 0.396, the jamb the glass is
   * set into from 0.4135 to 0.429, then a wall of window to the frame edge. The
   * task chair sits in that window — its crown peaks at y 0.437 and its widest
   * point (y 0.30) reaches x 0.630 — and it is the object every previous round
   * failed on, because it is opaque, it is the largest mass in the middle third,
   * and a bright vertical crossing it is the loudest possible statement that the
   * weather layer and the room were never in the same space.
   *
   *   A — the window wall ABOVE the chair. x0 0.462 − 0.032 = 0.430, i.e. the
   *       mask is arithmetically zero on the outer face of the jamb (0.429), so
   *       nothing lands on the frame member, the partition or anything left of
   *       it. y0 0.492 − 0.045 = 0.447, ten pixels clear above the chair's crown
   *       (0.437).
   *   B — the OUTBOARD BAY, right of the chair, which is where the glass really
   *       does run to the floor. x0 0.678 − 0.032 = 0.646, clear of the chair's
   *       widest point (0.630); y0 0.305 − 0.045 = 0.260, i.e. it dies into the
   *       glass/floor junction at y≈0.31 rather than continuing onto the carpet.
   *
   * The union is the picture: rain across the whole upper window wall, running
   * on down to the sill only outboard of the chair. */
  ops_room: {
    ranges: [
      { x0: 0.462, x1: 1, y0: 0.492, y1: 1 },
      { x0: 0.678, x1: 1, y0: 0.305, y1: 1 },
    ],
    softX: 0.032,
    softY: 0.045,
  },
  /* WINDOW_RAIN. Framed, this plate is very nearly all glass: the interior
   * reveal and the lamp behind it are cropped down to a black strip at the far
   * left that runs out at x≈0.145. One range, no sill — the pane genuinely
   * continues to the bottom of the frame on the right, and the dark building
   * mass down there is on the far side of it. x0 0.185 − 0.035 = 0.150. */
  window_rain: {
    ranges: [{ x0: 0.185, x1: 1, y0: 0, y1: 1 }],
    softX: 0.035,
    softY: 0.04,
  },
  /* WINDOW_DAWN. A sash window, so this is the two-range case in its purest
   * form: a narrow left light, a wide timber mullion, then the main glass.
   *   A — the left light, x 0.055→0.148 measured, y 0.20→top (the painted sill
   *       under it runs at y≈0.17). Authored 0.082→0.122 so that with a 0.028
   *       feather the mask is zero at 0.054 and again at 0.150 — the sash's own
   *       two edges — and never touches the timber.
   *   B — the main glass, x0 0.328 − 0.028 = 0.300, which is the inboard face of
   *       the mullion (0.298). */
  window_dawn: {
    ranges: [
      { x0: 0.082, x1: 0.122, y0: 0.2, y1: 1 },
      { x0: 0.328, x1: 1, y0: 0, y1: 1 },
    ],
    softX: 0.028,
    softY: 0.04,
  },
  /* MEMORY_ATRIUM. Authored defensively: the story sets `@weather none` here, so
   * nothing draws today — but the plate had no pane entry at all, which means
   * the instant anything ever does, it rains on the bookcases, the reading
   * tables and the floor of a daylit library. A clerestory band across the top
   * (x 0.03→0.78, above y 0.66) and the tall window behind the near stacks
   * (x 0.29→0.49, y 0.18→0.58) are the only glass in frame; the right third is
   * wall, a plant and a picture. */
  memory_atrium: {
    ranges: [
      { x0: 0.03, x1: 0.78, y0: 0.66, y1: 1 },
      { x0: 0.29, x1: 0.49, y0: 0.18, y1: 0.58 },
    ],
    softX: 0.035,
    softY: 0.04,
  },
};

/* ── Where the lens is focused ───────────────────────────────────────────────
 *
 * See PostFX.setFieldFocus. One ellipse per plate around the thing the camera
 * is actually on — for the ops room the desk vignette, which is both the
 * nearest object and the only lit one — plus how far out of focus the far edge
 * is allowed to go, in UV (0.0042 ≈ 8px at 1920).
 *
 * `bridge` is the shadow-family unifier in the same grade (see uShadowBridge):
 * how hard the band of ungraded murk between the warm pool and the teal city is
 * pulled into the window's own shadow hue.
 *
 * `midLift` is the plate's PRINT EXPOSURE (see uMidLift): a midtone-weighted
 * gain that is zero at the black floor and zero again before the practicals.
 * It lives here rather than in the theme grade because it is a property of the
 * PLATE, not of the story — the same grade has to serve a night interior that
 * prints a stop and a half down and a daylit reading room that prints hot.
 */
interface FocusSpec {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  blur: number;
  bridge: number;
  midLift: number;
}

const PLATE_FOCUS: Record<string, FocusSpec> = {
  /* midLift 0.45 ≈ +0.54 stop through the shadow-to-low-midtone band.
   *
   * The note is a thumbnail test and the plate failed it: at 480px wide the ops
   * room read as a lamp and a black rectangle rather than as a woman at a desk,
   * because everything between the practical's pool and the black floor — the
   * desk's front face, the partition, the chair, the wall, the shadow side of
   * her jaw — was printing within a handful of code values of the floor itself.
   * Half a stop into that band is what buys back the midground; the shoulder
   * above still holds the lamp off the ceiling and the floor below is untouched,
   * so the range gets wider rather than merely brighter. */
  ops_room: { cx: 0.2, cy: 0.42, rx: 0.2, ry: 0.28, blur: 0.0042, bridge: 0.34, midLift: 0.45 },
  // A deep-focus daylit reading room: nothing to rack away from, its murk is
  // warm rather than green, and its failure mode is an over-lit centre — so all
  // three instruments are retired here.
  memory_atrium: { cx: 0.5, cy: 0.5, rx: 1, ry: 1, blur: 0, bridge: 0, midLift: 0 },
};

/** The board's three queue rows: line id, state, and whether the state is warm. */
const CALL_ROWS: ReadonlyArray<readonly [string, string, boolean]> = [
  ['04-11', 'HOLD', true],
  ['04-12', 'OPEN', false],
  ['04-07', 'CLEAR', false],
];

/**
 * Paint the relay's call board onto a plate, through the screen's own basis.
 *
 * Kept deliberately sparse — a header, three queue rows and a vocal trace. Every
 * string is short, real and set at 12 design px ≈ 16 screen px at 1920, which is
 * the floor at which type baked into a plate survives the 1.3× overscan, the
 * bloom and the emulsion still looking *set* rather than approximated. Garbled
 * in-image text is a hard fail on the rubric; the answer to that is fewer, larger
 * words, not smaller ones.
 *
 * Emissive level is low by construction and was MEASURED, not guessed: the first
 * pass set the header ink at 24% and the finished frame put it at 28% luma — a
 * hair brighter than the lamp-lit desk beside it, i.e. a *primary* focal point,
 * which is exactly the wrong answer. Every alpha below was that pass scaled by
 * ~0.58, landing the brightest glyph near 16% against the desk's 25%.
 *
 * EMISSIVE then puts most of that back, and the arithmetic that made 0.58 right
 * is exactly what makes 1.9 right now. The board was never too bright in
 * absolute terms; it was too bright RELATIVE to a desk that has since been
 * opened up by two thirds of a stop (see the room grade's spill windows). At
 * 0.58 × 1.9 ≈ 1.1 the brightest glyph lands near 30% against the desk's new
 * ~38%: still the second thing you look at, and now actually readable at a
 * glance instead of a cool smudge in an underexposed corner — which is what a
 * left half needs to counterweight a lit portrait. The base stays only three
 * quarters opaque so the painting's own backlight glows through and reads as
 * the board's own backlight.
 */
const EMISSIVE = 1.9;

function drawCallBoard(ctx: CanvasRenderingContext2D, s: PlateScreen, w: number, h: number): void {
  const { bw, bh } = s;
  const ink = (a: number): string => `rgba(186, 236, 248, ${a * EMISSIVE})`;
  const warm = (a: number): string => `rgba(238, 178, 112, ${a * EMISSIVE})`;
  /* The board's two edges and its type scale, expressed against `bw`/`bh` rather
   * than as the constants they used to be — the panel grew from 180 × 146 to
   * 260 × 182 when the screen quad was re-measured (see PLATE_SCREENS), and a
   * layout pinned to absolute px inside a box that changed size is a layout that
   * hugs one corner. Margins are ~5% of the panel, which is what a full-screen
   * terminal actually leaves. */
  const PAD = Math.round(bw * 0.05);
  const GUTTER = Math.round(bw * 0.05);
  const right = bw - GUTTER;

  ctx.save();
  ctx.setTransform(
    (s.ux * w) / bw,
    (s.uy * h) / bw,
    (s.vx * w) / bh,
    (s.vy * h) / bh,
    s.ox * w,
    s.oy * h,
  );
  ctx.beginPath();
  ctx.rect(0, 0, bw, bh);
  ctx.clip();

  // 1 — the panel ground. Not opaque: what shows through is the glow the painter
  // already put on this screen, which is now reading as the board's backlight
  // instead of as an absence of content.
  //
  // …but very nearly. This gradient is the fix for the frame's "amorphous glare
  // blob" note, and it is a deliberate walk toward opacity: 0.82/0.74/0.60 →
  // 0.90/0.89/0.92. The painting puts a soft unshaped flare across this monitor,
  // and at 60% transmission on the bottom band it was landing squarely on the
  // vocal trace — the one instrument on this board with fine structure in it.
  // Half the strokes dissolved into it, and a waveform that is legible for
  // thirteen bars and a smear for the other thirteen does not read as glare, it
  // reads as the renderer failing.
  //
  // The remaining ~10% still carries the painter's own backlight (which is the
  // reason this was never opaque), and the board supplies the rest of its glow
  // itself, from its own radial. The reflection is not deleted — it is moved to
  // where the geometry actually puts it and given an EDGE. See step 5.
  /* …and it comes back DOWN two points, 0.90/0.89/0.92 → 0.88/0.87/0.90, because
   * the panel now covers the whole screen rather than its middle: at the old
   * transmission a full-bleed ground erased the painter's teal bloom entirely and
   * left the monitor a flat dark slab. Two points is nothing on the type and is
   * the difference between a lit display and a switched-off one at the corners. */
  const ground = ctx.createLinearGradient(0, 0, 0, bh);
  ground.addColorStop(0, 'rgba(7, 21, 26, 0.88)');
  ground.addColorStop(0.6, 'rgba(6, 17, 22, 0.87)');
  ground.addColorStop(1, 'rgba(5, 13, 17, 0.9)');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, bw, bh);

  /* The backlight, RE-REGISTERED onto the bloom the painting already puts on this
   * glass (screen-space ~0.52, 0.56 of the panel) instead of hanging off its
   * lower-right corner, so the board's own emission and the plate's agree about
   * where the tube is brightest. Opened a step to carry the light the ground
   * above no longer lets through. */
  const gx = bw * 0.52;
  const gy = bh * 0.56;
  const glow = ctx.createRadialGradient(gx, gy, 2, gx, gy, bw * 0.62);
  glow.addColorStop(0, 'rgba(104, 204, 218, 0.3)');
  glow.addColorStop(0.42, 'rgba(72, 162, 180, 0.11)');
  glow.addColorStop(1, 'rgba(40, 110, 128, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, bw, bh);

  /* 1b — THE PHOSPHOR. A scanline field, drawn on the ground and UNDER the type.
   *
   * The board's failure was named as "soft, column-misaligned" — i.e. it reads as
   * an image of a UI rather than as a UI. Half of that is the type (see the glow
   * split below) and half is that the panel had no SURFACE: a flat gradient with
   * words on it is a poster, and the one thing every lit display in a photograph
   * has and no poster does is a line structure. Three design px of pitch is ~4
   * screen px through the 1.3× overscan — coarse enough to survive the plate
   * upscale, fine enough that it never resolves into stripes — and it is drawn
   * beneath the glyphs on purpose: a scanline over 12px type eats the counters.
   *
   * Under 5%: it must be felt as a texture on the panel, never seen as an effect.
   */
  for (let y = 1.5; y < bh; y += 3) {
    ctx.fillStyle = 'rgba(2, 9, 12, 0.30)';
    ctx.fillRect(0, y, bw, 1);
  }

  ctx.textBaseline = 'alphabetic';
  const styled = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  styled.letterSpacing = '0.05em';
  // 12 → 13. `bw` is still ≈1:1 with plate px, so this is one plate pixel of cap
  // height bought back on a panel that grew 44% wider — the type holds the same
  // share of the screen it was tuned to, rather than shrinking inside it.
  ctx.font = '13px "JetBrains Mono", ui-monospace, monospace';

  /* ── Type: two passes, and this is the fix for "soft" ──────────────────────
   *
   * There used to be one pass, drawn with `shadowBlur = 8` on. A canvas shadow
   * does not add a halo around a crisp glyph; it draws a BLURRED COPY of the
   * glyph and the glyph on top of it in the same operation, at the same alpha —
   * so at 8px of blur on a 12px face, most of what the eye integrates on a
   * two-pixel stroke IS the blur. The board was therefore emitting its own
   * softness, and then being upscaled 1.3× by the plate's overscan on top of
   * that. Nothing downstream could recover it.
   *
   * Split in two. The GLOW pass draws every mark at a third of its alpha with the
   * scatter on — that is the light the panel throws into the glass in front of it,
   * and it is a property of the room. The CRISP pass then draws the identical
   * marks at full alpha with the shadow switched off, so the glyph's own edge is
   * exactly as the rasteriser cut it. Same total emission, all of the halo, none
   * of the mush.
   *
   * `column` is the second half of the note. The header label sat at x=9 and the
   * queue ids at x=19, i.e. the panel had two different left margins nine pixels
   * apart with a tick column running between them — which at this scale reads as
   * exactly what the critic called it, a misaligned column. Everything textual
   * now hangs off ONE content margin at 19 with the 10px tick gutter to its left,
   * and everything on the right tab hangs off `right`. Two edges, no exceptions.
   */
  const COL = PAD + 13;
  /** Title-bar depth, row pitch and the two horizontal rules, all off `bh`. */
  const BAR = Math.round(bh * 0.165);
  const ROW0 = BAR + Math.round(bh * 0.165);
  const PITCH = Math.round(bh * 0.154);
  const paint = (pass: 0 | 1): void => {
    const a = pass === 0 ? 0.34 : 1;
    if (pass === 0) {
      ctx.shadowColor = 'rgba(126, 208, 226, 0.5)';
      ctx.shadowBlur = 7;
    } else {
      ctx.shadowBlur = 0;
    }

    // 2 — title bar. A gradient, not a flat slab: a solid lighter rectangle
    // across the full width is the one shape on this board that would read as an
    // HTML header rather than as a lit row on a screen. Drawn on the crisp pass
    // only — a soft copy of a 24px-tall wash buys nothing and fogs the glyphs.
    if (pass === 1) {
      const bar = ctx.createLinearGradient(0, 0, bw, 0);
      bar.addColorStop(0, ink(0.05));
      bar.addColorStop(0.7, ink(0.028));
      bar.addColorStop(1, ink(0.014));
      ctx.fillStyle = bar;
      ctx.fillRect(0, 0, bw, BAR);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = ink(0.14 * a);
    ctx.fillText('LUMEN RELAY', COL, BAR - 10);
    ctx.textAlign = 'right';
    ctx.fillStyle = ink(0.115 * a);
    ctx.fillText('04', right, BAR - 10);
    ctx.fillStyle = ink(0.095 * a);
    ctx.fillRect(0, BAR, bw, 1);

    // 3 — the queue. A tick in the gutter, the line id on the content margin,
    // its state on the right tab.
    CALL_ROWS.forEach(([id, state, hot], i) => {
      const y = ROW0 + i * PITCH;
      ctx.fillStyle = hot ? warm(0.2 * a) : ink((i === 1 ? 0.15 : 0.07) * a);
      ctx.fillRect(PAD, y - 9, 3, 11);
      ctx.textAlign = 'left';
      ctx.fillStyle = ink(0.128 * a);
      ctx.fillText(id, COL, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = hot ? warm(0.175 * a) : ink((i === 1 ? 0.14 : 0.076) * a);
      ctx.fillText(state, right, y);
      if (i < CALL_ROWS.length - 1 && pass === 1) {
        ctx.fillStyle = ink(0.03);
        ctx.fillRect(COL, y + PITCH - 19, right - COL, 1);
      }
    });
  };
  paint(0);
  paint(1);
  ctx.shadowColor = 'rgba(126, 208, 226, 0.5)';
  ctx.shadowBlur = 7;

  const TRACE_RULE = ROW0 + (CALL_ROWS.length - 1) * PITCH + Math.round(bh * 0.11);
  ctx.fillStyle = ink(0.07);
  ctx.fillRect(0, TRACE_RULE, bw, 1);

  // 4 — the vocal trace, the same instrument the relay panel carries in the
  // corner, so the two pieces of UI in this frame are demonstrably one product.
  // Deterministic, and shaped like speech: syllable bursts inside a breath.
  // Born on the same content margin as the queue ids above it: the trace used to
  // start at x=9, in the tick gutter, so the panel's one wide instrument was the
  // only element not hanging off either of the board's two edges.
  const x0 = COL;
  const span = right - x0;
  // Centred in whatever the rule above left, and sampled at a fixed ~6.5px pitch
  // rather than at a fixed count, so a wider panel gets MORE of the same trace
  // instead of the same trace stretched — a waveform whose sample spacing tracks
  // the box it is in is a picture of a waveform.
  const mid = Math.round((TRACE_RULE + bh) / 2);
  const amp0 = Math.min(18, (bh - mid) * 0.8);
  const bars = Math.max(12, Math.round(span / 6.5));
  for (let i = 0; i < bars; i++) {
    const t = i / (bars - 1);
    const env = Math.sin(Math.PI * Math.min(1, t * 1.1)) ** 0.85;
    const syl = 0.3 + 0.7 * Math.abs(Math.sin(i * 0.63 + 0.4)) * (0.55 + 0.45 * Math.sin(i * 0.28 + 1.9));
    const amp = Math.max(0.06, env * syl) * amp0;
    ctx.fillStyle = ink(0.058 + 0.082 * (amp / amp0));
    ctx.fillRect(x0 + t * (span - 2), mid - amp, 2, amp * 2);
  }

  // 5 — the lamp, reflected in the panel glass. A SHAPE, not a haze.
  //
  // There is a shaded desk lamp two feet to the left of this monitor and it is
  // in shot, so the screen must show it — a lit panel with no reflection on it
  // is the flattest object a night interior can contain. What it must NOT show
  // is what it was showing: a soft amorphous bloom with no boundary, spread
  // across the lower half and eating the vocal trace. Read at a glance that is
  // not a reflection, it is a rendering smear, and the difference between the
  // two is entirely the EDGE.
  //
  // So the reflection is drawn as the object it is a reflection of: the shade's
  // elliptical mouth, seen at a rake, as a narrow parallelogram with a hard
  // leading edge and a short falloff behind it. It is put in the upper-left
  // corner — the corner nearest the lamp, which is where the geometry actually
  // puts it, and the one region of this board with no type in it. Kept under
  // 6% so it never competes with the queue rows it passes beside.
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.beginPath();
  // The sliver: leading edge crisp on the lamp side, trailing edge released.
  // Expressed against the panel so it survives the box re-measure — the shade is
  // a fixed distance from the glass, so its reflection scales with the glass.
  ctx.moveTo(-0.022 * bw, 0.205 * bh);
  ctx.lineTo(0.189 * bw, -0.041 * bh);
  ctx.lineTo(0.289 * bw, -0.041 * bh);
  ctx.lineTo(-0.022 * bw, 0.322 * bh);
  ctx.closePath();
  ctx.clip();
  const flare = ctx.createLinearGradient(-0.022 * bw, 0.205 * bh, 0.256 * bw, -0.027 * bh);
  flare.addColorStop(0, 'rgba(246, 206, 150, 0.0)');
  flare.addColorStop(0.42, 'rgba(246, 206, 150, 0.055)');
  flare.addColorStop(1, 'rgba(246, 206, 150, 0.012)');
  ctx.fillStyle = flare;
  ctx.fillRect(-8, -8, bw + 16, bh + 16);
  ctx.restore();

  ctx.restore();
}

/* ── The practical's shoulder ────────────────────────────────────────────────
 *
 * The interior of the lamp shade was the brightest value in the frame, and the
 * speaker's face was not. That is a luminance HIERARCHY failure and it is worth
 * more than it sounds: the eye lands on the brightest thing first and holds
 * there, so every frame opened on a prop in the left third and had to be
 * actively dragged back to the person the scene is about.
 *
 * The fix belongs on the PLATE, not in the composite grade, and the distinction
 * is the whole design of this function. GRADE_FRAGMENT already carries a print
 * shoulder; tightening it would have knocked the lamp down and taken her lit
 * cheek with it, because the grade sees one image and cannot tell a practical
 * from a face. Baked into the background plate at load, the compression can only
 * ever touch the painted room — the portrait plate is a separate texture on a
 * separate plane and never passes through here at all. So the lamp comes down
 * and the face does not.
 *
 * Shaped as an exponential shoulder rather than a clip, for the same reason the
 * grade's is: a clip flattens a falloff into a slab, which is the thing that
 * made the shade read as a blown JPEG in the first place. KNEE 0.62 / CEIL 0.90
 * is deliberately a very high knee — at L = 0.70 (the lamp-lit desk pool) it
 * takes 1.5%, i.e. nothing; at L = 0.85 it takes 9%; at L = 1.0, which is the
 * shade's interior and essentially nothing else in this painting, it takes 17%.
 * The brief asked for ~15% off the hotspot and no cost anywhere else, and a
 * shoulder is the only instrument that can bill exactly the top of the range.
 *
 * Applied as a RATIO across the three channels, never per-channel — a
 * per-channel knee compresses whichever channel is highest and therefore walks
 * a tungsten highlight toward white, which is precisely backwards for a shade
 * that should be going amber as it falls off. What it pulls down it also warms
 * by the amount it pulled, on the same discipline.
 */
const PRACTICAL_KNEE = 0.62;
const PRACTICAL_CEIL = 0.9;

/**
 * The plate's near, sharp half — the region `crispenRegion` bites on, in the
 * plate's OWN uv (y down), plus how hard and at what radius.
 *
 * 4px at 1920 is an EDGE radius, not a form-shadow one: it crispens the lamp
 * rim, the mug lip, the headset band and the monitor bezel and leaves the
 * lighting on the desktop exactly as painted. 0.34 is the point at which those
 * edges read as decided against the newly-resolved city behind them without the
 * halo an unsharp mask starts printing past about 0.45.
 */
const PLATE_CRISP: Record<
  string,
  { amount: number; radius: number; cx: number; cy: number; rx: number; ry: number; soft: number }
> = {
  ops_room: { amount: 0.34, radius: 0.0021, cx: 0.175, cy: 0.62, rx: 0.19, ry: 0.27, soft: 0.35 },
};

function compressPracticals(px: Uint8ClampedArray): void {
  const span = PRACTICAL_CEIL - PRACTICAL_KNEE;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i] / 255;
    const g = px[i + 1] / 255;
    const b = px[i + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (l <= PRACTICAL_KNEE) continue;
    const rolled = PRACTICAL_KNEE + span * (1 - Math.exp(-(l - PRACTICAL_KNEE) / span));
    const k = rolled / l;
    // …and the warmth it owes back, scaled by how far it was pulled.
    const warm = 1 - k;
    px[i] = Math.min(255, r * k * (1 + warm * 0.06) * 255);
    px[i + 1] = Math.min(255, g * k * (1 - warm * 0.01) * 255);
    px[i + 2] = Math.min(255, b * k * (1 - warm * 0.12) * 255);
  }
}

/**
 * Re-bake a background plate, once, at load: its practicals are given a print
 * shoulder (see compressPracticals) and, where the plate declares one, its
 * screen prop is painted on (see drawCallBoard).
 *
 * Order is load-bearing. The shoulder runs on the PAINTING only; the call board
 * is drawn afterwards because it is an emissive UI element with its own measured
 * levels, and compressing it would undo the exposure it was tuned to.
 *
 * Returns the source texture untouched whenever the pixels can't be read (no 2D
 * context, a tainted cross-origin canvas) — the stage must never fail to draw
 * because a prop could not be painted.
 */
function paintPlateScreen(id: string, src: THREE.Texture): THREE.Texture {
  const spec = PLATE_SCREENS[id];
  const img = src.image as (CanvasImageSource & { width?: number; height?: number }) | undefined;
  const w = Math.floor(img?.width ?? 0);
  const h = Math.floor(img?.height ?? 0);
  if (!img || w < 2 || h < 2) return src;

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return src;
  try {
    ctx.drawImage(img, 0, 0, w, h);
    const frame = ctx.getImageData(0, 0, w, h);
    compressPracticals(frame.data);
    // …and then the near half is crispened, BEFORE the board is drawn. The
    // board is 12px type on a 180px panel and is emissive by construction; an
    // unsharp mask over it would put a halo round every glyph, which is the one
    // artefact that reads as composited rather than painted.
    const crisp = PLATE_CRISP[id];
    if (crisp) {
      crispenRegion(
        frame.data,
        w,
        h,
        crisp.amount,
        Math.max(1, Math.round(w * crisp.radius)),
        crisp,
      );
    }
    ctx.putImageData(frame, 0, 0);
    if (spec) drawCallBoard(ctx, spec, w, h);
  } catch {
    return src;
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  src.dispose();
  return tex;
}

/**
 * Framing. A plate is painted, not shot, so its motivated practical lands
 * wherever the painting put it — for the ops room, hard against the left edge
 * and low enough that the dialogue bar sat on top of it. The frame then has no
 * power point at all and the eye settles on the emptiest thing in it, which
 * here was bare carpet.
 *
 * So the stage frames the plate rather than accepting it: the scene's own warm,
 * bright mass (the same reduction the rain and glass are lit from) is measured
 * in screen space, and if it is outside the rule-of-thirds band the plate is
 * slid until it isn't. Deliberately a ONE-WAY pull — a practical already inside
 * the band is left exactly where the painter put it, so a well-composed plate
 * is never "corrected" — and clamped well inside the overscan margin, so no
 * amount of camera drift can walk an edge into shot.
 */
const FRAME_BAND = { left: 0.34, right: 0.66, top: 0.34, bottom: 0.6 } as const;
/** Maximum slide, as a fraction of the frame. Overscan affords 0.15 either way. */
const FRAME_LIMIT = { x: 0.12, y: 0.1 } as const;

export class Stage implements IStage {
  private readonly bus: IEmitter;
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: KenBurns;
  private readonly clock = new THREE.Clock(false);

  private readonly layerGroup = new THREE.Group();
  private readonly characterGroup = new THREE.Group();
  private readonly contactShadow: THREE.Sprite;
  private readonly contactShadowTex: THREE.CanvasTexture;
  private readonly layers: Layer[] = [];
  private readonly characters = new Map<string, Character>();
  private readonly charIndex = new Map<string, number>();
  private charSeq = 0;

  private readonly weather: Weather;
  private readonly transitions: Transitions;
  private readonly postfx: PostFX;

  private bundle: StoryBundle | null = null;
  private settings: Settings = { ...DEFAULT_SETTINGS };

  private readonly textureCache = new Map<string, THREE.Texture>();
  private readonly failed = new Set<string>();
  private readonly procedural: THREE.Texture[] = [];
  private gradientTex: THREE.Texture | null = null;
  private readonly silhouettes = new Map<string, THREE.Texture>();
  private lightTex: THREE.DataTexture | null = null;

  private width = 1280;
  private height = 720;
  private running = false;
  private rafId = 0;
  private hasBackground = false;
  private focusZ = CHAR_Z;
  private currentParallax = 0.05;
  private depthHidden: [boolean, boolean] = [true, true];
  /** Framing bias for the current plate, in frame fractions (+x right, +y up). */
  private framingX = 0;
  private framingY = 0;
  /** Scratch for the per-frame figure-mask projection — never allocate in a loop. */
  private readonly figureProbe = new THREE.Vector3();
  /** The current plate's declared focal composition (see PLATE_FOCUS). */
  private plateFocus: FocusSpec | null = null;
  /** Last published speaker footprint (cx, cy, rx, ry), or null when the stage
   *  is empty — the other half of what the focal plane is computed from. */
  private figureFocus: { cx: number; cy: number; rx: number; ry: number } | null = null;

  private readonly unsub: Array<() => void> = [];

  constructor(bus: IEmitter, canvas: HTMLCanvasElement) {
    this.bus = bus;
    this.canvas = canvas;

    this.measure();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x05080b, 1);

    this.scene = new THREE.Scene();
    this.scene.add(this.layerGroup, this.characterGroup);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 64;
    const shadowCtx = shadowCanvas.getContext('2d');
    if (shadowCtx) {
      // A CONTACT shadow, not an ambient one, and the profile is the whole of
      // the difference: an occlusion where a body meets a surface is nearly
      // opaque for the first third of its run and then releases fast. The old
      // curve (1 → 0.72 at half radius → 0 at the edge) is the profile of a soft
      // ambient pool — it has no core, so what it printed was a wide grey smudge
      // that darkened the desk without ever saying anything touched it, which is
      // exactly the "she floats like a composited cutout" read.
      const shadow = shadowCtx.createRadialGradient(128, 32, 2, 128, 32, 126);
      shadow.addColorStop(0, 'rgba(4, 6, 8, 1)');
      shadow.addColorStop(0.3, 'rgba(4, 6, 8, 0.93)');
      shadow.addColorStop(0.58, 'rgba(4, 6, 8, 0.44)');
      shadow.addColorStop(0.82, 'rgba(4, 6, 8, 0.12)');
      shadow.addColorStop(1, 'rgba(4, 6, 8, 0)');
      shadowCtx.fillStyle = shadow;
      shadowCtx.fillRect(0, 0, shadowCanvas.width, shadowCanvas.height);
    }
    this.contactShadowTex = new THREE.CanvasTexture(shadowCanvas);
    this.contactShadowTex.colorSpace = THREE.SRGBColorSpace;
    this.contactShadow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.contactShadowTex,
      color: 0x050809,
      transparent: true,
      opacity: 0.12,
      depthTest: true,
      depthWrite: false,
      toneMapped: true,
    }));
    this.contactShadow.position.z = CHAR_Z - 0.02;
    this.contactShadow.renderOrder = 19;
    this.contactShadow.visible = false;
    this.characterGroup.add(this.contactShadow);

    this.camera = new KenBurns(this.width / this.height);

    this.weather = new Weather(WEATHER_Z);
    this.weather.setResolution(
      this.width * this.renderer.getPixelRatio(),
      this.height * this.renderer.getPixelRatio(),
    );
    this.scene.add(this.weather.group);

    // BokehPass builds its depth buffer by rendering the scene a SECOND time
    // with an override MeshDepthMaterial — which is alpha-blind. Two kinds of
    // object poison that buffer and both must sit the depth pass out:
    //
    //   • the weather rig — full-frame planes parked in front of the camera.
    //     Rendered opaque they stamped THEIR distance over every pixel, so the
    //     depth buffer claimed the whole world was one flat plane 5.2 units out
    //     and the DoF degenerated into a uniform soft-focus wash over the frame,
    //     background and faces alike. That wash is most of why the plate read
    //     mushy rather than photographed.
    //   • character sprites — an override material ignores their alphaTest, so
    //     each one wrote its full quad, not its silhouette, and left a hard
    //     RECTANGLE of differently-focused background around the speaker. A
    //     visible focus seam is a hard-fail; a real fix needs alpha-aware
    //     per-object depth, which BokehPass does not support.
    //
    // With both excluded the buffer carries the painted plate's own distance,
    // focus lands exactly on it, and the frame resolves crisp — the shallow-DoF
    // separation then comes from the art, which is where it is actually painted.
    this.scene.onBeforeRender = (): void => {
      if (!this.scene.overrideMaterial) return;
      this.depthHidden = [this.weather.group.visible, this.characterGroup.visible];
      this.weather.group.visible = false;
      this.characterGroup.visible = false;
    };
    this.scene.onAfterRender = (): void => {
      if (!this.scene.overrideMaterial) return;
      this.weather.group.visible = this.depthHidden[0];
      this.characterGroup.visible = this.depthHidden[1];
    };

    this.transitions = new Transitions(
      this.renderer,
      this.width * this.renderer.getPixelRatio(),
      this.height * this.renderer.getPixelRatio(),
      new THREE.Color(0x7db4c8),
    );

    this.postfx = new PostFX(
      this.renderer,
      this.scene,
      this.camera.camera,
      this.transitions.pass,
      this.width,
      this.height,
    );

    this.subscribe();
  }

  /* ───────────────────────────  bus wiring  ─────────────────────────── */

  private subscribe(): void {
    this.unsub.push(
      this.bus.on('scene:bg', (p) => this.onBg(p.id, p.transition)),
      this.bus.on('char:enter', (p) => this.onCharEnter(p.char, p.from, p.pose)),
      this.bus.on('char:exit', (p) => this.onCharExit(p.char, p.to)),
      this.bus.on('char:pose', (p) => this.onCharPose(p.char, p.pose)),
      this.bus.on('char:move', (p) => this.onCharMove(p.char, p.to)),
      this.bus.on('char:speaking', (p) => this.onSpeaking(p.char)),
      this.bus.on('weather:set', (p) => this.weather.setWeather(p.weather, p.intensity)),
      this.bus.on('camera:move', (p) => this.camera.move(p.move, p.zoom, p.duration)),
      this.bus.on('fx:play', (p) => this.onFx(p.effect, p.params)),
    );
  }

  /* ───────────────────────────  load / warm  ─────────────────────────── */

  async loadStory(bundle: StoryBundle): Promise<void> {
    this.bundle = bundle;
    this.resetSceneState();

    const theme = bundle.manifest.theme;
    const paper = hexToRgb(theme.paper || '#0d1418');
    this.renderer.setClearColor(
      new THREE.Color(paper.r / 255, paper.g / 255, paper.b / 255).multiplyScalar(0.4).getHex(),
      1,
    );
    this.postfx.setGrade(theme);
    this.postfx.setGrain(this.settings.grain);
    this.transitions.setKeyColor(new THREE.Color(theme.key || '#7db4c8'));

    // Collect every asset URL and warm the texture cache in parallel. Character
    // portraits are additionally re-baked once, here, through the presence mask.
    const urls = new Set<string>();
    const portraits = new Set<string>();
    // Which background id owns each PLATE (layer 0) url — the plate is the only
    // layer a screen prop can belong to, and the prop has to be baked into the
    // texture rather than overlaid. See PLATE_SCREENS.
    const plateOf = new Map<string, string>();
    for (const [id, bg] of Object.entries(bundle.assets.backgrounds)) {
      bg.layers.forEach((url, i) => {
        if (!url) return;
        urls.add(url);
        if (i === 0 && !plateOf.has(url)) plateOf.set(url, id);
      });
    }
    for (const poses of Object.values(bundle.assets.characters)) {
      for (const url of Object.values(poses)) {
        if (!url) continue;
        urls.add(url);
        portraits.add(url);
      }
    }

    const loader = new THREE.TextureLoader();
    await Promise.allSettled(
      [...urls].map(
        (url) =>
          new Promise<void>((resolve) => {
            // Already warmed (a restart of the same story) — never re-bake.
            if (this.textureCache.has(url)) {
              resolve();
              return;
            }
            loader.load(
              url,
              (loaded) => {
                const plate = plateOf.get(url);
                const tex = portraits.has(url)
                  ? this.toPresenceTexture(loaded)
                  : plate
                    ? paintPlateScreen(plate, loaded)
                    : loaded;
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
                tex.generateMipmaps = true;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.needsUpdate = true;
                this.textureCache.set(url, tex);
                resolve();
              },
              undefined,
              () => {
                this.failed.add(url);
                resolve();
              },
            );
          }),
      ),
    );

    // Prime the procedural gradient so the very first frame is never blank.
    this.gradientTex = this.makeGradient(theme);
  }

  private resetSceneState(): void {
    for (const ch of this.characters.values()) {
      this.characterGroup.remove(ch.group);
      ch.dispose();
    }
    this.characters.clear();
    this.charIndex.clear();
    this.charSeq = 0;
    this.hasBackground = false;
  }

  /* ───────────────────────────  background  ─────────────────────────── */

  private resolveBg(id: string): ResolvedBackground | null {
    return this.bundle?.assets.backgrounds[id] ?? null;
  }

  private onBg(id: string, transition?: string): void {
    const rb = this.resolveBg(id);
    const textures: THREE.Texture[] = [];
    if (rb) {
      for (const url of rb.layers) {
        const tex = this.textureCache.get(url);
        if (tex) textures.push(tex);
      }
    }
    const parallax = rb?.parallax ?? 0.05;

    // Freeze the current look before swapping (fades from clear color first time).
    this.transitions.snapshot(this.scene, this.camera.camera);

    const plate = textures.length === 0 ? this.gradientOrMake() : textures[0];
    // Framing first: both the layer placement and the light field are expressed
    // in the FRAMED screen, so the bias has to be known before either is built.
    this.computeFraming(plate);
    this.applyLayers(textures.length === 0 ? [plate] : textures, parallax);
    this.updateLightField(plate);
    // What in this room is on the camera's side of the glass, and where the
    // lens is focused on it. Both are properties of the PLATE, so both are
    // republished with it — a scene change re-aims the weather fence and the
    // depth of field together, or retires them for a plate that declares
    // neither. See PLATE_INTERIORS / PLATE_FOCUS.
    const interior = PLATE_INTERIORS[id];
    this.weather.setInteriorMask(interior?.lobes ?? [], interior?.amount ?? 0);
    this.weather.setPaneMask(PLATE_PANES[id] ?? null);
    this.weather.setRainWindow(PLATE_RAIN_WINDOWS[id] ?? null);
    this.plateFocus = PLATE_FOCUS[id] ?? null;
    this.applyFieldFocus();
    this.postfx.setShadowBridge(this.plateFocus?.bridge ?? 0);
    this.postfx.setMidLift(this.plateFocus?.midLift ?? 0);

    this.refreshFocus();
    void this.transitions.play(transition ?? (this.hasBackground ? 'dissolve' : 'crossfade'));
    this.hasBackground = true;
  }

  private gradientOrMake(): THREE.Texture {
    if (!this.gradientTex && this.bundle) this.gradientTex = this.makeGradient(this.bundle.manifest.theme);
    return this.gradientTex!;
  }

  private ensureLayers(n: number): void {
    while (this.layers.length < n) {
      const layer = new Layer();
      this.layers.push(layer);
      this.layerGroup.add(layer.mesh);
    }
  }

  private applyLayers(textures: THREE.Texture[], parallax: number): void {
    const n = textures.length;
    this.currentParallax = parallax;
    this.ensureLayers(n);
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (i < n) {
        const depthNorm = n > 1 ? i / (n - 1) : 0.5;
        const z = THREE.MathUtils.lerp(FAR_Z, NEAR_Z, depthNorm);
        const f = this.frustum(z);
        layer.setTexture(textures[i]);
        layer.configure({
          z,
          width: f.w * OVERSCAN,
          height: f.h * OVERSCAN,
          depth: depthNorm,
          parallax,
          phase: i * 1.73 + 0.4,
          offsetX: this.framingX * f.w,
          offsetY: this.framingY * f.h,
        });
      } else {
        layer.setTexture(null);
      }
    }
  }

  /** Resolution of the per-scene light reduction handed to the weather systems. */
  private static readonly LIGHT_W = 64;
  private static readonly LIGHT_H = 36;

  /**
   * Reduce the plate to a 64×36 colour map of the FRAMED SCREEN.
   *
   * The plate is drawn at `OVERSCAN` and slid by the framing bias, so a naive
   * reduction of the raw image is registered to nothing that is actually on
   * screen — up to 15% out at the edges before the bias is even counted, which
   * is enough to light a rain streak from a practical two desks away. Sampling
   * the same crop the camera sees keeps every consumer honest.
   *
   * Returns null (rather than throwing) for a tainted or undecodable source.
   */
  private samplePlate(
    texture: THREE.Texture | null,
    biasX: number,
    biasY: number,
  ): ImageData | null {
    const W = Stage.LIGHT_W;
    const H = Stage.LIGHT_H;
    const src = texture?.image as CanvasImageSource | undefined;
    if (!src) return null;
    try {
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      const dw = W * OVERSCAN;
      const dh = H * OVERSCAN;
      // Canvas y runs down; the bias is y-up, hence the sign flip.
      ctx.drawImage(src, (W - dw) * 0.5 + biasX * W, (H - dh) * 0.5 - biasY * H, dw, dh);
      return ctx.getImageData(0, 0, W, H);
    } catch {
      return null;
    }
  }

  /**
   * Slide the plate so its warm, bright mass lands on a rule-of-thirds power
   * point. See the FRAME_BAND note: the pull is one-way and clamped, so a plate
   * that already composes well is left untouched.
   */
  private computeFraming(texture: THREE.Texture | null): void {
    this.framingX = 0;
    this.framingY = 0;
    const px = this.samplePlate(texture, 0, 0);
    if (!px) return;

    const W = Stage.LIGHT_W;
    const H = Stage.LIGHT_H;
    let mass = 0;
    let mx = 0;
    let my = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const s = (y * W + x) * 4;
        const r = px.data[s];
        const g = px.data[s + 1];
        const b = px.data[s + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const warmth = Math.max(0, (r - b) / 255) + 0.22;
        // The same score the reflection uses, floored so the ambient wash of a
        // dark plate cannot drag the centroid back to the middle of the frame.
        const w = Math.max(0, lum * lum * warmth - 0.02);
        mass += w;
        mx += w * ((x + 0.5) / W);
        my += w * ((y + 0.5) / H);
      }
    }
    if (mass <= 1e-4) return;

    const pull = (v: number, lo: number, hi: number, limit: number): number =>
      v < lo ? Math.min(lo - v, limit) : v > hi ? Math.max(hi - v, -limit) : 0;

    this.framingX = pull(mx / mass, FRAME_BAND.left, FRAME_BAND.right, FRAME_LIMIT.x);
    // The centroid is measured downward; lifting the plate is +y.
    this.framingY = -pull(my / mass, FRAME_BAND.top, FRAME_BAND.bottom, FRAME_LIMIT.y);
  }

  /**
   * Publish the framed reduction to the weather so rain and glass are lit by the
   * art instead of by a constant, and find the frame's dominant *warm* practical
   * to mirror across the glass as a reflection target — which is why the glass
   * reflection always lands on a real light source in the painting rather than
   * somewhere an artist would have to hand-place.
   */
  private updateLightField(texture: THREE.Texture | null): void {
    const W = Stage.LIGHT_W;
    const H = Stage.LIGHT_H;
    const pixels = this.samplePlate(texture, this.framingX, this.framingY);
    if (!pixels) {
      // Tainted or undecodable source — fall back to uncoupled weather.
      this.weather.setLightField(null, null);
      return;
    }

    const data = new Uint8Array(W * H * 4);
    let best = -1;
    let bx = 0.5;
    let by = 0.5;
    const bc = new THREE.Color(1, 1, 1);
    for (let y = 0; y < H; y++) {
      const sy = H - 1 - y; // canvas is y-down, texture UV is y-up
      for (let x = 0; x < W; x++) {
        const s = (sy * W + x) * 4;
        const d = (y * W + x) * 4;
        const r = pixels.data[s];
        const g = pixels.data[s + 1];
        const b = pixels.data[s + 2];
        data[d] = r;
        data[d + 1] = g;
        data[d + 2] = b;
        data[d + 3] = 255;
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const warmth = Math.max(0, (r - b) / 255) + 0.22;
        const score = lum * lum * warmth;
        if (score > best) {
          best = score;
          bx = (x + 0.5) / W;
          by = (y + 0.5) / H;
          bc.setRGB(r / 255, g / 255, b / 255);
        }
      }
    }

    this.lightTex?.dispose();
    const tex = new THREE.DataTexture(data, W, H);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    this.lightTex = tex;

    // Peak-normalize the practical's colour, then walk it a touch toward white
    // so the reflection reads as light on glass rather than a coloured decal.
    const peak = Math.max(bc.r, bc.g, bc.b, 0.001);
    bc.setRGB(bc.r / peak, bc.g / peak, bc.b / peak).lerp(new THREE.Color(1, 1, 1), 0.14);

    this.weather.setLightField(tex, {
      // Mirror the practical across frame centre and pull it back in a little,
      // so it counterweights the source instead of pinning to the far edge.
      x: THREE.MathUtils.clamp(0.5 + (0.5 - bx) * 0.78, 0.1, 0.9),
      // Held ABOVE the sill line. A reflection is a property of a surface, and
      // the only reflective surface in shot is the pane — free to sit anywhere,
      // it landed on the carpet, where nothing could have cast it. The shader
      // fences the same band a second time (`reflBand`); this keeps the centre
      // itself out of the floor so the lobe is never merely half-cut.
      y: THREE.MathUtils.clamp(by, 0.55, 0.88),
      color: bc,
      // Halved along with the radius: a tight specular, not a lens smudge.
      amount: best > 0.02 ? 0.05 : 0,
    });
  }

  /**
   * Resolve the frame's focal plane and hand it to the grade.
   *
   * The plate declares where the camera is focused when the room is empty — for
   * the ops room, the desk vignette, which is both the nearest object and the
   * only lit one. The moment a speaker walks into it that stops being true, and
   * a rack focus that stays on the furniture while a face is on screen is worse
   * than no depth of field at all: it is the wrong depth of field, and the one
   * thing the frame must never soften is the person the scene is about.
   *
   * A speaker does not simply MOVE the focal plane, though, because the desk is
   * still in shot and still painted crisp. Both are on the near plane; what is
   * far is the city behind them. So the two ellipses are UNIONED — the near
   * plane, described by everything that is actually on it — and only what lies
   * outside both is resolved away. With nobody on stage the union collapses back
   * to the plate's own ellipse and the wide shot keeps its full separation.
   */
  private applyFieldFocus(): void {
    const p = this.plateFocus;
    if (!p || p.blur <= 0) {
      this.postfx.setFieldFocus(p?.cx ?? 0.5, p?.cy ?? 0.5, p?.rx ?? 1, p?.ry ?? 1, 0);
      return;
    }
    const f = this.figureFocus;
    if (!f) {
      this.postfx.setFieldFocus(p.cx, p.cy, p.rx, p.ry, p.blur);
      return;
    }
    // A portrait is read at the eyes, which sit above the centroid of its quad,
    // and its plate is much taller than it is wide — so the figure's own ellipse
    // is padded a little rather than taken raw.
    const fx = f.rx * 1.15;
    const fy = f.ry * 1.05;
    const lo = Math.min(p.cx - p.rx, f.cx - fx);
    const hi = Math.max(p.cx + p.rx, f.cx + fx);
    const bo = Math.min(p.cy - p.ry, f.cy - fy);
    const to = Math.max(p.cy + p.ry, f.cy + fy);
    this.postfx.setFieldFocus((lo + hi) * 0.5, (bo + to) * 0.5, (hi - lo) * 0.5, (to - bo) * 0.5, p.blur);
  }

  /**
   * Park the plane of focus on the painted plate. Sprites are excluded from the
   * DoF depth pass (see the scene.onBeforeRender note), so the plate's distance
   * is the only real depth in the buffer — focusing anywhere else just softens
   * the entire frame uniformly, faces included, which is exactly the mush this
   * replaced. Kept as a hook so a scene change re-lands focus on the new plate.
   */
  private refreshFocus(): void {
    this.focusZ = this.averageLayerZ();
  }

  private averageLayerZ(): number {
    const active = this.layers.filter((l) => l.mesh.visible);
    if (active.length === 0) return -3.5;
    return active.reduce((s, l) => s + l.mesh.position.z, 0) / active.length;
  }

  /* ───────────────────────────  characters  ─────────────────────────── */

  private charDef(key: string): CharacterDef | null {
    return this.bundle?.manifest.characters[key] ?? null;
  }

  /**
   * Side anchors, as a fraction of the frustum width at `z`.
   *
   * 0.28 → 0.24 → 0.18 → 0.166. The rule-of-thirds power point is at exactly
   * ±1/6 of the frame (0.16667); 0.24 put her at 74% of frame width, which is
   * not the right third at all but the right MARGIN — pinned against the edge,
   * directly under the relay panel, and leaving the entire middle 40% of the
   * frame with nothing in it.
   *
   * 0.18 landed her plate CENTRE on 68%, which was the right correction made
   * against the wrong landmark. A portrait is read at the eyes, not at the
   * centroid of its quad, and this plate's eyeline sits ~1.5% of frame width
   * right of the mask centre — so the thing the composition is actually hung on
   * was printing at 69.3%, i.e. dead-centring the right half rather than
   * landing on the third line. 0.166 puts the EYES on 66.6% and leaves the
   * plate's own centre a hair inboard of it, which is the correct relationship:
   * the subject on the power point, the mass just behind it.
   */
  private anchorsAt(z: number): Record<CharSide, number> {
    const f = this.frustum(z);
    return { left: -f.w * 0.166, center: 0, right: f.w * 0.166 };
  }

  private charTexture(key: string, pose: string): THREE.Texture {
    const url = this.bundle?.assets.characters[key]?.[pose];
    if (url) {
      const tex = this.textureCache.get(url);
      if (tex) return tex;
    }
    // Any other resolvable pose for this character before falling back.
    const poses = this.bundle?.assets.characters[key];
    if (poses) {
      for (const u of Object.values(poses)) {
        const tex = this.textureCache.get(u);
        if (tex) return tex;
      }
    }
    const color = this.charDef(key)?.color ?? this.bundle?.manifest.theme.key ?? '#7db4c8';
    return this.makeSilhouette(color);
  }

  private indexFor(key: string): number {
    let idx = this.charIndex.get(key);
    if (idx === undefined) {
      idx = this.charSeq++;
      this.charIndex.set(key, idx);
    }
    return idx;
  }

  private onCharEnter(key: string, from: CharSide, pose?: string): void {
    const def = this.charDef(key);
    const poseKey = pose ?? def?.defaultPose ?? this.firstPose(key) ?? 'neutral';
    const texture = this.charTexture(key, poseKey);
    const side: CharSide = from ?? def?.home ?? 'center';

    const existing = this.characters.get(key);
    if (existing) {
      existing.setPose(texture, this.settings.reducedMotion);
      existing.moveTo(side, this.settings.reducedMotion);
      return;
    }

    const f = this.frustum(CHAR_Z);
    const character = new Character(
      {
        key,
        index: this.indexFor(key),
        tint: new THREE.Color(def?.color ?? '#ffffff'),
        height: f.h * 0.72 * (def?.scale ?? 1),
        anchors: this.anchorsAt(CHAR_Z),
        worldZ: CHAR_Z,
      },
      texture,
    );
    character.setSpeaking('neutral');
    this.characters.set(key, character);
    this.characterGroup.add(character.group);
    character.enter(side, this.settings.reducedMotion);
    this.refreshFocus();
  }

  private firstPose(key: string): string | null {
    const poses = this.bundle?.manifest.characters[key]?.poses;
    if (!poses) return null;
    const keys = Object.keys(poses);
    return keys.length ? keys[0] : null;
  }

  private onCharExit(key: string, to: CharSide): void {
    const character = this.characters.get(key);
    if (!character) return;
    this.characters.delete(key);
    this.refreshFocus();
    void character.exit(to ?? 'left', this.settings.reducedMotion).then(() => {
      this.characterGroup.remove(character.group);
      character.dispose();
    });
  }

  private onCharPose(key: string, pose: string): void {
    const character = this.characters.get(key);
    if (!character) return;
    character.setPose(this.charTexture(key, pose), this.settings.reducedMotion);
  }

  private onCharMove(key: string, to: CharSide): void {
    this.characters.get(key)?.moveTo(to, this.settings.reducedMotion);
  }

  private onSpeaking(speaker: string | null): void {
    for (const [key, ch] of this.characters) {
      if (speaker === null) ch.setSpeaking('neutral');
      else ch.setSpeaking(key === speaker ? 'speaker' : 'listener');
    }
    this.refreshFocus();
  }

  /* ───────────────────────────  fx  ─────────────────────────── */

  private onFx(effect: string, params: Record<string, number>): void {
    switch (effect) {
      case 'flash':
        this.postfx.flash(params.strength ?? 0.9);
        break;
      case 'shake':
        this.camera.shake(params.intensity ?? 1, params.duration ?? 0.4);
        break;
      case 'glitch':
        this.postfx.glitch(params.strength ?? 1, params.duration ?? 0.5);
        break;
      case 'dissolve':
        if (!this.transitions.busy) this.transitions.fxShimmer(this.scene, this.camera.camera);
        break;
      default:
        break;
    }
  }

  /* ───────────────────────────  loop  ─────────────────────────── */

  start(): void {
    if (this.running) return;
    this.running = true;
    if (!this.clock.running) this.clock.start();
    const tick = (): void => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(tick);
      this.frame();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.clock.stop();
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const reduced = this.settings.reducedMotion;

    this.camera.update(dt, t);
    for (const layer of this.layers) {
      if (layer.mesh.visible) layer.update(t, this.camera.panX, this.camera.panY, reduced);
    }
    for (const ch of this.characters.values()) ch.update(t, dt);
    this.publishFigureMask();
    this.weather.update(dt, t);
    this.transitions.update(t);
    this.postfx.update(dt, t);
    this.postfx.setFocus(this.camera.distanceTo(this.focusZ));

    this.postfx.render(dt);
  }

  /**
   * Project the most-present speaker's solid core into screen space and hand it
   * to the weather rig, so rain stops falling through a woman who is indoors.
   *
   * The camera's inverse is refreshed here rather than trusted: this runs before
   * `postfx.render`, i.e. before three has had a chance to update it, and a
   * stale inverse puts the fence a Ken-Burns drift away from the figure — which
   * is worse than no fence, because the hole then has no object in it.
   */
  private publishFigureMask(): void {
    let best: Character | null = null;
    let presence = 0;
    for (const ch of this.characters.values()) {
      const p = ch.presence;
      if (p > presence) {
        presence = p;
        best = ch;
      }
    }
    if (!best || presence <= 0.01) {
      this.weather.setFigureMask(0.5, 0.5, 1e-4, 1e-4, 0);
      this.contactShadow.visible = false;
      if (this.figureFocus) {
        this.figureFocus = null;
        this.applyFieldFocus();
      }
      return;
    }
    const cam = this.camera.camera;
    cam.updateMatrixWorld();
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();

    const b = best.coreBounds();
    this.contactShadow.visible = true;
    // Tighter, lower and four times as dense. 0.12 over a 2.35 × 0.24 ellipse is
    // an ambient darkening of the whole desk in front of her; a contact shadow is
    // a small, hard, nearly-black mark directly under the mass that is casting
    // it, and it is the single cheapest cue that a figure is ON a surface rather
    // than IN FRONT OF a picture of one. Narrowed to 1.72 (her torso's own width,
    // not her plate's), thinned to 0.17, dropped a further 4% so it sits at the
    // desk line rather than hovering over it, and printed at 0.46 — which against
    // this plate's lamp-lit wood is a shadow, and against its blacks is nothing,
    // because a multiply-like darkening on an already-black floor cannot show.
    this.contactShadow.position.set(b.x, b.y - b.hy * 1.08, CHAR_Z - 0.02);
    this.contactShadow.scale.set(b.hx * 1.72, b.hy * 0.17, 1);
    (this.contactShadow.material as THREE.SpriteMaterial).opacity = 0.46 * presence;
    const v = this.figureProbe;
    v.set(b.x, b.y, CHAR_Z).project(cam);
    const cx = v.x * 0.5 + 0.5;
    const cy = v.y * 0.5 + 0.5;
    v.set(b.x + b.hx, b.y + b.hy, CHAR_Z).project(cam);
    const rx = Math.abs(v.x * 0.5 + 0.5 - cx);
    const ry = Math.abs(v.y * 0.5 + 0.5 - cy);
    this.weather.setFigureMask(cx, cy, rx * FENCE_SCALE_X, ry * FENCE_SCALE_Y, presence);
    // The focal plane follows her. Only republished when the footprint has
    // actually moved by a pixel or so — the uniform is cheap, but the union
    // arithmetic behind it is not worth running sixty times a second for a
    // figure that is only breathing.
    const prev = this.figureFocus;
    if (!prev || Math.abs(prev.cx - cx) > 0.002 || Math.abs(prev.cy - cy) > 0.002 ||
        Math.abs(prev.rx - rx) > 0.004 || Math.abs(prev.ry - ry) > 0.004) {
      this.figureFocus = { cx, cy, rx, ry };
      this.applyFieldFocus();
    }
  }

  /* ───────────────────────────  settings / resize  ─────────────────────────── */

  applySettings(settings: Settings): void {
    this.settings = { ...settings };
    this.camera.setReducedMotion(settings.reducedMotion);
    this.postfx.applySettings(settings);
  }

  private measure(): void {
    const w = this.canvas.clientWidth || window.innerWidth || 1280;
    const h = this.canvas.clientHeight || window.innerHeight || 720;
    this.width = Math.max(1, Math.floor(w));
    this.height = Math.max(1, Math.floor(h));
  }

  private frustum(z: number): { w: number; h: number } {
    const d = CAM_Z - z;
    const h = 2 * d * Math.tan((FOV * Math.PI) / 180 / 2);
    const w = h * (this.width / this.height);
    return { w, h };
  }

  resize(): void {
    this.measure();
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.setAspect(this.width / this.height);
    this.postfx.resize(this.width, this.height);
    this.transitions.resize(this.width * pr, this.height * pr);
    this.weather.setResolution(this.width * pr, this.height * pr);

    // Re-fit layers and characters to the new frustum.
    this.refitLayers();
    const f = this.frustum(CHAR_Z);
    const anchors = this.anchorsAt(CHAR_Z);
    for (const [key, ch] of this.characters) {
      const def = this.charDef(key);
      ch.relayout(f.h * 0.72 * (def?.scale ?? 1), anchors);
    }
  }

  private refitLayers(): void {
    const visible = this.layers.filter((l) => l.mesh.visible);
    const n = visible.length;
    for (let i = 0; i < n; i++) {
      const depthNorm = n > 1 ? i / (n - 1) : 0.5;
      const z = THREE.MathUtils.lerp(FAR_Z, NEAR_Z, depthNorm);
      const fr = this.frustum(z);
      visible[i].configure({
        z,
        width: fr.w * OVERSCAN,
        height: fr.h * OVERSCAN,
        depth: depthNorm,
        parallax: this.currentParallax,
        phase: i * 1.73 + 0.4,
        offsetX: this.framingX * fr.w,
        offsetY: this.framingY * fr.h,
      });
    }
  }

  /* ───────────────────────────  thumbnail  ─────────────────────────── */

  captureThumbnail(width = 480, height = 270): string {
    this.frame();
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(this.renderer.domElement, 0, 0, width, height);
    try {
      return out.toDataURL('image/png');
    } catch {
      return '';
    }
  }

  /* ───────────────────────────  presence treatment  ─────────────────────────── */

  /**
   * Re-bake a character portrait as an *apparition* rather than a card.
   *
   * Portraits ship with an opaque painted backdrop, so composited raw they read
   * as pasted rectangles floating in front of the scene. Once, at load, each is
   * drawn into an offscreen canvas and given:
   *   • a superellipse alpha falloff — a wide, soft feather left and right so no
   *     straight edge ever survives, around a core that holds the face and near
   *     shoulder at a flat alpha 1;
   *   • a short dissolve off the crown of the head and a long one below the
   *     chest, so she trails off like a memory instead of stopping at a frame
   *     line;
   *   • a light edge vignette on the same falloff, so the fading backdrop sinks
   *     into the scene's depth rather than hazing over it.
   *
   * Returns the source texture untouched if the pixels can't be read (a tainted
   * cross-origin canvas, or no 2D context) — the stage must never fail to draw.
   */
  private toPresenceTexture(src: THREE.Texture): THREE.Texture {
    const img = src.image as (CanvasImageSource & { width?: number; height?: number }) | undefined;
    const w = Math.floor(img?.width ?? 0);
    const h = Math.floor(img?.height ?? 0);
    if (!img || w < 2 || h < 2) return src;

    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0, w, h);

    let frame: ImageData;
    try {
      frame = ctx.getImageData(0, 0, w, h);
    } catch {
      return src;
    }

    const px = frame.data;
    // Detail octave first, while the plate is still rectangular: the mask below
    // multiplies alpha and adds rim light, and a blur taken after either would
    // be pulling feathered edge pixels and painted kicker back into the face.
    softenLocalContrast(px, w, h, PRESENCE.localContrast, Math.max(1, Math.round(w * PRESENCE.localRadius)));
    // …and then the knit specifically, at four times the radius and confined to
    // the torso. Same ordering argument as above: before the matte, so the pass
    // is only ever pulling on painted plate and never on a feather.
    crispenRegion(px, w, h, PRESENCE.softenAmt, Math.max(1, Math.round(w * PRESENCE.softenRadius)), {
      cx: PRESENCE.softenCx,
      cy: PRESENCE.softenCy,
      rx: PRESENCE.softenRx,
      ry: PRESENCE.softenRy,
      soft: PRESENCE.softenSoft,
    });
    const invPower = 1 / PRESENCE.power;
    for (let y = 0; y < h; y++) {
      const v = (y + 0.5) / h;
      const dy = v - PRESENCE.cy;
      const ny = Math.abs(dy / (dy < 0 ? PRESENCE.rTop : PRESENCE.rBottom)) ** PRESENCE.power;
      // Crown dissolve × torso dissolve — constant across the row.
      const vertical =
        smoothstep(PRESENCE.headEnd, PRESENCE.headStart, v) *
        (1 - smoothstep(PRESENCE.tailStart, PRESENCE.tailEnd, v));
      // Rim falls off down the figure: strongest across the crown and shoulder
      // where the dissolve is longest, half strength by the torso, where the
      // plate is trailing away on purpose and a lit edge would fight it.
      const rimRow = 0.5 + 0.5 * (1 - smoothstep(0.26, 0.7, v));
      // Torso falloff — constant across the row, and applied to every pixel in
      // it including the fully-opaque core. The loop below now only skips
      // pixels the matte has already zeroed, so nothing that is still on the
      // plate can miss this (or the key).
      const shadeRow =
        1 - PRESENCE.shadeAmt * smoothstep(PRESENCE.shadeStart, PRESENCE.shadeEnd, v);
      // The monitor throws from BELOW — see PRESENCE.spill*. Constant across the
      // row, like every other vertical weight here.
      const spillRise = smoothstep(PRESENCE.spillRiseStart, PRESENCE.spillRiseEnd, v);
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        const u = (x + 0.5) / w;
        const dx = u - PRESENCE.cx;
        const nx = Math.abs(dx / (dx < 0 ? PRESENCE.rLeft : PRESENCE.rRight)) ** PRESENCE.power;
        const d = (nx + ny) ** invPower;
        const a = (1 - smoothstep(PRESENCE.core, 1, d)) ** PRESENCE.rampGamma * vertical;
        if (a <= 0) {
          px[row + x * 4 + 3] = 0;
          continue;
        }
        const i = row + x * 4;
        // The key. Runs on EVERY surviving pixel including the fully-opaque
        // core — that is the whole point of it, and it is why the old
        // `a >= 1 && shadeRow >= 1` early-out had to go: the one region the
        // previous pass could never touch is the one region a key light
        // actually falls on.
        const keyDir =
          1 - smoothstep(PRESENCE.keyDirStart, PRESENCE.keyDirEnd, dx);
        // …and the relay screen's own throw, from lower camera-left. Shares the
        // key's construction exactly — direction × surface × presence × torso —
        // and differs only in where each of those is aimed. See PRESENCE.spill*.
        const spillDir =
          1 - smoothstep(PRESENCE.spillDirStart, PRESENCE.spillDirEnd, dx);
        // Read once, used three times: by the two lights below as their surface
        // gate, and by the midtone lift as its own weight.
        const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
        let key = 0;
        let spill = 0;
        if ((keyDir > 0 || spillDir * spillRise > 0) && shadeRow > 0) {
          if (keyDir > 0) {
            const surf =
              smoothstep(PRESENCE.keyLumIn, PRESENCE.keyLumFull, lum) *
              (1 -
                PRESENCE.keyRoll *
                  smoothstep(PRESENCE.keyLumRollFrom, PRESENCE.keyLumRollTo, lum));
            key = PRESENCE.keyAmt * keyDir * surf * a * shadeRow;
          }
          if (spillDir > 0 && spillRise > 0) {
            const surfC =
              smoothstep(PRESENCE.spillLumIn, PRESENCE.spillLumFull, lum) *
              (1 -
                PRESENCE.spillRoll *
                  smoothstep(PRESENCE.spillLumRollFrom, PRESENCE.spillLumRollTo, lum));
            spill = PRESENCE.spillAmt * spillDir * spillRise * surfC * a * shadeRow;
          }
        }
        // Backdrop falloff — see PRESENCE.backdrop*. Folded into `shade`, so
        // the key wash above and the torso dissolve below all scale with it and
        // no light can ever exceed the surface it is supposedly landing on.
        const backdropAmt =
          PRESENCE.backdropRight +
          (PRESENCE.backdropLeft - PRESENCE.backdropRight) *
            (1 - smoothstep(-0.1, 0.3, dx));
        // …and the midtone lift (see PRESENCE.midLift). 4L(1−L) is a parabola
        // that is 1 at L = 0.5 and 0 at both ends, so this opens her wool, her
        // collar and the shadow side of her jaw by 15% and provably cannot
        // touch a black or a specular. Folded into `shade` so every falloff
        // above still owns it — the feather and the torso dissolve are not
        // going to be handed exposure back by a grade term.
        const shade =
          shadeRow *
          (1 + PRESENCE.midLift * 4 * lum * (1 - lum)) *
          (1 - PRESENCE.vignette * (1 - a) ** PRESENCE.vignetteGamma) *
          (1 - backdropAmt * smoothstep(PRESENCE.backdropIn, PRESENCE.backdropOut, d));
        // A band through the middle of the ramp: 0 at both ends by
        // construction, so it can never draw a line at the plate's edge or a
        // halo out in the scene.
        const band =
          smoothstep(PRESENCE.rimIn, PRESENCE.rimPeak, a) *
          (1 - smoothstep(PRESENCE.rimPeak, PRESENCE.rimOut, a));
        const dirW =
          PRESENCE.rimDirMin + (1 - PRESENCE.rimDirMin) * (1 - smoothstep(-0.12, 0.18, dx));
        // Gated on the torso falloff as well: a kicker painted into the part of
        // the plate that has just been committed to black is a light with no
        // surface under it.
        const lift = PRESENCE.rimAmt * band * dirW * rimRow * shadeRow;
        // The window's own band, outboard of the lamp's. Same construction —
        // zero at both ends of its own ramp — so it can no more draw a line at
        // the plate edge than the amber one can.
        const coolBand =
          smoothstep(PRESENCE.rimCoolIn, PRESENCE.rimCoolPeak, a) *
          (1 - smoothstep(PRESENCE.rimCoolPeak, PRESENCE.rimCoolOut, a));
        const coolDir =
          PRESENCE.rimCoolDirMin +
          (1 - PRESENCE.rimCoolDirMin) * (1 - smoothstep(-0.06, 0.22, dx));
        const cool = PRESENCE.rimCoolAmt * coolBand * coolDir * shadeRow;
        // Both sources are gains on the same surface, so they SUM inside the
        // multiplier rather than compounding: two lights on a cheek add their
        // contributions, they do not multiply each other's.
        px[i] = Math.min(
          255,
          px[i] * shade * (1 + key * PRESENCE.keyR + spill * PRESENCE.spillR) +
            lift * PRESENCE.rimR + cool * PRESENCE.rimCoolR,
        );
        px[i + 1] = Math.min(
          255,
          px[i + 1] * shade * (1 + key * PRESENCE.keyG + spill * PRESENCE.spillG) +
            lift * PRESENCE.rimG + cool * PRESENCE.rimCoolG,
        );
        px[i + 2] = Math.min(
          255,
          px[i + 2] * shade * (1 + key * PRESENCE.keyB + spill * PRESENCE.spillB) +
            lift * PRESENCE.rimB + cool * PRESENCE.rimCoolB,
        );
        px[i + 3] *= a;
      }
    }
    ctx.putImageData(frame, 0, 0);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    src.dispose();
    return tex;
  }

  /* ───────────────────────────  procedural placeholders  ─────────────────────────── */

  private makeGradient(theme: StoryTheme): THREE.Texture {
    const W = 1280;
    const H = 720;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d')!;
    const paper = hexToRgb(theme.paper || '#0d1418');
    const key = hexToRgb(theme.key || '#7db4c8');
    const dark = mixRgb(paper, { r: 0, g: 0, b: 0 }, 0.55);
    const glow = mixRgb(paper, key, 0.4);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, css(glow));
    grad.addColorStop(0.5, css(paper));
    grad.addColorStop(1, css(dark));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Soft off-center key glow.
    const rg = ctx.createRadialGradient(W * 0.68, H * 0.32, 20, W * 0.68, H * 0.32, H * 0.9);
    rg.addColorStop(0, css(mixRgb(paper, key, 0.5), 0.35));
    rg.addColorStop(1, css(paper, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    // Vignette.
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.procedural.push(tex);
    return tex;
  }

  private makeSilhouette(color: string): THREE.Texture {
    const cached = this.silhouettes.get(color);
    if (cached) return cached;
    const W = 600;
    const H = 900;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d')!;
    const c = hexToRgb(color);

    ctx.save();
    ctx.filter = 'blur(6px)';
    ctx.fillStyle = css(c, 0.55);
    // Head.
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.26, W * 0.17, H * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shoulders / torso.
    ctx.beginPath();
    ctx.moveTo(W * 0.5 - W * 0.18, H * 0.42);
    ctx.bezierCurveTo(W * 0.16, H * 0.5, W * 0.1, H * 0.72, W * 0.14, H);
    ctx.lineTo(W * 0.86, H);
    ctx.bezierCurveTo(W * 0.9, H * 0.72, W * 0.84, H * 0.5, W * 0.5 + W * 0.18, H * 0.42);
    ctx.bezierCurveTo(W * 0.6, H * 0.36, W * 0.4, H * 0.36, W * 0.5 - W * 0.18, H * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Rim light from the right so it reads as a lit figure.
    const rim = ctx.createLinearGradient(W * 0.3, 0, W, 0);
    rim.addColorStop(0, 'rgba(255,255,255,0)');
    rim.addColorStop(1, css(mixRgb(c, { r: 255, g: 255, b: 255 }, 0.6), 0.25));
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.silhouettes.set(color, tex);
    this.procedural.push(tex);
    return tex;
  }

  /* ───────────────────────────  teardown  ─────────────────────────── */

  dispose(): void {
    this.stop();
    for (const off of this.unsub) off();
    this.unsub.length = 0;

    for (const ch of this.characters.values()) ch.dispose();
    this.characters.clear();
    for (const layer of this.layers) {
      this.layerGroup.remove(layer.mesh);
      layer.dispose();
    }
    this.layers.length = 0;

    this.weather.dispose();
    this.transitions.dispose();
    this.postfx.dispose();

    for (const tex of this.textureCache.values()) tex.dispose();
    this.textureCache.clear();
    for (const tex of this.procedural) tex.dispose();
    this.procedural.length = 0;
    this.silhouettes.clear();
    this.gradientTex = null;
    this.lightTex?.dispose();
    this.lightTex = null;
    (this.contactShadow.material as THREE.SpriteMaterial).dispose();
    this.contactShadowTex.dispose();

    this.camera.dispose();
    this.scene.clear();
    this.renderer.dispose();
  }
}
