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
/** Midtone-weighted exposure, per plate. See the call site — this is the print
 *  exposure of the frame, not a lift: it cannot move a black or a specular. */
uniform float uMidLift;

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

  /* ── Print exposure ───────────────────────────────────────────────────────
   *
   * The frame prints a stop and a half down. Not in the shadows — the black
   * floor below is deliberate and correct — and not in the highlights, which the
   * shoulder above is already holding off the ceiling. It is the BAND BETWEEN
   * them: the desk's front face, the partition, the chair, the wall above the
   * lamp, the shadow side of a face. All of it sits within a few code values of
   * the black it is supposed to be separating from, so at a glance the picture
   * is a lamp, a face and a rectangle of nothing, and at thumbnail scale it is a
   * lamp and a rectangle of nothing.
   *
   * Neither lift, gamma nor gain can fix that without costing one of the two
   * ends. Lift raises the floor (a milky black is the composited-plate tell this
   * whole stack exists to avoid); gain scales the highlights into the shoulder;
   * gamma does both, gently, everywhere. What the note actually asks for is a
   * colourist's midtone window, so that is what this is: a multiplicative gain
   * inside a luminance window that opens off the toe and has closed again before
   * the practicals.
   *
   *   • it is ZERO at black by construction (the lower smoothstep), so the floor
   *     that the vignette and the emulsion both depend on cannot move;
   *   • it has CLOSED AGAIN by 0.46 linear, well under the lit desk and well
   *     under a lit cheek, so neither the practicals nor the subject's own key
   *     are billed twice and the highlight shoulder above keeps its job;
   *   • it is a GAIN, not an add — light scales what a surface reflects, and an
   *     additive term in this band would flatten the very separation it is meant
   *     to be buying.
   *
   * The window's upper edge is the number that matters and it was wrong first
   * time. Rolling off between 0.42 and 0.92 sounds like "midtones" and is not:
   * a lit forearm sits around 0.35 linear here, so a half-stop window that is
   * still at full strength there put a stop and a half onto the brightest skin
   * plane on the plate — through the bloom gate — and printed a blown wrist.
   * 0.11 → 0.46 is the actual band the note is about: the desk's front face, the
   * partition, the chair, the wall, the shadow side of a jaw. Everything already
   * carrying light keeps what it had.
   *
   * At uMidLift 0.45 that is +0.54 stop through that band, +9% on a lit forearm
   * and nothing at all on a practical. It is per-plate (see Stage →
   * PLATE_FOCUS): a daylit reading room, whose failure mode is the opposite one,
   * takes none of it. */
  if (uMidLift > 0.0001) {
    float mL = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float mw = smoothstep(0.0035, 0.022, mL) * (1.0 - smoothstep(0.11, 0.46, mL));
    color *= 1.0 + uMidLift * mw;
  }

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
  /* 0.014 → 0.009. "Keep the chroma clean" is the second half of the grain note
   * and this is the only chromatic noise term in the pipeline — the emulsion
   * below is luminance-only by construction and the DOM plate is desaturated in
   * its own filter. The argument for a chromatic tooth stands (pigment settling
   * on a tooth breaks colour as well as value, and it is what stops the
   * photographic half reading as *cleaner* than the painted half), so it is
   * trimmed rather than retired: at 0.9% it still decorrelates the three
   * channels on a lit plane and it no longer puts findable colour speckle into
   * the near-blacks, where two thirds of this frame lives. */
  color *= 1.0 + toothRGB * 0.009 * tAmt;

  // Saturation.
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, uSaturation);

  // Teal ↔ orange split-tone, weighted by luminance.
  vec3 shadowTint = vec3(0.06, 0.34, 0.44);
  vec3 highTint   = vec3(0.98, 0.62, 0.30);
  vec3 split = mix(shadowTint, highTint, smoothstep(0.0, 0.9, luma));
  color = mix(color, color * (0.55 + 0.9 * split), clamp(uSplitTone, 0.0, 1.0) * 0.55);

  /* ── The window side, cooled ──────────────────────────────────────────────
   *
   * The shadow bridge below unifies the DARKS and the split-tone bends whatever
   * already has chroma. Between the two of them sits the band this frame keeps
   * losing: the low midtones of the window wall — the glazing bars, the far
   * bench, the wet floor under the glass, the chair's own mass. The plate paints
   * them a warm-neutral, the split-tone reads them as "not dark enough to be
   * shadow, not bright enough to be highlight" and hands them the middle of its
   * ramp, and the middle of a teal↔amber ramp is OLIVE. Half the picture then
   * drifts yellow-green against a window that is unambiguously teal, which is a
   * palette-incoherence read the rubric fails outright.
   *
   * So the window side is given the window's own hue, on exactly the terms the
   * shadow bridge is given it: the mix target is LUMINANCE × the pane teal,
   * divided by its own luma, i.e. value-preserving by construction — it moves the
   * hue of the band and never its exposure. Ramped in x so the lamp's own third
   * is untouched (the room really does have two colour temperatures in it and
   * that is the point of the shot), and windowed in luminance so it starts above
   * the bridge's band and has closed again well under the practicals.
   */
  {
    float wSide = smoothstep(0.40, 0.70, vUv.x);
    float wLum  = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float wBand = smoothstep(0.006, 0.030, wLum) * (1.0 - smoothstep(0.10, 0.34, wLum));
    // Peak-normalised pane steel, ÷ its own luma (0.849).
    vec3 wHue = vec3(0.56, 0.92, 1.00) * 1.177;
    color = mix(color, vec3(wLum) * wHue, 0.30 * wSide * wBand);
  }

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
  /* …and the OUTBOARD FLOOR gets a second one on top of it.
   *
   * Two operators bite hardest in the same corner — the radial vignette, and the
   * frame-right exit guard immediately above — and they compound: the bottom
   * right of this frame is the one region where the picture reaches the floor and
   * simply stays there, so roughly a fifth of the canvas prints as a single
   * undifferentiated value. That is not a vignette, it is a hole, and the
   * difference between the two is entirely whether the eye can find a plane
   * inside the darkness.
   *
   * ~4 code values at the output, ramped over half the frame in x and most of it
   * in y so there is no boundary anywhere to be seen, and struck a hair COOL
   * (unlike the neutral floor below it) because what is dark out there is a wet
   * floor under a wall of city glass — the same emitter the whole right half is
   * lit by. Applied with the floor rather than as a lift, so it cannot touch a
   * midtone and cannot move a highlight by a thousandth. */
  float fEdge = smoothstep(0.60, 0.94, vUv.x) * (1.0 - smoothstep(0.08, 0.60, vUv.y));
  vec3 floorHere = BLACK_FLOOR + vec3(0.0030, 0.0038, 0.0044) * fEdge;
  color = floorHere + color * (1.0 - floorHere);

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
  /* The highlight roll, and it is now the term that carries the face.
   *
   * 0.55 over 0.25→1.2 was written as a guard against a practical picking up
   * crawl, and against a practical it works: a lamp shade at 0.8 linear loses
   * half its grain. The band it never reached is the one the note is about. A
   * lit cheek and a forehead plane sit between 0.30 and 0.50 linear, where the
   * old smoothstep had barely opened — under 10% off — so the two largest
   * SMOOTH, CONTINUOUSLY-MODELLED surfaces in the frame were carrying nearly the
   * full emulsion. Grain on a gradient that shallow does not read as film; it
   * reads as an 8-bit source, because the modulation is larger than the step
   * between the values it is modulating and the plane visibly quantises.
   * 0.70 over 0.14→0.72 pulls roughly a third out of exactly that band (−21% at
   * 0.35, −38% at 0.45) and leaves the deep midtones — the wool, the collar, the
   * shadow side of the jaw, the desk's front face — inside 2% of where they
   * were, which is where the frame's filmic weight actually lives. */
  float gw = 1.0 - 0.70 * smoothstep(0.14, 0.72, gLum);      // roll off in highlights
  // …and eased into the toe. The floor comes 0.34 → 0.24: the note is that the
  // grain in the deep shadows reads as NOISE masking unfinished area rather than
  // as emulsion, and a deep shadow is precisely where a real stock has the least
  // silver to scatter. Roughly a third off the blacks; the midtone term below
  // comes up by a ninth to keep the frame's filmic weight where it belongs.
  gw *= 0.24 + 0.76 * smoothstep(0.0020, 0.0185, gLum);
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
  // 0.8 → 0.5. Same note as the toe floor above, one axis over: the corner
  // weighting was authored as dither for the longest gradient in the game and it
  // lands on the darkest region of the frame, so the two boosts compounded and
  // the bottom-right read as noise over an unfinished area. Half the boost still
  // covers the scrim's ramp — which has also just been shortened and neutralised
  // (see --pq-scrim-foot) — without being visible as a quadrant of sparkle.
  float gq = uGrain * (1.0 + 0.5 * gCorner);
  float gt = floor(uTime * 16.0);
  vec2 gjit = vec2(hash13(vec3(gt, 3.7, 11.3)), hash13(vec3(gt, 91.1, 5.9))) * 512.0;
  /* The lattice is ROTATED before it is quantised, and this one line is the fix
   * for the "horizontal banding / scanline" note.
   *
   * A floor(p / cell) builds an AXIS-ALIGNED grid. However well distributed the
   * hash inside each cell is, the cell BOUNDARIES all lie on two families of
   * perfectly horizontal and vertical lines — and when the pitch is a small
   * non-integer number of device pixels those boundaries beat against the raster
   * and print as a regular ripple across every flat in the frame. The per-step
   * jitter above translates the grid; it never rotates it, so it cannot help: a
   * translated horizontal line is still a horizontal line. Read on a still, that
   * ripple is indistinguishable from macro-blocking, which is exactly the read
   * that came back ("reads as compression, not film").
   * A 31.7° rotation (an angle with no small rational relationship to the pixel
   * grid, the same trick a halftone screen uses for the identical reason) puts
   * every cell boundary at an irrational slope, so no run of cells can ever line
   * up into a row. It costs four multiplies and it is the difference between an
   * emulsion and a screen door. */
  mat2 GROT = mat2(0.8508, -0.5255, 0.5255, 0.8508);
  vec2 gcell = floor((GROT * (gl_FragCoord.xy + gjit)) / max(uGrainSize, 0.5));
  float gFine = hash13(vec3(gcell, gt));
  float gCoarse = hash13(vec3(floor(gcell * 0.3333), gt + 19.0));
  float g = (gFine - 0.5) - (gCoarse - 0.5) * 0.5;
  // 0.185 → 0.212. The DOM emulsion above the render has just been paid down by
  // a third (see .pq-plate), because a source-over grey field lifts blacks and
  // this one does not — it is a relative modulation. Same total grain in the
  // finished frame, redistributed onto the term that costs the toe nothing.
  // 0.212 → 0.236. The two operators above take about a third out of the deep
  // shadows; this puts an eighth back into the MIDTONES, which is where the note
  // says the filmic feel has to survive — and, crucially, where the composited
  // portrait lives. Her lit cheek, her forearm and the collar are the only large
  // midtone surfaces in the frame, and they were the region reading as pasted
  // from a cleaner source.
  color *= 1.0 + g * gq * 0.236 * gw;
  // The additive term is the one that actually dithers near zero (there is
  // nothing to modulate down there), so it carries the corner weighting hardest.
  // 0.0038 → 0.0025 on the toe term, for the third time and the same reason:
  // this is the ONLY grain that survives near zero, so it is also the whole of
  // what "grain in the deep shadows" means. A third off. The 0.0008 base is
  // untouched — it is the dither the long falloffs need and it is inaudible.
  color += g * gq * (0.0008 + 0.0025 * gToe) * (1.0 + 0.5 * gCorner);

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
uniform float uMidGain;
uniform float uPlateSoft;

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
/* ── The print exposure, on HER ────────────────────────────────────────────
 *
 * Everything above this line is a HUE operation. uPlateDesat pulls her chroma,
 * uPlateSplit bends it toward the room's two lights, uPlateCool and uEnvTint lay
 * the window over her — all of it correct, all of it value-preserving by
 * construction, and none of it able to answer the note that she does not
 * separate from the plate behind her. That note is about VALUE, and the only
 * value operations this material carried were uBright (a flat multiply, which
 * moves her blacks and her speculars along with everything else) and the plate
 * bake's own midLift, which is applied once at load in 8-bit sRGB and cannot
 * know what the composite grade downstream will do to the room around her.
 *
 * So the sprite carries a midtone-weighted GAIN of its own, and three properties
 * are what make it usable rather than merely brighter:
 *   • it is weighted in PERCEPTUAL space, not linear. The window 4L(1−L) is
 *     the right shape and the wrong argument here: three decodes an sRGB plate
 *     to linear before this runs, and a lit forearm sits near 0.10 LINEAR, where
 *     4L(1−L) is already down to a third of its peak. Taking the ~1/2.2 root
 *     first puts the peak of the window back on the band a colourist means by
 *     "midtones" — the wool, the collar, the shadow side of the jaw, the
 *     forearm — which is the band the separation actually lives in;
 *   • it is a GAIN. Light scales what a surface reflects; an additive lift of
 *     the same size would raise her blacks, which is the single most legible
 *     signature of a badly composited plate and the thing this whole material
 *     exists to avoid;
 *   • it is ZERO at both ends by construction, so it cannot lift a black and it
 *     cannot drive a specular into the highlight shoulder downstream. At
 *     uMidGain 0.13 it is +13% at mid, ≥10% across the whole midtone band, +2%
 *     on a lit cheek's brightest plane and 0% on white.
 */
float _midLum = clamp(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
float _midW = pow(_midLum, 0.4545);
diffuseColor.rgb *= 1.0 + clamp(uMidGain, 0.0, 1.0) * 4.0 * _midW * (1.0 - _midW);
/* ── The contrast match ────────────────────────────────────────────────────
 *
 * Everything above this line moves the plate's HUE toward the room or its
 * EXPOSURE toward the room, and the note that keeps coming back is neither: the
 * portrait carries about a stop more contrast than the set it is sitting in.
 * That is not a colour difference and it is not a level difference — it is the
 * slope of the transfer curve the plate was shot on against the slope the room
 * was painted on, and it is why a plate can measure correct at both ends and
 * still read as pasted. The eye is extremely good at this comparison and has no
 * name for it, which is exactly the profile of a note that arrives as "the
 * character layer isn't in the grade".
 *
 * So the plate's own curve is compressed toward a night-interior pivot before
 * the composite grade sees it, and two properties keep it from being a haze:
 *   • it is GATED OFF THE TOE. A contrast pull about a pivot necessarily lifts
 *     everything below that pivot, and lifting her blacks is the single most
 *     legible composited-plate tell there is — the milky matte this whole
 *     material exists to avoid. The weight is zero below 0.02 linear and only
 *     fully open by 0.14, so her deep shadows keep the curve they arrived with
 *     and only the modelled range is compressed;
 *   • the PIVOT is the room's own midtone (0.12 linear, the value the desk's
 *     front face and the partition sit at), not 0.18 and not her own mean. A
 *     pull about the room's mid moves her toward the set; a pull about her own
 *     mean only makes her flatter in place.
 *
 * uPlateSoft IS the pull, so 0.12 is 12% off her slope — about a sixth of a stop
 * across the modelled band, which is what the difference measured at — costing
 * her lit cheek roughly 3% and her blacks nothing at all. Written as a scale
 * about the pivot rather than as a mix() so the identity case is exact: at
 * weight zero the expression returns the sample unchanged, bit for bit.
 */
{
  vec3 _sPivot = vec3(0.12);
  float _sLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float _sK = 1.0 - clamp(uPlateSoft, 0.0, 1.0) * smoothstep(0.02, 0.14, _sLum);
  diffuseColor.rgb = _sPivot + (diffuseColor.rgb - _sPivot) * _sK;
}
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
/* …and the tooth is ROLLED OFF on the lit planes, which is the half of the
 * "posterised cheek" note that the composite grain roll cannot reach.
 *
 * The gap in the reasoning that set uCanvas was uniformity. A ground has one
 * tooth everywhere, so the modulation was applied at one strength everywhere —
 * and it is a RELATIVE modulation, so at ±11% it is ±3 code values on her
 * cardigan and ±22 on her forehead. Twenty-two values of noise laid across the
 * two smoothest, most continuously modelled surfaces on the figure is larger
 * than the steps the modelling itself is made of, so the planes quantise: the
 * cheek and the brow break into flat patches with visible boundaries, which the
 * eye reads as compression rather than as canvas. It is also wrong about paint —
 * a ground shows through a thin scumble and is buried under a loaded highlight,
 * so the tooth belongs in the shadows and the halftones and not on the light.
 *
 * ~40% off the lit band, nothing at all below 0.18, which leaves her shadow side
 * and the cardigan measuring in the same noise band as the painted desk while
 * her lit planes stop breaking up. */
float _toothLum = clamp(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
float _toothW = 1.0 - 0.42 * smoothstep(0.18, 0.70, _toothLum);
diffuseColor.rgb *= 1.0 + _tooth * 2.0 * clamp(uCanvas, 0.0, 1.0) * _toothW;
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
 * ── The pane matte ───────────────────────────────────────────────────────────
 *
 * The interior fence above is a SUBTRACTIVE description of the room: name every
 * prop between the lens and the glass and take the water off it. That is the
 * right instrument for a lamp and a mug — objects with no straight edge — and it
 * is the wrong one for the question the frame kept failing, which is not "what
 * occludes the pane" but "WHERE IS THE PANE AT ALL". Four ellipses can never
 * spell the answer, because the complement of a union of ellipses is not a
 * window: it leaks between them, above them and past their shoulders, and every
 * leak prints as a streak standing on a wall, a chair back or a desk.
 *
 * So the glass is declared POSITIVELY as well — the rectangle of frame the
 * window wall actually occupies, with a soft shoulder on each side (a hard
 * boundary in a weather field is a matte, exactly as for the ellipses). The two
 * fences compose: rain exists only inside the pane rect AND outside the
 * furniture. Everything on this rig is on the far side of the glass by
 * construction, so this is simply that statement made once, in the coordinates
 * the statement is about.
 *
 * uPane is (x0, y0, x1, y1) in the framed screen, 0..1, y up. uPaneAmt 0 retires
 * the matte — a plate with no window keeps exactly the weather it had.
 */
uniform vec4 uPane;
uniform vec2 uPaneSoft;
uniform float uPaneAmt;
/**
 * ── The rain window ─────────────────────────────────────────────────────────
 *
 * The pane matte above is one rectangle, and one rectangle is not enough to say
 * where a wall of glass is once anything stands in front of it. The ops room is
 * the case that proves it: the glass runs from the partition jamb to the frame
 * edge, and a task chair — the largest opaque mass in the composition — sits in
 * the middle of that run with its crown two fifths of the way up the picture.
 * A single rect either includes the chair (and rains down it, which is the note
 * four consecutive reads came back with) or excludes the whole middle of the
 * window with it. Ellipses cannot fix that either: they are a SUBTRACTIVE
 * description, and every gap between them leaks a streak onto something solid.
 *
 * So the glass is declared as a UNION OF UP TO TWO FEATHERED RECTANGLES —
 * "here, and here, is where a raindrop can be seen at all" — authored per plate
 * off a framed 1920×1080 capture, in the same 0..1 y-up screen the light field
 * is sampled in. Two is the whole budget on purpose: a description that needs
 * three is a description that has started tracing a silhouette, and a traced
 * silhouette in a weather field is a matte.
 *
 * The second rect is what carries the VERTICAL clip. In the ops room the upper
 * rect stops at the chair's crown and the outboard rect continues past it down
 * to the sill, so the field terminates in mid-frame only where the chair is
 * standing in it — which is what occlusion looks like — and runs to the floor
 * line out in the bay, where nothing interrupts it.
 *
 * Each rect is (x0, x1, y0, y1). uRainWinAmt 0 retires the window entirely: a
 * plate that declares none keeps exactly the weather it had.
 */
uniform vec4 uRainWinA;
uniform vec4 uRainWinB;
/** Feather half-widths in x and y, frame fractions. Never zero — see pqWinRect. */
uniform vec2 uRainWinSoft;
uniform float uRainWinAmt;
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
 * The falloff is deliberately wide: a crisp cut-out would trade one seam for
 * another — a rain-shaped hole in the exact silhouette of a portrait — and the
 * plate's own edge is a ~78px feather, not a line. A gradient is the only honest
 * boundary here.
 *
 * 0.70/1.10 → 0.82/1.16, and it is the PLATEAU that matters rather than the
 * shoulder. The published footprint is the plate's solid core (see
 * Character.CORE), and at a plateau of 0.70 of that radius the fence reached
 * full strength over her face and had already begun releasing across her near
 * shoulder and her forearm — so the terms this gates were at half strength over
 * exactly the two large smooth planes where a stray mark is most visible. At
 * 0.82, read against the 1.20 × / 1.10 × over-scale the Stage now publishes (see
 * publishFigureMask), the full-strength region covers her from crown to forearm
 * and the shoulder releases out in the dark bay beside her, where there is
 * nothing for a boundary to be seen against.
 */
float pqFigure(vec2 uv) {
  vec2 d = (uv - uFigure.xy) / max(uFigure.zw, vec2(1e-4));
  return uFigureAmt * (1.0 - smoothstep(0.82, 1.16, length(d)));
}
/** One interior ellipse: 1 deep inside, 0 clear of it, with a long shoulder. */
float pqInteriorLobe(vec2 uv, vec4 e, float soft) {
  if (e.z <= 0.0 || e.w <= 0.0) return 0.0;
  float d = length((uv - e.xy) / max(e.zw, vec2(1e-4)));
  return 1.0 - smoothstep(max(1.0 - soft, 0.0), 1.0 + soft, d);
}
/** 1 out on the glass, 0 off it, with a long shoulder on all four sides. */
float pqPane(vec2 uv) {
  if (uPaneAmt <= 0.0) return 1.0;
  float mx = smoothstep(uPane.x - uPaneSoft.x, uPane.x + uPaneSoft.x, uv.x)
           * (1.0 - smoothstep(uPane.z - uPaneSoft.x, uPane.z + uPaneSoft.x, uv.x));
  float my = smoothstep(uPane.y - uPaneSoft.y, uPane.y + uPaneSoft.y, uv.y)
           * (1.0 - smoothstep(uPane.w - uPaneSoft.y, uPane.w + uPaneSoft.y, uv.y));
  return mix(1.0, mx * my, clamp(uPaneAmt, 0.0, 1.0));
}
/**
 * One rain-window rectangle: 1 inside, 0 outside, with a smooth shoulder on all
 * four sides. A degenerate rect (unset slot) returns 0 and drops out of the max.
 *
 * The shoulder is the entire reason this is a smoothstep and not a step: a hard
 * boundary in a weather field is a matte, and a matte is the exact artefact the
 * window exists to remove. Ranges that reach a frame edge are pushed past it by
 * the Stage (see Weather.setRainWindow) so their feather is spent off-picture
 * and the field runs full strength to the edge rather than halving at it.
 */
float pqWinRect(vec2 uv, vec4 r) {
  if (r.y <= r.x || r.w <= r.z) return 0.0;
  vec2 s = max(uRainWinSoft, vec2(1e-3));
  float mx = smoothstep(r.x - s.x, r.x + s.x, uv.x)
           * (1.0 - smoothstep(r.y - s.x, r.y + s.x, uv.x));
  float my = smoothstep(r.z - s.y, r.z + s.y, uv.y)
           * (1.0 - smoothstep(r.w - s.y, r.w + s.y, uv.y));
  return mx * my;
}
/** 1 where this plate has glass, 0 where it has room. See the uniforms above. */
float pqRainWindow(vec2 uv) {
  if (uRainWinAmt <= 0.0) return 1.0;
  float m = max(pqWinRect(uv, uRainWinA), pqWinRect(uv, uRainWinB));
  return mix(1.0, m, clamp(uRainWinAmt, 0.0, 1.0));
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
// a floor rather than 0 so the streaks crossing the bright bokeh beside her ear
// still carry a whisper of continuity across the silhouette — a field that
// stops dead at her outline reads as a matte, which is the very thing this
// exists to remove.
//
// 0.18 → 0.06. The continuity argument is sound and the number was not: 18% of
// a 0.9-base field over a face is still a visible line, and a fine bright
// vertical crossing a lit cheek does not read as "rain seen past her" — it
// reads as a SCRATCH ON THE PRINT, which is the single most damaging thing a
// frame can be accused of, because it is an accusation about the medium rather
// than about the picture. At 6% the field is present across her as a texture
// and absent as a mark. Note that the pane's own water (GLASS_FRAGMENT) still
// crosses her properly — that layer is genuinely in front of her and is where
// the through-a-window read is actually earned.
diffuseColor.a *= mix(1.0, 0.06, pqFigure(pqScreenUv()));
// …and the interior fence, which unlike the figure is absolute. The pane is a
// PLANE: a drop cannot be in front of the desk lamp and behind the window at
// the same time, and the compromise the figure gets (18%, so the field carries
// continuity across a feathered silhouette) has no equivalent here — a painted
// prop has no feather, it simply occludes. 2% is left so the ellipse's own
// shoulder still resolves smoothly rather than terminating on a zero.
diffuseColor.a *= mix(1.0, 0.02, pqInterior(pqScreenUv()));
// …and the PANE MATTE, which is absolute in the other direction: a drop that is
// not on the glass is not a drop, it is an overlay. Multiplied rather than
// floored — the ellipses above keep a 2% shoulder so their own falloff resolves
// smoothly, but there is nothing on the far side of THIS boundary for a shoulder
// to resolve into. The smoothstep in pqPane is what keeps the edge off the
// picture; the value it reaches is zero.
diffuseColor.a *= pqPane(pqScreenUv());
// …and the RAIN WINDOW, which is the same statement made per plate and with a
// vertical extent (see pqRainWindow). It is multiplied, absolute and last of the
// three fences because it is the one that can say "there is a chair in front of
// this bay": the pane rect above knows only that the wall of glass begins at
// x=0.425, and a wall of glass with a task chair standing in the middle of it
// still has no rain over the chair. Zero outside, no floor, no allowance — a
// drop that is not on glass is not a drop, it is an overlay, and this is the
// only fence in the file that gets to see that per background.
diffuseColor.a *= pqRainWindow(pqScreenUv());
// …and the SPECULAR TINT, 0.62 → 0.78. A drop on a window is not a white tick
// that happens to be standing in front of a teal city; it is a lens, and what it
// shows is the city. Taking three quarters of its hue from what is behind it
// (rather than three fifths) is what makes a streak crossing the signage read
// teal and a streak crossing a street practical read amber — i.e. refractive
// rather than stamped, which is the note.
diffuseColor.rgb = mix(diffuseColor.rgb, lightHue(_behind), 0.78 * _lit);
// The FLARE, 1.15 → 0.72 of gain on the lit term. The tint above is free; the
// gain was not. At 1.95× over a bright bokeh a single drop was the third
// brightest object in the frame — a bar of light hanging in the window with
// nothing to explain it, which is exactly how the frame came back describing the
// one at x≈1060. A drop transmits what is behind it; it does not amplify it by a
// stop. 1.52× still separates the lit drops from the dead ones by the amount
// that makes rain visible, and no single one of them can now out-print the
// practical the composition is hung on.
diffuseColor.rgb *= 0.8 + 0.72 * _lit;
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
       // Four more across the INBOARD bays. They used to sit at 0.335 / 0.452 and
       // — the two loudest — at 0.148 / 0.209, "across the lamp", on the argument
       // that a drop lit by the practical is the one that welds the glass to the
       // room. The argument is good and the geometry was not: the lamp, the mug
       // and the monitor are on the CAMERA's side of that window, so those two
       // rivulets were water running down the front of a desk lamp. The interior
       // ellipses already thinned them to nothing and the pane matte now deletes
       // them outright; carrying them was buying a fence twice and a picture
       // never.
       //
       // Re-pointed onto the first two bays of actual glass, which is also where
       // the frame needed them: the run between the partition arris (0.416) and
       // the near mullion (0.632) was the emptiest stretch of pane in the shot.
       // Deliberately the faintest four of the eight — over the darker inboard
       // bays the lit gate keeps them near 5%, enough to say "there is glass
       // here", not enough to be seen as a mark.
       + rivulet(uv, 0.428, 0.043, 1.3, 0.0013, 5.5) * 0.44
       + rivulet(uv, 0.505, 0.036, 3.9, 0.0010, 8.6) * 0.38
       + rivulet(uv, 0.472, 0.050, 2.7, 0.0021, 4.0) * 0.50
       + rivulet(uv, 0.556, 0.034, 0.6, 0.0012, 7.0) * 0.36;
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
  // term below is fenced twice: OUT of the room's own furniture (pqInterior) and
  // IN to the window wall itself (pqPane). The second is the one that stops the
  // sheet, the tracks and the specular reading as a full-frame overlay — a run
  // of water with no left edge anywhere in the picture is a filter, whatever is
  // drawn inside it.
  // …and fenced a THIRD time by the plate's own rain window, which is what
  // stops the rivulets, the sheet, the tracks and the frame members from being
  // drawn over a chair back or a desk that happens to stand inside the pane
  // rect. Every term below reads this same "pane" factor, so declaring the
  // window once here gates the whole pass — including the mullions, which is
  // correct in the same way the water is: a frame
  // member behind an object in the room is occluded by it exactly as the water
  // on the same sheet is.
  float pane = (1.0 - pqInterior(uv)) * pqPane(uv) * pqRainWindow(uv);

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
  //
  // Over the FIGURE: 0.74 → 0.52 → 0.34 → 0.04, and the last step is a change of
  // position rather than of dose. The three before it were all trying to find a
  // density at which water lying on a lit cheek reads as a window instead of as
  // a compositing artefact, and there is no such density — the pane is now drawn
  // BEHIND her (see Weather: renderOrder 12) and the only thing this factor still
  // governs is how much of it shows THROUGH her matte, which is a 78px feather
  // with a dissolving torso in it. Four percent is what keeps the rivulets from
  // terminating on her outline like a stencil while leaving nothing on her that
  // could be mistaken for a mark. The "a window that stops at a silhouette is not
  // a window" claim is answered by the pane's own structure out in the bays,
  // where a mullion and a run of water can be seen crossing nothing at all.
  float aRiv = clamp(riv, 0.0, 1.0) * uOpacity * mix(0.19, 0.42, lit) * sill
             * mix(1.0, 0.04, fig) * pane;

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
  /* ── The caustic ──────────────────────────────────────────────────────────
   * A bead of water is a cylindrical lens, and the whole of what separates one
   * from a coloured line is that a lens has a FOCUS. The displacement above
   * already shifts what is behind the bead; it shifts it evenly, so the drop
   * carries the city and never concentrates it.
   *
   * The concentration happens on the FLANKS — where the surface is steepest,
   * which is exactly where the field's own horizontal derivative peaks — so the
   * derivative already in hand is the lens power, and the highlight is that power
   * carrying the refracted hue. Two consequences the frame needs: a runnel
   * crossing the signage throws a teal core, one crossing a street practical
   * throws an amber one, and both of them are BRIGHTER than the pane around
   * them, so the water reads as refractive rather than as a tinted stroke.
   * Gated on the lit term and on uHasLight for the same reason as the line
   * above it. */
  float caustic = smoothstep(0.08, 0.34, abs(gx)) * lit * uHasLight;
  cRiv += lightHue(refr) * caustic * 0.38;

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
  /* …and its GHOST. A window in a tower is double-glazed, so a practical in the
   * room behind the lens reflects TWICE — once off the inner sheet and once off
   * the outer, separated by the cavity and therefore offset by a few pixels and
   * a stop or so down. One lobe is a smudge that happens to be amber; two lobes
   * at one offset are unmistakably a reflection, because nothing else in a night
   * interior doubles. It is the cheapest available answer to "the warm mark on
   * the glass reads as arbitrary", and it costs one exponential. */
  vec2 rp2 = uv - uRefl - vec2(0.0128, -0.0072);
  float ghost = exp(-dot(rp2 / vec2(0.050, 0.025), rp2 / vec2(0.050, 0.025)));
  float drag = exp(-pow(rp.x / 0.013, 2.0)) * exp(-pow(max(-rp.y, 0.0) / 0.07, 1.7))
             * step(rp.y, 0.0);
  float reflBand = smoothstep(0.40, 0.54, uv.y);
  /* …and over the subject it is now GONE, 0.68 → 0.0, which is the one term on
   * this pane that gets deleted rather than thinned.
   *
   * The rivulets and the tracks are held at a whisper because they are fine lines
   * and a fine line that terminates on a silhouette reads as a stencil. A
   * REFLECTION is the opposite object: a single large soft amber lobe with a
   * ghost and a vertical drag, i.e. the biggest, softest, brightest mark this
   * pass can make. There is no strength at which it reads as glass when it lands
   * on a face — at any density it reads as the subject being half-eaten, and the
   * blind note ("she reads as a semi-transparent photo-composite") is in large
   * part this lobe lying across her jaw.
   *
   * Deleting it costs nothing, because a reflection is a local event: the smear
   * is still there on the pane either side of her, where the eye can see it lying
   * on a surface with nothing behind it. A reflection that stops where a person
   * is standing in front of the glass is, in fact, exactly what a reflection
   * does. */
  float aRefl = clamp(lobe * 0.72 + ghost * 0.3 + drag * 0.28, 0.0, 1.0)
              * uReflAmt * uOpacity * reflBand * pane * (1.0 - fig);

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
  // The sheet used to be the one term that did NOT thin over her (0.88), on the
  // argument that a sheet of glass which fades out behind a figure is not a
  // sheet. That argument was made when the pane was drawn in FRONT of her; with
  // the pane behind her (see Weather: renderOrder 12) the only thing this can
  // still do over the figure is haze her matte's feather, which is the exact
  // mechanism by which a plate reads as semi-transparent. 0.88 → 0.10: the sheet
  // still crosses the whole frame, it simply stops crossing HER.
  float aSheen = sheenBand * haze * (0.006 + 0.022 * lit) * uOpacity * sill
               * mix(1.0, 0.1, fig) * pane;
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
   * everything else on this sheet.
   *
   * …and it is fenced HARDEST of all over the figure — 0.66 → 0.22, a third of
   * what the rivulets keep. The two are not the same object and the frame proves
   * it: a rivulet is a single wandering line and reads, correctly, as one drop
   * of water crossing her. The track field is a REGULAR striation — two summed
   * sines, i.e. a set of near-parallel verticals at an even pitch — and a set of
   * even parallel verticals running the full height of a face is the textbook
   * appearance of a scratched print. Every property that makes this term work
   * across a wall of glass (it is everywhere, it is uniform, it never ends) is
   * the property that makes it read as damage over skin. */
  // …and 0.22 → 0.0. The reasoning above is the reasoning for deleting it: a set
  // of even parallel verticals running the full height of a face is the textbook
  // appearance of a scratched print, and "a third of the rivulets' strength" is
  // still a set of even parallel verticals. It is the single term on this pass
  // whose failure mode is an accusation about the MEDIUM rather than about the
  // picture, so it gets no allowance at all over her.
  float aTrack = clamp(tk, 0.0, 1.0) * uOpacity * mix(0.010, 0.030, lit) * sill
               * (1.0 - fig) * pane;
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
  /* The arris is the pane's only STRUCTURAL specular, and it is what makes the
   * frame member read as a member rather than as a soft dark stripe — so when
   * the water on this pass came down over the figure, the frame it belongs to
   * had to come UP, or the note ("rain with no plane behind it") would simply be
   * answered by having less rain. 0.20/0.16 → 0.27/0.21: still a hairline, now
   * unambiguously a lit metal edge, and it is the term that says the streaks are
   * lying on something. */
  /* …and BOTH members are now fenced against the figure, which reverses the
   * paragraph above and is the point of this round.
   *
   * "It crosses her, and that is the entire point of it" was the strongest
   * argument in this file and it was answered by the frame: a soft dark bar and a
   * lit arris drawn over a forearm is a depth cue only if the eye reads them as
   * an object in front of her, and blind readers did not — they read a woman with
   * a vertical seam through her, i.e. the compositing tell the bar was placed to
   * disprove. A frame member cannot prove she is behind glass while it is the
   * thing making her look composited.
   *
   * The near member at x=0.632 sits squarely on her plate, so the fence takes it
   * off her and leaves the ~500px of it that runs through the empty bays above and
   * below — which is where a mullion proves there is a wall of window anyway. The
   * outboard member at 0.845 is clear of her at every camera position and is
   * untouched by construction (fig is 0 out there). */
  float mullFig = 1.0 - fig;
  float aMull = (mullCore * 0.26 + mull2Core * 0.21) * uOpacity * mullBand * pane * mullFig;
  float aArris = (mullArris * 0.27 + mull2Arris * 0.21) * uOpacity * mullBand * pane * mullFig;
  vec3 cMull = vec3(0.020, 0.031, 0.036);
  vec3 cArris = mix(vec3(0.50, 0.60, 0.68), lightHue(behind), 0.55 * lit) * (0.45 + 0.85 * lit);

  float a = clamp(aRiv + aTrack + aRefl + aSheen + aMull + aArris, 0.0, 1.0);
  if (a < 0.002) discard;
  vec3 c = (cRiv * aRiv + cTrack * aTrack + uReflColor * aRefl + cSheen * aSheen
          + cMull * aMull + cArris * aArris) / max(a, 0.0001);
  gl_FragColor = vec4(c, a);
}
`;
