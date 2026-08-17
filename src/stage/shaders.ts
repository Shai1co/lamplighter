/**
 * Lamplighter — Stage GLSL primitives + tiny deterministic helpers.
 *
 * All shaders are authored as exported template-literal strings (no `.glsl`
 * files). They operate in LINEAR color space: the EffectComposer renders the
 * scene into a linear render target and `OutputPass` performs the final ACES
 * tone-map + sRGB encode, so every pass here stays linear and un-encoded.
 *
 * This module also hosts two pure, dependency-free helpers used across the
 * stage for reproducible particle placement and per-character phase offsets —
 * deliberately deterministic (never `Math.random()`), seeded from a fixed
 * constant so a given story always looks identical frame-to-frame across runs.
 */

/** Fixed seed constant — every seeded system derives from this. */
export const STAGE_SEED = 0x9e3779b1;

/**
 * mulberry32 — a small, fast, well-distributed 32-bit PRNG. Returns a function
 * yielding floats in [0, 1). Same seed ⇒ same stream, always.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A stable [0,1) value from an integer index — used for per-character idle
 * breathing phase so motion is varied but reproducible (no randomness).
 */
export function hash01(index: number): number {
  let h = (index + 1) * 0x9e3779b1;
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** Shared full-screen vertex shader for post passes. */
export const FULLSCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Value-noise helpers shared by fragment shaders. */
const GLSL_NOISE = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
/**
 * hash13 — Dave Hoskins' sin-free 3->1 hash. Unlike the fract(p.x * p.y) form
 * above it stays well-distributed at large integer coordinates, which is exactly
 * where a screen-space grain field lives (0…1920). The older hash visibly
 * *repeats* across a 1080p frame: on flat darks it resolves into a dot lattice
 * that reads as dithering, so grain must never be built on it.
 */
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`;

/**
 * "Grade" pass — the cinematic look. Combines, in order:
 *   • edge chromatic aberration (boosted during glitch),
 *   • ASC-CDL style lift / gamma / gain,
 *   • contrast around a linear pivot + saturation,
 *   • teal↔orange split-tone,
 *   • soft vignette,
 *   • animated film grain,
 *   • glitch scanline jitter + white flash.
 * Runs in linear space (before OutputPass).
 */
export const GRADE_FRAGMENT = /* glsl */ `
varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform vec2  uResolution;
uniform float uTime;
uniform vec3  uLift;
uniform vec3  uGamma;
uniform vec3  uGain;
uniform float uContrast;
uniform float uSaturation;
uniform float uSplitTone;
uniform float uVignette;
uniform float uGrain;
uniform float uGrainSize;
uniform float uAberration;
uniform float uFlash;
uniform float uGlitch;
/** Focal plane, in frame coordinates: centre.xy, half-extents.zw (0..1). */
uniform vec4  uFocus;
/** Peak defocus radius at the far edge of the frame, in UV. 0 retires the pass. */
uniform float uFieldBlur;
/** Shadow-family unifier — how hard an ungraded dark region is pulled toward
 *  the room's own teal. 0 leaves the plate's own shadow hue alone. */
uniform float uShadowBridge;

${GLSL_NOISE}

/**
 * Highlight shoulder. Untouched below SHOULDER_K, asymptotic to SHOULDER_W —
 * a classic print shoulder rather than a clip. See the call site for why the
 * desk practical needed one.
 *
 * SHOULDER_W 0.55 → 0.92, and this is the single number behind the "reads a
 * stop underexposed under a flat dark overlay" note. An asymptote at 0.55
 * linear prints, through the ACES fit and the sRGB encode downstream, at about
 * 170/255 — so nothing in the picture, not the lamp's own shade, not the relay
 * screen, not the brightest disc of city bokeh, could ever reach a highlight
 * value. A frame whose ceiling is a middle grey has no contrast range left to
 * spend, and no amount of work in the shadows can give it one back. At 0.92 the
 * practicals reach ~230 and the frame finally has a top to its scale; the knee
 * comes up with it (0.20 → 0.27) so the midtones the shoulder used to start
 * eating at are simply not billed at all.
 */
const float SHOULDER_K = 0.27;
const float SHOULDER_W = 0.92;

void main() {
  vec2 uv = vUv;
  vec2 centered = uv - 0.5;
  float r2 = dot(centered, centered);

  // Glitch horizontal band jitter.
  float band = 0.0;
  if (uGlitch > 0.0001) {
    float line = floor(uv.y * 160.0);
    float j = (hash21(vec2(line, floor(uTime * 30.0))) - 0.5);
    band = step(0.7, hash21(vec2(line, floor(uTime * 12.0)))) * j * 0.06 * uGlitch;
    uv.x += band;
  }

  // Chromatic aberration — grows toward the frame edges.
  float ca = (uAberration + uGlitch * 0.6) * (0.15 + r2 * 1.2);
  vec2 dir = normalize(centered + 1e-5);
  vec3 color;
  color.r = texture2D(tDiffuse, uv - dir * ca).r;
  color.g = texture2D(tDiffuse, uv).g;
  color.b = texture2D(tDiffuse, uv + dir * ca).b;

  /* ── The lens ─────────────────────────────────────────────────────────────
   *
   * A real depth of field. BokehPass upstream is stopped almost all the way
   * down and has to be (its depth pass is alpha-blind — see postfx.ts), so the
   * frame arrives here with EVERYTHING at one sharpness: a desk vignette two
   * feet from the lens and a city half a mile behind it, rendered identically.
   * That is not a subtle failure. It is what makes a painted plate read as an
   * upscale rather than as a photograph, because the one thing no upscaler can
   * fake and no lens can avoid is that focus falls off with distance.
   *
   * Depth here is not available and does not need to be: this frame's depth is
   * a COMPOSITION, and the composition is declared per plate (Stage →
   * PLATE_FOCUS). One soft ellipse around the thing the camera is focused on;
   * everything outside it is progressively resolved away, on a curve that is
   * flat across the subject and only bites once it is clear of it.
   *
   * Six taps on a rotated hexagon plus the centre — a hexagonal iris, which is
   * what a real fast prime gives a point source, and cheaper than the ring a
   * circular one would need. The radius is squared into the falloff so the
   * near midground gets a whisper and the far background gets the lot.
   */
  if (uFieldBlur > 0.0001) {
    vec2 fd = (vUv - uFocus.xy) / max(uFocus.zw, vec2(1e-4));
    float coc = smoothstep(0.85, 2.30, length(fd));
    coc *= coc;
    float rad = uFieldBlur * coc;
    if (rad > 0.0002) {
      vec3 acc = color;
      // Two hexagons, one at half radius, so the falloff inside the disc is
      // smooth rather than a ring of six ghosts around every highlight.
      for (int i = 0; i < 6; i++) {
        float th = float(i) * 1.0471976 + 0.3926991;
        vec2 o = vec2(cos(th), sin(th));
        o.y *= uResolution.x / max(uResolution.y, 1.0);
        acc += texture2D(tDiffuse, vUv + o * rad).rgb;
        acc += texture2D(tDiffuse, vUv + o * rad * 0.5).rgb;
      }
      color = mix(color, acc / 13.0, clamp(coc, 0.0, 1.0));
    }
  }

  // Lift / gamma / gain.
  color = color * uGain + uLift;
  color = max(color, 0.0);
  color = pow(color, 1.0 / max(uGamma, vec3(0.001)));

  // Contrast about a linear-ish pivot.
  color = (color - 0.18) * uContrast + 0.18;
  color = max(color, 0.0);

  // Highlight shoulder. The desk practical was printing its paper as a flat
  // near-white slab — a large area pinned near the top of the range with almost
  // no separation left inside it, which reads as a blown JPEG rather than as
  // lit paper. This takes roughly a stop off the top and hands the falloff its
  // gradient back. Two disciplines matter:
  //   • it is applied as a RATIO across all three channels, never per-channel.
  //     A per-channel knee compresses whichever channel is highest, so it walks
  //     a tungsten highlight toward white — precisely the opposite of what a
  //     warm practical does as it falls off;
  //   • what it pulls down it also warms, by the amount it pulled, so the paper
  //     runs amber-into-shadow instead of grey-into-shadow.
  float sL = dot(color, vec3(0.2126, 0.7152, 0.0722));
  if (sL > SHOULDER_K) {
    float rolled = SHOULDER_K + (SHOULDER_W - SHOULDER_K) *
      (1.0 - exp(-(sL - SHOULDER_K) / (SHOULDER_W - SHOULDER_K)));
    float k = rolled / max(sL, 1e-4);
    color *= k;
    color *= mix(vec3(1.0), vec3(1.05, 0.995, 0.90), clamp(1.0 - k, 0.0, 1.0));
  }

  /* ── The unifying pass: one ground under both halves ──────────────────────
   *
   * The frame is built from two asset pipelines and it showed. The left third is
   * an illustration — a desk, a shaded lamp, a mug, a headset, all of it painted,
   * every surface carrying a brush-scale mottle. The right third is a
   * photographic portrait plate. The plate already gets a painterly tooth of its
   * own in its material (see SPRITE_DIFFUSE_PATCH → uCanvas) and that closes the
   * gap from ONE side: it makes the photograph less smooth. It cannot make the
   * two halves share a surface, because the two tooths are generated in two
   * different spaces at two different frequencies by two different programs, and
   * "both are textured" is not the same claim as "both are the same painting".
   *
   * This is the same claim. One field, in SCREEN space, over the whole composited
   * frame — plate, room, props and the bloom that ties them together — so every
   * pixel in the picture sits on one ground at one brush frequency. It is the
   * paper the whole thing is printed on.
   *
   * Three properties earn it and each one is a decision:
   *   • it is STATIC. The emulsion below re-hashes every 16th of a second because
   *     grain is a property of the camera; a canvas tooth is a property of the
   *     SURFACE and must not crawl. A crawling tooth is the single fastest way to
   *     turn this from paper into video noise;
   *   • it is CHROMATIC, unlike the emulsion, which is deliberately achromatic.
   *     Pigment on a tooth breaks colour as well as value — the low spots hold
   *     more of it — and the tiny per-channel decorrelation here is what makes the
   *     photographic half stop reading as *cleaner* rather than merely *flatter*
   *     than the painted half;
   *   • it is TWO OCTAVES at a brush scale — ~17px and ~6px per cell at 1920,
   *     matched to the frequencies the plate's own tooth already runs at, and
   *     three to eight times coarser than the 2.2px emulsion, so the two fields
   *     can never be mistaken for one another or beat against each other.
   *
   * Ceiling ~1.9% value and ~0.7% chroma at the default grain mix. It must be
   * felt at 100% and invisible at a glance, exactly like the tooth of a paper.
   * Scaled by the grain setting so one slider still retires the whole emulsion
   * stack, and it runs BEFORE saturation and the split-tone so the tint sits on
   * top of the ground the way ink does rather than beside it. */
  float tAmt = clamp(uGrain, 0.0, 1.0);
  vec2 tUv = vUv * uResolution / max(uResolution.y, 1.0);
  float tCoarse = vnoise(tUv * 64.0);
  float tFine = vnoise(tUv * 190.0);
  float tooth = (tCoarse - 0.5) * 0.62 + (tFine - 0.5) * 0.38;
  // Per-channel offsets are a fraction of a cell, so the three fields are the
  // SAME tooth sampled a hair apart — pigment settling — never three noises.
  vec3 toothRGB = vec3(
    vnoise(tUv * 64.0 + vec2(0.21, 0.0)),
    tCoarse,
    vnoise(tUv * 64.0 + vec2(0.0, 0.24))
  ) - 0.5;
  color *= 1.0 + tooth * 0.038 * tAmt;
  color *= 1.0 + toothRGB * 0.014 * tAmt;

  // Saturation.
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, uSaturation);

  // Teal ↔ orange split-tone, weighted by luminance.
  vec3 shadowTint = vec3(0.06, 0.34, 0.44);
  vec3 highTint   = vec3(0.98, 0.62, 0.30);
  vec3 split = mix(shadowTint, highTint, smoothstep(0.0, 0.9, luma));
  color = mix(color, color * (0.55 + 0.9 * split), clamp(uSplitTone, 0.0, 1.0) * 0.55);

  /* ── The shadow family ────────────────────────────────────────────────────
   *
   * Between the warm desk pool and the teal city there is a band of floor and
   * partition that belongs to NEITHER — the plate painted it a murky
   * yellow-green, the split-tone above cannot reach it (a multiply by a tint
   * only bends a colour that already has chroma in the right place), and a
   * region that is outside the grade is the fastest palette-incoherence read a
   * frame can offer. It is the "mid-frame mush" note, and it is a colour note
   * rather than a detail one.
   *
   * So the darks are given one family. The mix target is LUMINANCE × the room's
   * own teal, peak-normalised and then divided by its own luma, which makes the
   * operation exactly value-preserving: it moves the hue of a shadow toward the
   * window and never its exposure. Weighted to bite hardest between the black
   * floor and the low midtones — the band the murk actually lives in — and to
   * be gone by the time it would reach the lamp pool.
   */
  if (uShadowBridge > 0.0001) {
    float sb = dot(color, vec3(0.2126, 0.7152, 0.0722));
    // Peak-normalised #7db4c8 pushed a step cooler, ÷ its own luma (0.834).
    vec3 shadowFamily = vec3(0.50, 0.90, 1.00) * 1.199;
    float w = smoothstep(0.0012, 0.010, sb) * (1.0 - smoothstep(0.030, 0.130, sb));
    color = mix(color, vec3(sb) * shadowFamily, clamp(uShadowBridge, 0.0, 1.0) * w);
  }

  // Vignette. Deliberately a LONG, shallow falloff: the old curve reached its
  // floor before the corner and stamped the frame with a near-black ring, which
  // over an already dark plate reads as muddy crush rather than as a lens. The
  // radius now starts outside the safe area, the shoulder is gentle, and the
  // applied strength is capped so window mullions and the desk silhouette stay
  // barely readable in the corners instead of disappearing.
  float vAmt = min(clamp(uVignette, 0.0, 1.0), 0.55);
  float vig = smoothstep(1.30, 0.30, r2 * (1.0 + vAmt * 1.6));
  color *= 1.0 - vAmt * (1.0 - vig);

  // Frame-right exit guard.
  //
  // A radial vignette is weakest exactly where a 16:9 frame leaks hardest: the
  // middle of the short edges, where r2 is smallest for a given distance from
  // centre. On the ops plate that band holds a cluster of city bokeh a few
  // pixels off the right edge, and it was the brightest thing outboard of the
  // speaker — an object with nowhere to go, dragging the eye off the picture
  // at the one place the composition has nothing to say. So the outer tenth of
  // the frame carries its own long falloff, independent of the radius. 192px at
  // 1920, ramped on a smoothstep, ~-0.6 stop at the extreme edge: a colourist's
  // edge window, not a mask — the mullions and the desk silhouette are still
  // legible inside it.
  //
  // 0.40 → 0.18, and the ramp starts 60px later. The window was drawn against a
  // composition whose problem was a cluster of bokeh leaking off the right edge;
  // the composition has since been given a second mullion, a lit far bench and
  // a floor out there, and against THAT the same window is no longer a
  // colourist's edge — it is the reason the outboard third reads as an
  // undifferentiated hole. A sixth of a stop at the extreme edge still stops the
  // eye walking out of frame; four tenths deletes the counterweight.
  color *= 1.0 - 0.18 * smoothstep(0.93, 1.0, vUv.x);

  // Black floor. Crushing to pure 0 turns whole regions into a void that reads
  // as "missing render" rather than "night", and — worse in a STILL — a region
  // pinned within two code values of zero has no room left for the dither that
  // stops a 400px gradient banding across it.
  //
  // Lifted ~40% (0.0105 → 0.0148 linear), which is about +3.5% at the output
  // after three's ACES fit and the sRGB encode: the deepest black in frame now
  // lands near #12 rather than near #0a. That figure is chosen against the
  // vignette, which is applied immediately above this line and takes ~28% out
  // of the bottom corners — so the corners were reaching the floor and staying
  // there, and the floor is the only thing that can give them back a value.
  // Applied AFTER the vignette on purpose, for exactly that reason.
  //
  // Deliberately NEUTRAL: the previous floor was blue enough that anywhere the
  // vignette bit went cyan-muddy rather than simply dark. White is untouched.
  const vec3 BLACK_FLOOR = vec3(0.0148, 0.0150, 0.0139);
  color = BLACK_FLOOR + color * (1.0 - BLACK_FLOOR);

  // Film grain. Six disciplines keep it emulsion and not a screen door:
  //   • the field is hashed per grain CELL straight off gl_FragCoord — no value
  //     -noise lattice, no interpolation, no texture — so it cannot tile;
  //   • hash13 (sin-free, well distributed at 4-digit coordinates) replaces the
  //     old fract(p.x*p.y) hash, which resolved into a visible dot grid on flats;
  //   • the cell lattice is OFFSET BY A RANDOM AMOUNT EVERY STEP, so the grain
  //     never locks to the pixel grid twice running. A fixed lattice at a fine
  //     cell size is precisely what reads as a fixed fine grid / screen door,
  //     however well distributed the hash inside it is;
  //   • it is high-passed against a 3× coarser field, killing the low-frequency
  //     clumping that reads as blotch and leaving a blue-noise-ish sparkle;
  //   • it is ACHROMATIC (luminance-only) and applied MULTIPLICATIVELY. A
  //     linear-space *additive* grain explodes in the toe once sRGB encoding
  //     stretches it; a relative modulation survives the transfer curve at
  //     near-constant perceived strength. The coefficient is set so the DEFAULT
  //     mix (0.5 setting × 0.5 theme) peaks around 2% and a maxed-out slider
  //     still stays inside ~9% — the old 0.55 reached ±40% and gridded the frame;
  //   • it is rolled off in the highlights so a practical never picks up crawl,
  //     but it is NOT switched off in the toe. Killing it below ~2% luma left
  //     the lit desk pool grained and the entire dark two-thirds of the frame
  //     plastic-clean — two emulsions in one shot, which is exactly the "the
  //     photographic region and the soft bokeh are different renderers" read
  //     the grade exists to erase. The blacks keep a third of the field, and a
  //     small ADDITIVE term carries it where a multiplicative one cannot (near
  //     zero there is nothing to modulate), doubling as dither in the long
  //     falloffs.
  float gLum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float gw = 1.0 - 0.55 * smoothstep(0.25, 1.2, gLum);       // roll off in highlights
  gw *= 0.34 + 0.66 * smoothstep(0.0020, 0.0185, gLum);       // and eased into the toe
  float gToe = 1.0 - smoothstep(0.004, 0.045, gLum);          // 1 in the blacks, 0 by mid
  // Bottom-right weighting. Not a second emulsion and not a quadrant with an
  // edge: one very long, very soft ramp over the corner where BOTH deep-shadow
  // problems live at once — the vignette is deepest there and the dialogue
  // scrim's 400px ramp lands on top of it, which is precisely the surface an
  // 8-bit display bands on. Grain is the dither that kills that, so it is
  // strongest exactly where the gradient is longest and the values are lowest.
  // The ramps are half a frame wide, so there is no boundary anywhere for the
  // eye to find; vUv.y is 0 at the bottom of the frame.
  float gCorner = smoothstep(0.40, 0.95, vUv.x) * (1.0 - smoothstep(0.06, 0.56, vUv.y));
  float gq = uGrain * (1.0 + 0.8 * gCorner);
  float gt = floor(uTime * 16.0);
  vec2 gjit = vec2(hash13(vec3(gt, 3.7, 11.3)), hash13(vec3(gt, 91.1, 5.9))) * 512.0;
  vec2 gcell = floor((gl_FragCoord.xy + gjit) / max(uGrainSize, 0.5));
  float gFine = hash13(vec3(gcell, gt));
  float gCoarse = hash13(vec3(floor(gcell * 0.3333), gt + 19.0));
  float g = (gFine - 0.5) - (gCoarse - 0.5) * 0.5;
  // 0.185 → 0.212. The DOM emulsion above the render has just been paid down by
  // a third (see .pq-plate), because a source-over grey field lifts blacks and
  // this one does not — it is a relative modulation. Same total grain in the
  // finished frame, redistributed onto the term that costs the toe nothing.
  color *= 1.0 + g * gq * 0.212 * gw;
  // The additive term is the one that actually dithers near zero (there is
  // nothing to modulate down there), so it carries the corner weighting hardest.
  color += g * gq * (0.0008 + 0.0038 * gToe) * (1.0 + 0.5 * gCorner);

  // Glitch scanline darkening.
  if (uGlitch > 0.0001) {
    float sl = sin(vUv.y * uResolution.y * 1.4) * 0.5 + 0.5;
    color *= mix(1.0, 0.82 + 0.18 * sl, uGlitch * 0.5);
  }

  // Flash to white.
  color = mix(color, vec3(1.0), clamp(uFlash, 0.0, 1.0));

  gl_FragColor = vec4(max(color, 0.0), 1.0);
}
`;

/**
 * Background transition pass. Blends a frozen snapshot of the OUTGOING scene
 * (`tPrev`) into the freshly-rendered INCOMING scene (`tDiffuse`) as `uProgress`
 * runs 0→1. Idle (`uActive == 0`) is a pure pass-through of the live scene.
 * Kinds: 0 dissolve · 1 crossfade · 2 iris · 3 light-bleed.
 */
export const TRANSITION_FRAGMENT = /* glsl */ `
varying vec2 vUv;
uniform sampler2D tDiffuse;   // incoming (live) scene
uniform sampler2D tPrev;      // frozen outgoing snapshot
uniform float uProgress;      // 0 → prev, 1 → next
uniform float uActive;        // 0 idle (passthrough), 1 transitioning
uniform float uKind;          // 0 dissolve, 1 crossfade, 2 iris, 3 light-bleed
uniform float uTime;
uniform vec2  uResolution;
uniform vec3  uKey;           // theme key color for edge glow

${GLSL_NOISE}

void main() {
  vec3 next = texture2D(tDiffuse, vUv).rgb;
  if (uActive < 0.5) {
    gl_FragColor = vec4(next, 1.0);
    return;
  }
  vec3 prev = texture2D(tPrev, vUv).rgb;
  float p = clamp(uProgress, 0.0, 1.0);
  vec3 col;

  if (uKind < 0.5) {
    // Dissolve — animated noise threshold with a glowing wavefront.
    float n = vnoise(vUv * 7.0) * 0.6 + vnoise(vUv * 23.0) * 0.4;
    float w = 0.12;
    float e = smoothstep(p - w, p + w, n);
    col = mix(next, prev, e);
    float edge = (1.0 - abs(n - p) / w);
    edge = clamp(edge, 0.0, 1.0);
    col += uKey * edge * 0.6 * smoothstep(0.0, 0.15, p) * smoothstep(1.0, 0.85, p);
  } else if (uKind < 1.5) {
    // Crossfade.
    col = mix(prev, next, smoothstep(0.0, 1.0, p));
  } else if (uKind < 2.5) {
    // Iris — soft circular reveal from the center.
    vec2 c = vUv - 0.5;
    c.x *= uResolution.x / max(uResolution.y, 1.0);
    float d = length(c);
    float radius = p * 1.15;
    float m = smoothstep(radius + 0.06, radius - 0.06, d);
    col = mix(prev, next, m);
    float ring = clamp(1.0 - abs(d - radius) / 0.05, 0.0, 1.0);
    col += uKey * ring * 0.5;
  } else {
    // Light-bleed — signature chapter/scene break: bloom to white, reveal.
    float b = sin(p * 3.14159265);
    float wipe = smoothstep(p - 0.25, p + 0.25, vUv.x);
    vec3 base = mix(prev, next, mix(smoothstep(0.0, 1.0, p), wipe, 0.4));
    col = mix(base, vec3(1.0), b * 0.92);
  }

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

/**
 * GLSL injected into a MeshBasicMaterial (via onBeforeCompile) to give
 * character sprites a speaking brighten, desaturation-on-dim, and tint —
 * while keeping three's correct sRGB texture decode and tone-map handling.
 */
export const SPRITE_UNIFORMS_DECL = /* glsl */ `
uniform float uBright;
uniform float uDesat;
uniform float uTintAmt;
uniform vec3  uTint;
uniform float uPlateDesat;
uniform float uPlateSplit;
uniform float uPlateCool;
uniform float uEnvTint;
uniform float uCanvas;
uniform float uPaint;
uniform float uBrush;

/** Cheap 2->1 hash + smoothed value noise, local to the sprite program. The
 *  stage's shared GLSL_NOISE is only injected into the post passes; a plate
 *  needs its own because the tooth below is sampled in TEXTURE space, not in
 *  screen space (see the uCanvas note). */
float pqPlateHash(vec2 p) {
  p = fract(p * vec2(127.13, 311.7));
  p += dot(p, p + 42.21);
  return fract(p.x * p.y);
}
float pqPlateNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(pqPlateHash(i), pqPlateHash(i + vec2(1.0, 0.0)), u.x),
    mix(pqPlateHash(i + vec2(0.0, 1.0)), pqPlateHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
`;

/**
 * Plate integration — the seam-killer.
 *
 * A character plate is photographed warm and clean; the room it is dropped into
 * has been through a colourist's grade. The composite pass downstream then
 * grades BOTH together, which preserves the difference between them rather than
 * removing it: whatever separation the plate arrived with, it still has. So the
 * plate is pre-graded here, in its own material, toward the scene:
 *
 *   • uPlateDesat pulls its saturation (skin is the most saturated thing in a
 *     night frame by a wide margin, and it is the tell);
 *   • uPlateSplit runs the same teal↔amber split-tone the GRADE_FRAGMENT runs,
 *     with the same (0.55 + 0.9 · tint) shape, so the plate's shadows fall
 *     toward the room's teal (#0e2a2c) and its lit side toward the practical's
 *     amber (#e8a95f) instead of staying skin-coloured in both;
 *   • uPlateCool then pulls the room's teal into the SPECULAR end — the sheen
 *     on a cheekbone, a forehead, a knuckle. The split-tone above sends the
 *     highlights warm because the key light is warm, which is correct and, on
 *     its own, insufficient: a real face in this room is also being hit by a
 *     monitor and a wall of city glass, and the brightest points on skin are
 *     precisely where a cool bounce shows. Without it her highlights are the
 *     only surface in frame carrying no teal at all, and the eye finds the one
 *     object that isn't in the grade.
 *
 * Both tints are the peak-normalised hue of those two colours, scaled to the
 * same magnitudes GRADE_FRAGMENT uses, which is why the two passes agree.
 * Grain is deliberately NOT applied here: one emulsion over render + plate + UI
 * is laid down once, downstream, and that is the point of it.
 */
export const SPRITE_DIFFUSE_PATCH = /* glsl */ `
#include <map_fragment>
/* ── The brush, and the only note colour could never answer ─────────────────
 *
 * Everything below this block is a COLOUR operation: desaturate the plate,
 * split-tone it, cool its speculars, lay the room's ambient over it. All of it
 * is correct and none of it touches the actual complaint, which is that the
 * desk still-life is PAINTED — surfaces described in strokes, detail resolved
 * only as far as a brush resolves it — and the portrait is PHOTOGRAPHED, with
 * pore-level micro-detail and a sensor's isotropic noise. Two renderers in one
 * image. The eye finds the smooth, over-resolved object and files the frame as
 * two sourced assets composited together, which is exactly the verdict.
 *
 * A brush does two things a lens does not: it AVERAGES what is under it, and it
 * averages DIRECTIONALLY. So the plate is re-sampled along a stroke:
 *
 *   • the stroke ANGLE comes from low-frequency value noise in the plate's own
 *     uv (~26 × 17 cells — a stroke is about a fortieth of a portrait wide), so
 *     the direction holds over a patch and turns as it crosses the form, the
 *     way a hand loads and lays down a mark;
 *   • four taps: two along the stroke and two half a step off it to either
 *     side, which is a short flat brush rather than a symmetric blur. A
 *     symmetric blur is soft focus and reads as a mistake; an anisotropic one
 *     reads as a mark;
 *   • the mix is capped in the interior only. Both the tap average and the raw
 *     sample must be fully opaque before any smearing happens, so the plate's
 *     silhouette — the one edge that must stay cut — never picks up a halo, and
 *     the feather at her shoulder is left exactly as the matte drew it.
 *
 * Applied BEFORE the grade so everything downstream operates on the painted
 * surface, and read together with the tooth at the end of this patch (which
 * puts the ground back under the stroke) it is the whole answer to "unify the
 * rendering language": compressed detail, visible directional structure, and a
 * noise field at the same scale as the room's.
 */
float _brushAng = pqPlateNoise(vMapUv * vec2(26.0, 17.0)) * 6.2831853;
vec2  _brushDir = vec2(cos(_brushAng), sin(_brushAng)) * uBrush;
vec2  _brushOrt = vec2(-_brushDir.y, _brushDir.x) * 0.45;
vec4  _brush = texture2D(map, vMapUv + _brushDir)
             + texture2D(map, vMapUv - _brushDir)
             + texture2D(map, vMapUv + _brushDir * 0.45 + _brushOrt)
             + texture2D(map, vMapUv - _brushDir * 0.45 - _brushOrt);
_brush *= 0.25;
float _brushCore = step(0.995, _brush.a) * step(0.995, sampledDiffuseColor.a);
diffuseColor.rgb = mix(diffuseColor.rgb, _brush.rgb, clamp(uPaint, 0.0, 1.0) * _brushCore);
diffuseColor.rgb *= uBright;
float _spriteLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
diffuseColor.rgb = mix(vec3(_spriteLuma), diffuseColor.rgb, 1.0 - clamp(uDesat, 0.0, 1.0));
diffuseColor.rgb = mix(diffuseColor.rgb, uTint, clamp(uTintAmt, 0.0, 1.0));
float _plateLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
diffuseColor.rgb = mix(vec3(_plateLuma), diffuseColor.rgb, 1.0 - clamp(uPlateDesat, 0.0, 1.0));
vec3 _plateShadow = vec3(0.140, 0.420, 0.440);
vec3 _plateHigh   = vec3(0.980, 0.713, 0.401);
vec3 _plateSplit  = mix(_plateShadow, _plateHigh, smoothstep(0.0, 0.9, _plateLuma));
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  diffuseColor.rgb * (0.55 + 0.9 * _plateSplit),
  clamp(uPlateSplit, 0.0, 1.0)
);
// Cool bounce in the speculars only — smoothstep starts well above mid so it
// never touches skin midtones, which would read as a colour cast on the face
// rather than as light on it.
float _plateSpec = smoothstep(0.36, 0.88, _plateLuma);
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  diffuseColor.rgb * vec3(0.855, 1.0, 1.075),
  _plateSpec * clamp(uPlateCool, 0.0, 1.0)
);
/* Environmental tint — the room's ambient, over ALL of her.
 *
 * uPlateCool above only reaches the speculars, on the reasoning that a cool
 * bounce shows on a sheen. True, and it leaves the other 90% of her surface
 * area carrying no ambient at all: a figure whose midtones and shadows are
 * innocent of the room she is sitting in is a figure that was lit somewhere
 * else, and that is the read the critic gave the frame. Every object in a
 * night interior with a wall of city glass behind it sits in a weak teal
 * ambient; this is hers.
 *
 * Mixed toward LUMINANCE × the ambient hue rather than toward a flat colour,
 * and the hue is scaled by 1/its own luma (0.725) so the operation is exactly
 * value-preserving: it moves her chroma toward the room and never her
 * exposure. 12% is the point where she stops being the only warm-only object
 * in frame and still, unmistakably, has blood in her.
 */
vec3 _envHue = vec3(0.42, 0.80, 0.88) * 1.379;
float _envLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
diffuseColor.rgb = mix(
  diffuseColor.rgb,
  vec3(_envLuma) * _envHue,
  clamp(uEnvTint, 0.0, 1.0)
);
/* Painterly tooth — the last difference between the two renderers.
 *
 * The room is a painting: every surface in it carries a mottle at the scale of
 * a brush, and the plate — however well graded — carries a perfectly smooth
 * one. Colour operations cannot close that gap, because it is not a colour
 * difference, it is a TEXTURE difference, and the eye finds the smooth object
 * and calls it pasted.
 *
 * Two octaves of value noise in the plate's OWN uv (not screen space — this is
 * a property of the painted surface, so it must parallax and breathe with her,
 * unlike the emulsion downstream which is a property of the camera). The
 * frequencies are chosen against the plate's on-screen size: ~64 × 40 cells is
 * a brush stroke, ~190 × 120 is the tooth of the ground under it, and both sit
 * comfortably above two screen pixels per cell so neither can alias into a
 * grid. Applied MULTIPLICATIVELY, so it modulates what is there and cannot
 * fog her shadows.
 */
float _tooth = (pqPlateNoise(vMapUv * vec2(64.0, 40.0)) - 0.5) * 0.62
             + (pqPlateNoise(vMapUv * vec2(190.0, 120.0)) - 0.5) * 0.38;
diffuseColor.rgb *= 1.0 + _tooth * 2.0 * clamp(uCanvas, 0.0, 1.0);
`;

/* ───────────────────────────  Rain ↔ light coupling  ───────────────────────────
 *
 * Uniform white ticks over a whole frame read as an overlay pasted on top of the
 * art. Real rain is only visible where something is lighting it. `uLight` is a
 * 64×36 luminance/colour reduction of the background currently on stage (built
 * once per scene, see Stage.updateLightField), sampled in SCREEN space: a streak
 * crossing the amber lamp cone flares amber, one crossing the teal skyline bloom
 * flares teal, and one over dead black all but disappears.
 *
 * Injected into three's PointsMaterial via onBeforeCompile so size attenuation,
 * the sprite map and tone mapping all keep working. */
export const LIGHTFIELD_GLSL = /* glsl */ `
uniform sampler2D uLight;
uniform float uHasLight;
uniform vec2 uLightRes;
/**
 * Screen-space occupancy of the speaker — centre.xy, half-extents.zw, in the
 * same 0..1 y-up frame as pqScreenUv(). Published every frame by the Stage
 * (see Stage.publishFigureMask) from the plate's own solid core, so it tracks
 * her breathing, her entrance and any camera drift without a second render.
 *
 * She is INDOORS. Every drop in this rig is on the far side of the pane, so a
 * streak drawn at full strength across her cheek is not weather, it is proof
 * that the weather layer and the figure were never in the same space — the
 * loudest compositing tell the frame carries. The consumers below fence
 * themselves against it: the falling field all but disappears over her, the
 * water on the glass merely thins (the pane really is in front of her, and
 * saying so is half of what makes the shot read as *through a window* rather
 * than as rain stickered onto a portrait).
 */
uniform vec4 uFigure;
uniform float uFigureAmt;
/**
 * ── The interior fence ───────────────────────────────────────────────────────
 *
 * The camera is INSIDE. Everything this rig draws — the falling field, the
 * rivulets, the sheet, the mullion — belongs to the far side of a pane, and the
 * near third of this frame is a desk with a lamp, a mug, a headset and a
 * monitor sitting on it. A streak crossing the lamp's shade is not weather; it
 * is proof that the weather layer never had a plane, and it is the single
 * loudest note the frame came back with ("unmotivated rain over the whole
 * picture").
 *
 * The figure fence above answers the same question for a PERSON, and it answers
 * it with a projected bound published every frame. A room's furniture cannot be
 * projected — it is painted into the plate — so it is DECLARED instead: up to
 * three soft ellipses in the same 0..1 y-up framed screen the light field is
 * sampled in, authored per background beside its screen prop (see
 * Stage → PLATE_INTERIOR).
 *
 * Ellipses, never boxes, and that is not a stylistic preference: an
 * axis-aligned rectangle of "no rain" has straight edges, and a straight edge
 * in a weather field is a matte. A superellipse would round the corners and
 * still terminate; a plain ellipse with a long shoulder cannot draw a line
 * anywhere, at any strength.
 */
uniform vec4 uInteriorA;
uniform vec4 uInteriorB;
uniform vec4 uInteriorC;
uniform vec4 uInteriorD;
/** Per-ellipse shoulder width, as a fraction of each radius. */
uniform vec4 uInteriorSoft;
/** Master amount. 0 retires the fence — a plate with no declared interior keeps
 *  exactly the weather it had. */
uniform float uInteriorAmt;
/**
 * Where this fragment is on screen, 0..1, y up.
 *
 * Straight off gl_FragCoord, NEVER off an interpolated gl_Position.xy/w. Both
 * consumers here live on planes the camera looks at from an angle (the camera
 * tracks the origin, so nothing is exactly parallel to the image plane), and a
 * varying is resolved with perspective correction — which for a quantity that
 * is already divided by w lands somewhere that is neither. The error is not
 * academic: it put the glass reflection a couple of hundred pixels below where
 * the stage placed it, i.e. off the pane and onto the carpet, which is exactly
 * the unmotivated smear the frame was failing on.
 */
vec2 pqScreenUv() {
  return clamp(gl_FragCoord.xy / max(uLightRes, vec2(1.0)), 0.0, 1.0);
}
/** Peak-normalized hue of the light behind a screen-space point. */
vec3 lightHue(vec3 c) {
  float m = max(c.r, max(c.g, c.b));
  return c / max(m, 0.001);
}
/**
 * 1 deep inside the speaker, 0 clear of her, with a long soft shoulder.
 *
 * The falloff is deliberately wide (0.70 → 1.10 of the core radius): a crisp
 * cut-out would trade one seam for another — a rain-shaped hole in the exact
 * silhouette of a portrait — and the plate's own edge is a 200px feather, not
 * a line. A gradient is the only honest boundary here.
 */
float pqFigure(vec2 uv) {
  vec2 d = (uv - uFigure.xy) / max(uFigure.zw, vec2(1e-4));
  return uFigureAmt * (1.0 - smoothstep(0.70, 1.10, length(d)));
}
/** One interior ellipse: 1 deep inside, 0 clear of it, with a long shoulder. */
float pqInteriorLobe(vec2 uv, vec4 e, float soft) {
  if (e.z <= 0.0 || e.w <= 0.0) return 0.0;
  float d = length((uv - e.xy) / max(e.zw, vec2(1e-4)));
  return 1.0 - smoothstep(max(1.0 - soft, 0.0), 1.0 + soft, d);
}
/** 1 where the room's own furniture occludes the pane, 0 out on the glass. */
float pqInterior(vec2 uv) {
  float m = pqInteriorLobe(uv, uInteriorA, uInteriorSoft.x);
  m = max(m, pqInteriorLobe(uv, uInteriorB, uInteriorSoft.y));
  m = max(m, pqInteriorLobe(uv, uInteriorC, uInteriorSoft.z));
  m = max(m, pqInteriorLobe(uv, uInteriorD, uInteriorSoft.w));
  return m * clamp(uInteriorAmt, 0.0, 1.0);
}
`;

export const RAIN_VERTEX_DECL = /* glsl */ `
varying float vStreak;
attribute float aStreak;
`;

/**
 * Per-drop size jitter, patched over three's `gl_PointSize = size;`.
 *
 * A point sprite is square, so one multiplier varies a streak's LENGTH and its
 * WIDTH together — which is the whole complaint: every drop was drawn at the
 * identical width and the identical length, at every depth, and a field of
 * identical ticks reads as an overlay stamped on the plate rather than as rain
 * falling through it.
 *
 * 0.55…1.45 was not a wide enough spread to survive the grade: at 0.9 base
 * opacity over a dark plate the shortest drop and the longest differed by about
 * one visible streak-length, and the field still read as one gauge. 0.40…1.70,
 * mean 1.05 — a factor of four between the smallest drop and the largest, which
 * is roughly what a real rain field spans across two metres of depth.
 */
export const RAIN_POINTSIZE_PATCH = /* glsl */ `
vStreak = aStreak;
gl_PointSize = size * (0.40 + 1.30 * aStreak);`;

export const RAIN_FRAGMENT_DECL = /* glsl */ `
varying float vStreak;
${LIGHTFIELD_GLSL}
`;

export const RAIN_DIFFUSE_PATCH = /* glsl */ `
vec3 _behind = texture2D(uLight, pqScreenUv()).rgb;
float _behindLum = dot(_behind, vec3(0.2126, 0.7152, 0.0722));
float _lit = mix(1.0, smoothstep(0.03, 0.30, _behindLum), uHasLight);
// Over dead blacks a streak keeps only a whisper; in a practical it flares.
diffuseColor.a *= mix(0.15, 1.0, _lit);
// Per-drop exposure, 16–92%, and DECORRELATED from the length above.
// Uniform opacity across a field is the other half of the "identical ticks"
// tell — but driving length and exposure off the same attribute only trades it
// for a rule (every long streak is also the brightest one), which the eye finds
// just as fast. One cheap hash off the same attribute gives the second axis its
// own distribution at zero extra cost, so a field now contains short bright
// drops and long faint ones as well as the obvious pairs. Mean is 0.54 against
// the old 0.55, so the field's overall density is unchanged.
float _expo = fract(vStreak * 43.7585 + 0.3713);
diffuseColor.a *= mix(0.16, 0.92, _expo);
// …and the figure fence. Rain falls OUTSIDE; she is at a desk inside. Held at
// 18% rather than 0 so the two or three streaks crossing the bright bokeh
// beside her ear still carry a whisper of continuity across the silhouette —
// a field that stops dead at her outline reads as a matte, which is the very
// thing this exists to remove.
diffuseColor.a *= mix(1.0, 0.18, pqFigure(pqScreenUv()));
// …and the interior fence, which unlike the figure is absolute. The pane is a
// PLANE: a drop cannot be in front of the desk lamp and behind the window at
// the same time, and the compromise the figure gets (18%, so the field carries
// continuity across a feathered silhouette) has no equivalent here — a painted
// prop has no feather, it simply occludes. 2% is left so the ellipse's own
// shoulder still resolves smoothly rather than terminating on a zero.
diffuseColor.a *= mix(1.0, 0.02, pqInterior(pqScreenUv()));
diffuseColor.rgb = mix(diffuseColor.rgb, lightHue(_behind), 0.62 * _lit);
diffuseColor.rgb *= 0.8 + 1.15 * _lit;
outgoingLight = diffuseColor.rgb;
`;

/**
 * Rain-on-glass pass — a screen-space near plane carrying the two things that
 * separate "weather on the glass" from "weather overlay":
 *   • 3 slow rivulets tracking down the pane, lit only by what is behind them,
 *   • a soft reflection of the scene's own brightest practical, thrown onto the
 *     glass on the opposite side of frame (position/colour derived from the
 *     background itself, so it is always motivated and never invented).
 * Everything is gated by `uOpacity`, which follows the rain amount.
 */
export const GLASS_VERTEX = /* glsl */ `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const GLASS_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform vec2  uRefl;       // screen-space position of the reflected practical
uniform vec3  uReflColor;
uniform float uReflAmt;
${LIGHTFIELD_GLSL}

/** Local 2->1 hash — GLSL_NOISE is not injected here, and the pane needs one
 *  cheap stationary field for the dried-spray haze on its specular. */
float pqHash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

/**
 * One rivulet: a hairline core dragging a short decaying tail, with a slightly
 * fatter bead at the head. Widths are in screen-UV, so ~0.001 ≈ 2px at 1080p —
 * any thicker and it stops being water and starts being a worm.
 */
float rivulet(vec2 uv, float x0, float speed, float phase, float width, float decay) {
  float wob = sin(uv.y * 9.0 + phase) * 0.0022 + sin(uv.y * 23.0 + phase * 2.3) * 0.0008;
  float dx = uv.x - (x0 + wob);
  float head = 1.16 - fract(uTime * speed + phase * 0.13) * 1.4;
  float above = uv.y - head;
  // decay is per-rivulet, and that is the point: every trail used to fall off
  // at the same 4.6, so all six were the same LENGTH however different their
  // gauges and speeds were — six copies of one line again, one axis down. A fat
  // slow bead drags a long trail; a fine fast one is nearly all head.
  float tail = smoothstep(-0.010, 0.004, above) * exp(-max(above, 0.0) * decay);
  float core = exp(-pow(dx / width, 2.0)) * tail;
  float bead = exp(-pow(dx / (width * 2.3), 2.0)) * exp(-pow(above / 0.013, 2.0));
  return core + bead * 0.55;
}

/**
 * The whole pane's worth of water, as one field.
 *
 * Eight rivulets at eight genuinely different gauges, speeds and tail lengths.
 * They used to run 0.0011 / 0.0009 / 0.0010 wide at near-identical speeds —
 * three copies of one
 * line, which is what makes water on glass read as a repeated texture. Sampled
 * as a field (rather than summed inline) so the refraction below can take its
 * horizontal derivative with a central difference.
 */
float rivuletField(vec2 uv) {
  return rivulet(uv, 0.585, 0.055, 0.0, 0.0024, 3.4) * 0.85
       + rivulet(uv, 0.668, 0.039, 5.7, 0.0014, 6.1) * 0.60
       + rivulet(uv, 0.742, 0.031, 2.1, 0.0012, 7.8) * 0.55
       + rivulet(uv, 0.906, 0.047, 4.4, 0.0018, 4.4) * 0.70
       // Two more across the dead middle third. Every rivulet used to live at
       // x > 0.58 — all of the water was on the right half of the pane and the
       // centre of the frame carried no weather at all, which is half of why
       // that band read as an undesigned hole. Deliberately the faintest two of
       // the six: over near-black the lit gate keeps them around 5%, which is
       // enough to say "there is glass here" and not enough to be seen.
       + rivulet(uv, 0.335, 0.043, 1.3, 0.0013, 5.5) * 0.44
       + rivulet(uv, 0.452, 0.036, 3.9, 0.0010, 8.6) * 0.38
       // …and two ACROSS THE LAMP, which is the one place on this pane where
       // water can be properly seen. Everything in the field so far runs over
       // city bokeh or over near-black, so every drop in the frame was cool or
       // invisible and the weather belonged to a different light than the room
       // did. These two cross the practical at x≈0.15–0.21, where the light
       // field behind them is
       // the lamp's own amber: lightHue() below then flares them warm, for free
       // and entirely motivated — the same coupling that makes a streak crossing
       // the skyline flare teal. Two or three beads catching the lamp is what
       // welds the glass to the room instead of laying it over the top.
       + rivulet(uv, 0.148, 0.050, 2.7, 0.0021, 4.0) * 0.62
       + rivulet(uv, 0.209, 0.034, 0.6, 0.0012, 7.0) * 0.40;
}

/**
 * Track marks — the healed trails of every rivulet that has already run.
 *
 * The rivulets say "water is moving on this pane". They cannot say "this pane
 * has been rained on for hours", and that is the difference between weather
 * drawn on a surface and weather that has a HISTORY on it. Real glass in a
 * storm carries a fine vertical striation of part-dried tracks between the live
 * beads: it is what the eye reads as a plane long before it notices a drop.
 *
 * Deliberately STATIC — a track is a property of the glass, not of the moment,
 * and a crawling one collapses straight back into a particle overlay. Two
 * incommensurate vertical rhythms with a slow lateral wander so no two tracks
 * are parallel, ceiling ~2% alpha, and it is the term the refraction below
 * leans on hardest: a dried track still bends what is behind it, which is the
 * whole reason the city has to shift as it crosses one.
 */
float trackField(vec2 uv) {
  float wob = sin(uv.y * 5.3) * 0.010 + sin(uv.y * 13.7 + 1.9) * 0.004;
  float a = sin((uv.x + wob) * 268.0);
  float b = sin((uv.x - wob * 0.6) * 173.0 + 2.4);
  // Sharpened toward the crests, so the field is a set of fine lines rather
  // than a corduroy of even ripples.
  return pow(max(a, 0.0), 7.0) * 0.62 + pow(max(b, 0.0), 11.0) * 0.38;
}

void main() {
  vec2 uv = pqScreenUv();
  vec3 behind = texture2D(uLight, uv).rgb;
  float behindLum = dot(behind, vec3(0.2126, 0.7152, 0.0722));
  float lit = mix(1.0, smoothstep(0.03, 0.30, behindLum), uHasLight);
  // Everything this pass draws lives on the far side of the pane, so every
  // term below is fenced by the room's own furniture. See pqInterior().
  float pane = 1.0 - pqInterior(uv);

  float riv = rivuletField(uv);
  // The pane has a bottom. The rivulets used to run the full height of the
  // frame, which put water tracking down the speaker's shoulder and down the
  // laptop lid in front of her — objects that are on THIS side of the glass.
  // Read at a glance that is not weather, it is a reflection smeared across a
  // figure, and it is the loudest compositing tell in the lower third. The
  // sill line retires them over the bottom band, which is also exactly the
  // band the dialogue is read in.
  //
  // 0.06→0.28 pulled down to 0.03→0.17. At the old numbers the pane ran out of
  // water a third of the way up the frame, which put its lower terminus right
  // across the speaker's shoulder: the streaks visibly STOPPED partway down
  // her, and a sheet of glass that ends in mid-air over a figure is a worse
  // read than no glass at all — it says "layer", not "window". The pane now
  // continues to within ~180px of the frame edge and only retires inside the
  // reading band itself.
  float sill = smoothstep(0.03, 0.17, uv.y);
  // The pane is genuinely in FRONT of her, so unlike the falling field the
  // water does not stop at her outline — it thins. Three quarters strength over
  // the figure (was one half): the claim a through-the-window frame makes is
  // that the glass demonstrably continues across the shot, and at half strength
  // over an unlit subject the arithmetic put the water at ~6% alpha, i.e. the
  // pane was, over the one object it most needed to cross, absent.
  float fig = pqFigure(uv);
  // Density: 0.42 at full light, and a FLOOR of 0.19 rather than 0.12 where
  // there is nothing lit behind the pane. The lit gate is what made the water
  // vanish over her coat and over the dead middle — correct as a light model,
  // wrong as a picture, because rain on a window is still visible against a
  // dark room by refraction alone. The floor is that refraction term.
  // 0.74 → 0.52 over the figure. Not a retreat from the claim — the opposite.
  // The pane now genuinely renders in FRONT of her (see Weather: renderOrder 40),
  // so this factor stopped being "how much of the water survives her feathered
  // edge" and became "how much water is lying on her face". 74% of the pane's
  // full density across a lit cheek is a portrait with rain stickered onto it;
  // 52% is a film you have to look for and cannot un-see once you have. The
  // water crosses her CONTINUOUSLY either way, which is the whole point: a
  // window that stops at a silhouette is not a window.
  float aRiv = clamp(riv, 0.0, 1.0) * uOpacity * mix(0.19, 0.42, lit) * sill
             * mix(1.0, 0.52, fig) * pane;

  // Refraction. A bead of water is a cylindrical lens: the city behind it does
  // not merely brighten, it SHIFTS. The field's own horizontal derivative gives
  // the lens power, so the light field is resampled displaced by it (and pushed
  // a touch down-frame, the way a drop drags what it carries). Blending that
  // displaced sample into the streak colour is what separates water on a pane
  // from white ticks drawn over a photograph. Two extra field evaluations —
  // the pass is gated by uOpacity and discards on empty glass.
  float e = 1.6 / max(uLightRes.x, 1.0);
  float gx = rivuletField(uv + vec2(e, 0.0)) - rivuletField(uv - vec2(e, 0.0));
  // The tracks bend light too, and being everywhere they are what actually
  // carries the "behind glass" read across the whole pane rather than at eight
  // isolated x positions. Their derivative is folded into the same lens.
  float tk = trackField(uv);
  gx += (trackField(uv + vec2(e, 0.0)) - trackField(uv - vec2(e, 0.0))) * 0.55;
  // Lens power 0.09 → 0.15. The displacement is what makes a bead read as a
  // bead and not as a white tick, and at the old value the shift was under a
  // texel of the 64×36 light field for every gauge but the fattest — i.e. the
  // refraction was, for four of the eight rivulets, arithmetically absent.
  vec3 refr = texture2D(uLight, clamp(uv + vec2(gx * 0.15, 0.012), 0.0, 1.0)).rgb;

  vec3 cRiv = mix(vec3(0.72, 0.80, 0.86), lightHue(behind), 0.7 * lit) * (0.75 + 0.8 * lit);
  // Gated on lit: lightHue() peak-normalises, so over dead black it would
  // amplify sensor noise into a confetti of saturated hues.
  cRiv = mix(cRiv, lightHue(refr) * (0.55 + 1.35 * lit), 0.45 * uHasLight * lit);

  // Reflected practical: a small soft lobe plus the vertical drag wet glass
  // gives it.
  //
  // HALF the radius it used to carry, and fenced to the pane. At the old size
  // — and free to land wherever the light field pointed, including the carpet —
  // it painted a ~400px amber bloom across the middle of the floor with nothing
  // in frame to cast it. That is not a reflection, it is a compositing seam,
  // and a seam is a hard fail. reflBand now kills it below the sill line, so
  // the only surface it can appear on is the glass the camera is behind.
  vec2 rp = uv - uRefl;
  float lobe = exp(-dot(rp / vec2(0.042, 0.021), rp / vec2(0.042, 0.021)));
  float drag = exp(-pow(rp.x / 0.013, 2.0)) * exp(-pow(max(-rp.y, 0.0) / 0.07, 1.7))
             * step(rp.y, 0.0);
  float reflBand = smoothstep(0.40, 0.54, uv.y);
  float aRefl = clamp(lobe * 0.8 + drag * 0.3, 0.0, 1.0) * uReflAmt * uOpacity * reflBand * pane;

  /* ── The sheet itself ────────────────────────────────────────────────────
   * Six rivulets and one reflection describe things ON the glass and still
   * never describe the GLASS: between them the pane is a perfect vacuum, so
   * the eye reads streaks floating in front of a photograph rather than a
   * surface with weather on it. Two ~2% terms give it a body:
   *
   *   • a broad diagonal specular — the room's own light raking across the
   *     sheet, the single cheapest cue that says "there is a plane here".
   *     Wide (sigma ~ 0.30 of the diagonal) and gated on the lit term, so it
   *     only ever appears where something is actually behind it to reflect;
   *   • a fine haze of dried spray, sampled off the same displaced light the
   *     rivulets refract, which is what stops the specular from reading as a
   *     flat gradient laid over the frame.
   *
   * Both are fenced by the sill line and thinned over the figure on the same
   * terms as the water. Ceiling is ~4% alpha: it must be felt, never seen.
   */
  float diag = uv.x * 0.62 + uv.y * 0.78;
  float sheenBand = exp(-pow((diag - 0.86) / 0.30, 2.0));
  float haze = 0.55 + 0.45 * pqHash21(floor(uv * uLightRes / 3.0));
  // The sheet is the one term that does NOT thin over her — 0.72 → 0.88. Every
  // other thing on this pane is an object lying on it and objects may be sparse;
  // the sheet is the pane ITSELF, and a sheet of glass that fades out where a
  // figure is behind it is not a sheet. At a ceiling of ~4% alpha it costs her
  // nothing and it is the term that actually carries the "she is on the far side
  // of a surface" read across her face.
  float aSheen = sheenBand * haze * (0.006 + 0.022 * lit) * uOpacity * sill
               * mix(1.0, 0.88, fig) * pane;
  vec3 cSheen = mix(vec3(0.70, 0.80, 0.88), lightHue(behind), 0.55 * lit);

  /* ── The tracks ──────────────────────────────────────────────────────────
   * The healed trails (see trackField). Two things are worth stating about the
   * levels, because both are what keep this a surface rather than a texture:
   *   • it is coloured off the REFRACTED sample, not off what is directly
   *     behind. That is the entire claim — a track that merely brightens is a
   *     scratch; a track that shows the city displaced is glass;
   *   • the lit gate is soft-floored at 0.28 rather than 0.19, because unlike a
   *     bead a dried track is visible against a dark room by its own scatter.
   * Ceiling ~2.2% alpha, and it is fenced by the pane and the sill like
   * everything else on this sheet. */
  float aTrack = clamp(tk, 0.0, 1.0) * uOpacity * mix(0.010, 0.030, lit) * sill
               * mix(1.0, 0.66, fig) * pane;
  vec3 cTrack = mix(vec3(0.66, 0.76, 0.84), lightHue(refr), 0.62 * lit) * (0.62 + 0.75 * lit);

  /* ── The mullion ─────────────────────────────────────────────────────────
   *
   * Rivulets, a specular and a reflection describe things ON a pane and still
   * never say where the pane ENDS — and a sheet of glass with no edge anywhere
   * in frame is indistinguishable from a filter. So the window is given a frame
   * member, and it is placed for one specific job: it crosses her.
   *
   * That is the entire point of it and it is worth being explicit about, because
   * the instinct is to tuck a mullion into empty space where it cannot bother
   * anything. Empty space is exactly where it proves nothing. An object that
   * passes IN FRONT of a figure is the cheapest and most absolute depth cue a
   * two-dimensional image has: one soft dark bar over her forearm and shoulder
   * settles the question the whole left of the frame was leaving open — is she
   * in this room, or was she pasted into it. Nothing else in this pass can
   * answer that, because everything else in it is translucent.
   *
   * Two terms, which is how a real member reads at night:
   *   • the DARK core — a soft-shouldered bar about 11px wide at 1920, at 26%.
   *     Deliberately not opaque: it is being read against city light and the
   *     eye should have to notice it rather than be stopped by it;
   *   • the ARRIS — a fine lit edge down its inboard side, taking its hue from
   *     whatever is behind the pane there, so the frame member is lit by the
   *     same room as everything else and can never read as a drawn line.
   * Retired below the reading band and released at the very top, so it never
   * terminates on a hard end anywhere the eye is likely to be. */
  /* A SECOND member, out in the right third.
   *
   * One mullion establishes that there is a window. It does not establish that
   * there is a WALL of window, and the note the frame came back with is about
   * the outboard third specifically: undifferentiated darkness where the eye
   * expects a counterweight. A run of glass has bays, and a bay is the cheapest
   * structure a flat dark region can be given — it divides the field, it tells
   * the eye how far away the wall is, and it puts a vertical in the one part of
   * the composition that has nothing but horizontals in it.
   *
   * Placed at 0.845, i.e. inside the frame-right band rather than on it, and
   * struck a step under the near member (0.21/0.16 against 0.26/0.20) because
   * it is further round the curve of the wall and carries less of the room. */
  float mx2 = uv.x - 0.845;
  float mull2Core = exp(-pow(mx2 / 0.0060, 2.0));
  float mull2Arris = exp(-pow((mx2 + 0.0074) / 0.0014, 2.0));
  float mx = uv.x - 0.632;
  float mullCore = exp(-pow(mx / 0.0072, 2.0));
  float mullArris = exp(-pow((mx + 0.0086) / 0.0016, 2.0));
  float mullBand = smoothstep(0.13, 0.27, uv.y) * (1.0 - smoothstep(0.88, 1.0, uv.y));
  float aMull = (mullCore * 0.26 + mull2Core * 0.21) * uOpacity * mullBand * pane;
  float aArris = (mullArris * 0.20 + mull2Arris * 0.16) * uOpacity * mullBand * pane;
  vec3 cMull = vec3(0.020, 0.031, 0.036);
  vec3 cArris = mix(vec3(0.50, 0.60, 0.68), lightHue(behind), 0.55 * lit) * (0.45 + 0.85 * lit);

  float a = clamp(aRiv + aTrack + aRefl + aSheen + aMull + aArris, 0.0, 1.0);
  if (a < 0.002) discard;
  vec3 c = (cRiv * aRiv + cTrack * aTrack + uReflColor * aRefl + cSheen * aSheen
          + cMull * aMull + cArris * aArris) / max(a, 0.0001);
  gl_FragColor = vec4(c, a);
}
`;
