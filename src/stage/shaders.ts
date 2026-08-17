/**
 * Picture Quest — Stage GLSL primitives + tiny deterministic helpers.
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

${GLSL_NOISE}

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

  // Lift / gamma / gain.
  color = color * uGain + uLift;
  color = max(color, 0.0);
  color = pow(color, 1.0 / max(uGamma, vec3(0.001)));

  // Contrast about a linear-ish pivot.
  color = (color - 0.18) * uContrast + 0.18;
  color = max(color, 0.0);

  // Saturation.
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, uSaturation);

  // Teal ↔ orange split-tone, weighted by luminance.
  vec3 shadowTint = vec3(0.06, 0.34, 0.44);
  vec3 highTint   = vec3(0.98, 0.62, 0.30);
  vec3 split = mix(shadowTint, highTint, smoothstep(0.0, 0.9, luma));
  color = mix(color, color * (0.55 + 0.9 * split), clamp(uSplitTone, 0.0, 1.0) * 0.55);

  // Vignette. Deliberately a LONG, shallow falloff: the old curve reached its
  // floor before the corner and stamped the frame with a near-black ring, which
  // over an already dark plate reads as muddy crush rather than as a lens. The
  // radius now starts outside the safe area, the shoulder is gentle, and the
  // applied strength is capped so window mullions and the desk silhouette stay
  // barely readable in the corners instead of disappearing.
  float vAmt = min(clamp(uVignette, 0.0, 1.0), 0.55);
  float vig = smoothstep(1.30, 0.30, r2 * (1.0 + vAmt * 1.6));
  color *= 1.0 - vAmt * (1.0 - vig);

  // Black floor. Crushing to pure 0 turns whole regions into a void that reads
  // as "missing render" rather than "night". Lift the toe onto a near-black
  // that survives the transfer curve — these values land around #09 0a 09 once
  // three's ACES fit and the sRGB encode are through with them, and the paper
  // scrims layered over the canvas carry the composite to roughly #0a0d0c.
  // Deliberately NEUTRAL: the previous floor was blue enough that anywhere the
  // vignette bit went cyan-muddy rather than simply dark. White is untouched.
  const vec3 BLACK_FLOOR = vec3(0.0105, 0.0106, 0.0098);
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
  //   • it is masked OUT of the deepest blacks (below ~8% display luma) and
  //     rolled off in the highlights, so neither the night sky nor a practical
  //     picks up crawl.
  float gLum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float gw = 1.0 - 0.55 * smoothstep(0.25, 1.2, gLum);       // roll off in highlights
  gw *= smoothstep(0.0035, 0.0210, gLum);                     // and out of the toe
  float gt = floor(uTime * 16.0);
  vec2 gjit = vec2(hash13(vec3(gt, 3.7, 11.3)), hash13(vec3(gt, 91.1, 5.9))) * 512.0;
  vec2 gcell = floor((gl_FragCoord.xy + gjit) / max(uGrainSize, 0.5));
  float gFine = hash13(vec3(gcell, gt));
  float gCoarse = hash13(vec3(floor(gcell * 0.3333), gt + 19.0));
  float g = (gFine - 0.5) - (gCoarse - 0.5) * 0.5;
  color *= 1.0 + g * uGrain * 0.14 * gw;
  // A whisper of additive grain so the near-blacks are not plastic-clean —
  // deliberately an order of magnitude below the multiplicative term.
  color += g * uGrain * 0.0005 * gw;

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
`;

export const SPRITE_DIFFUSE_PATCH = /* glsl */ `
#include <map_fragment>
diffuseColor.rgb *= uBright;
float _spriteLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
diffuseColor.rgb = mix(vec3(_spriteLuma), diffuseColor.rgb, 1.0 - clamp(uDesat, 0.0, 1.0));
diffuseColor.rgb = mix(diffuseColor.rgb, uTint, clamp(uTintAmt, 0.0, 1.0));
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
/** Peak-normalized hue of the light behind a screen-space point. */
vec3 lightHue(vec3 c) {
  float m = max(c.r, max(c.g, c.b));
  return c / max(m, 0.001);
}
`;

export const RAIN_VERTEX_DECL = /* glsl */ `
varying vec2 vScreenUv;
`;

export const RAIN_PROJECT_PATCH = /* glsl */ `
#include <project_vertex>
vScreenUv = gl_Position.xy / max(gl_Position.w, 0.0001) * 0.5 + 0.5;
`;

export const RAIN_FRAGMENT_DECL = /* glsl */ `
varying vec2 vScreenUv;
${LIGHTFIELD_GLSL}
`;

export const RAIN_DIFFUSE_PATCH = /* glsl */ `
vec3 _behind = texture2D(uLight, clamp(vScreenUv, 0.0, 1.0)).rgb;
float _behindLum = dot(_behind, vec3(0.2126, 0.7152, 0.0722));
float _lit = mix(1.0, smoothstep(0.03, 0.30, _behindLum), uHasLight);
// Over dead blacks a streak keeps only a whisper; in a practical it flares.
diffuseColor.a *= mix(0.15, 1.0, _lit);
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
varying vec2 vScreenUv;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vScreenUv = gl_Position.xy / max(gl_Position.w, 0.0001) * 0.5 + 0.5;
}
`;

export const GLASS_FRAGMENT = /* glsl */ `
varying vec2 vScreenUv;
uniform float uTime;
uniform float uOpacity;
uniform vec2  uRefl;       // screen-space position of the reflected practical
uniform vec3  uReflColor;
uniform float uReflAmt;
${LIGHTFIELD_GLSL}

/**
 * One rivulet: a hairline core dragging a short decaying tail, with a slightly
 * fatter bead at the head. Widths are in screen-UV, so ~0.001 ≈ 2px at 1080p —
 * any thicker and it stops being water and starts being a worm.
 */
float rivulet(vec2 uv, float x0, float speed, float phase, float width) {
  float wob = sin(uv.y * 9.0 + phase) * 0.0022 + sin(uv.y * 23.0 + phase * 2.3) * 0.0008;
  float dx = uv.x - (x0 + wob);
  float head = 1.16 - fract(uTime * speed + phase * 0.13) * 1.4;
  float above = uv.y - head;
  float tail = smoothstep(-0.010, 0.004, above) * exp(-max(above, 0.0) * 4.6);
  float core = exp(-pow(dx / width, 2.0)) * tail;
  float bead = exp(-pow(dx / (width * 2.3), 2.0)) * exp(-pow(above / 0.013, 2.0));
  return core + bead * 0.55;
}

void main() {
  vec2 uv = clamp(vScreenUv, 0.0, 1.0);
  vec3 behind = texture2D(uLight, uv).rgb;
  float behindLum = dot(behind, vec3(0.2126, 0.7152, 0.0722));
  float lit = mix(1.0, smoothstep(0.03, 0.30, behindLum), uHasLight);

  float riv =
      rivulet(uv, 0.585, 0.055, 0.0, 0.0011)
    + rivulet(uv, 0.742, 0.038, 2.1, 0.0009)
    + rivulet(uv, 0.906, 0.047, 4.4, 0.0010);
  float aRiv = clamp(riv, 0.0, 1.0) * uOpacity * mix(0.05, 0.32, lit);
  vec3 cRiv = mix(vec3(0.72, 0.80, 0.86), lightHue(behind), 0.7 * lit) * (0.75 + 0.8 * lit);

  // Reflected practical: a small soft lobe plus the vertical drag wet glass
  // gives it. Deliberately faint — the bloom pass downstream does the rest, and
  // anything stronger reads as a lens smudge instead of a reflection.
  vec2 rp = vScreenUv - uRefl;
  float lobe = exp(-dot(rp / vec2(0.085, 0.042), rp / vec2(0.085, 0.042)));
  float drag = exp(-pow(rp.x / 0.026, 2.0)) * exp(-pow(max(-rp.y, 0.0) / 0.14, 1.7))
             * step(rp.y, 0.0);
  float aRefl = clamp(lobe * 0.8 + drag * 0.3, 0.0, 1.0) * uReflAmt * uOpacity;

  float a = clamp(aRiv + aRefl, 0.0, 1.0);
  if (a < 0.002) discard;
  vec3 c = (cRiv * aRiv + uReflColor * aRefl) / max(a, 0.0001);
  gl_FragColor = vec4(c, a);
}
`;
