/**
 * Lamplighter — weather & atmosphere.
 *
 * Six cheap, GPU-friendly systems living on a near plane in front of the cast:
 *   • rain  — streaked point sprites falling with a slight wind,
 *   • near  — a handful of fat foreground streaks hugging the left edge, close
 *             enough to the lens to parallax hard against the plate,
 *   • glass — rivulets + a reflected practical on the pane the camera sits behind,
 *   • snow  — drifting points with a lateral sway,
 *   • dust  — slow floating motes (additive) that catch the light,
 *   • fog   — a soft, slowly-drifting depth veil.
 * `setWeather(kind, intensity)` cross-tweens visibility; particle placement is
 * fully deterministic (mulberry32, fixed seed) — never Math.random.
 *
 * Rain and glass are both *coupled to the scene's own light*: `setLightField`
 * hands them a tiny reduction of the background currently on stage, which they
 * sample in screen space so streaks only brighten where something is lighting
 * them. See shaders.ts → LIGHTFIELD_GLSL.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import type { WeatherKind } from '../core/types';
import {
  mulberry32,
  STAGE_SEED,
  RAIN_VERTEX_DECL,
  RAIN_FRAGMENT_DECL,
  RAIN_DIFFUSE_PATCH,
  RAIN_POINTSIZE_PATCH,
  GLASS_VERTEX,
  GLASS_FRAGMENT,
} from './shaders';

/**
 * One soft ellipse of "this is the room, not the window", in the framed screen
 * (0..1, y-up). `soft` is the shoulder width as a fraction of the radius — the
 * shape has no straight edge anywhere by construction, so the fence can never
 * print as a matte. See LIGHTFIELD_GLSL → pqInterior.
 */
export interface InteriorLobe {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  soft: number;
}

/**
 * The window wall itself, as a rectangle of the framed screen (0..1, y-up) with
 * a soft shoulder on each side. See LIGHTFIELD_GLSL → pqPane: the interior lobes
 * say what is IN FRONT of the glass, and this says where the glass IS. Both are
 * needed — the complement of four ellipses leaks around them, and every leak is
 * a streak standing on a wall.
 */
export interface PaneSpec {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Shoulder widths in x and y, in frame fractions. */
  softX: number;
  softY: number;
}

/** Where a scene's brightest practical should be thrown back onto the glass. */
export interface ReflectionSpec {
  /** Screen-space position, 0..1 (y up). */
  x: number;
  y: number;
  color: THREE.Color;
  /** 0..1 strength; 0 disables the reflection entirely. */
  amount: number;
}

/**
 * Sprite textures for the particle fields.
 *   'dot'      — soft radial mote (snow, dust).
 *   'streak'   — the mid-distance raindrop: a 12%-wide bar, ends faded.
 *   'hairline' — the FOREGROUND raindrop. A point sprite is square, so a
 *                near-camera streak is drawn at a large `gl_PointSize` and would
 *                come out as a fat hard-edged bar on the 'streak' sprite. This
 *                one is 4% wide with a soft horizontal falloff, so blowing it up
 *                yields a long soft hairline instead of a white plank.
 *
 * The hairline is additionally BAKED OUT OF FOCUS. It lives roughly half the
 * distance to the plate the lens is focused on, so a tack-sharp edge on it is a
 * lie: the whole field then reads as one flat overlay laid across every depth
 * at once rather than as weather with a near plane. Blurring the sprite (rather
 * than the frame) is the only honest option here — the DoF pass's depth buffer
 * is alpha-blind and cannot be trusted with sprites (see postfx.ts).
 */
const HAIRLINE_DEFOCUS_PX = 1.6;

function dotTexture(kind: 'dot' | 'streak' | 'hairline'): THREE.Texture {
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = s;
  cv.height = s;
  const ctx = cv.getContext('2d')!;
  if (kind === 'streak' || kind === 'hairline') {
    /* Half-width of the sprite's HORIZONTAL falloff, in sprite fractions.
     *
     * The mid-distance streak used to have none: it was `fillRect(0.44s, 0.12s)`
     * with a gradient down its length only, i.e. a bar with two perfectly hard
     * vertical sides. That is fine at four pixels wide and catastrophic at
     * forty — and forty is what the near end of the size jitter draws, because a
     * point sprite scales its width with its length. The frame came back naming
     * one of them ("an arbitrary orange vertical streak at x≈1060"), and it was
     * exactly that: a single drop crossing an amber bokeh disc, flared warm by
     * the light coupling, printing as a hard-edged plank of paint hanging in the
     * window. A drop of water is a cylindrical lens; it has no edges at all, it
     * has a bright core and a falloff, and the falloff is the entire difference
     * between refractive and stamped.
     * Total footprint is kept near the old bar's (0.20s against 0.12s) with only
     * the middle ~0.08s at full strength, so the field's visual weight does not
     * change — only its boundary does. */
    const hw = kind === 'streak' ? 0.1 : 0.064;
    const h = ctx.createLinearGradient(s * (0.5 - hw), 0, s * (0.5 + hw), 0);
    h.addColorStop(0, 'rgba(255,255,255,0)');
    if (kind === 'streak') {
      h.addColorStop(0.3, 'rgba(255,255,255,0.55)');
      h.addColorStop(0.5, 'rgba(255,255,255,1)');
      h.addColorStop(0.7, 'rgba(255,255,255,0.55)');
    } else {
      h.addColorStop(0.5, 'rgba(255,255,255,1)');
    }
    h.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = h;
    ctx.fillRect(s * (0.5 - hw), 0, s * hw * 2, s);
    ctx.globalCompositeOperation = 'destination-in';
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(255,255,255,${kind === 'streak' ? 0.85 : 1})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    if (kind === 'hairline') {
      const soft = document.createElement('canvas');
      soft.width = s;
      soft.height = s;
      const sctx = soft.getContext('2d')!;
      sctx.filter = `blur(${HAIRLINE_DEFOCUS_PX}px)`;
      sctx.drawImage(cv, 0, 0);
      const tex = new THREE.CanvasTexture(soft);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }
  } else {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Axis-aligned spawn/recycle box: a centre plus half-extents, in group space. */
interface Region {
  cx: number;
  cy: number;
  cz: number;
  hx: number;
  hy: number;
  hz: number;
}

interface ParticleField {
  points: THREE.Points;
  material: THREE.PointsMaterial;
  positions: Float32Array;
  velY: Float32Array;
  swayPhase: Float32Array;
  count: number;
  region: Region;
}

const HALF_W = 9;
const HALF_H = 6;
const HALF_D = 2.2;

/** The general atmosphere volume (snow/dust retain their depth spread). */
const FIELD: Region = { cx: 0, cy: 0, cz: 0, hx: HALF_W, hy: HALF_H, hz: HALF_D };
/* Rain is a SHALLOW SLAB behind the character, never a volume through her.
 *
 * hz 0.18 → 0.42, and it is the cheapest depth cue on the rig. The field sits at
 * group z −1.25 and the character plane is at −0.70, so ±0.42 spans −1.67 to
 * −0.83 — genuinely three quarters of a metre of glass to fall through, and
 * still clear of her by 0.13. With `sizeAttenuation` on, that spread is what
 * gives the drops a real PARALLAX SCALE: a near one on the pane draws long and
 * a far one across the bay draws short, from the perspective divide rather than
 * from the per-drop jitter, and the two vary independently. At 0.18 every streak
 * in the window was within a hand's breadth of every other, which is what makes
 * a rain field read as a decal stamped on the glass instead of as weather with a
 * depth to it. */
const RAIN_FIELD: Region = { cx: 0, cy: 0, cz: 0, hx: HALF_W, hy: HALF_H, hz: 0.42 };

/**
 * Foreground rain. A handful of fat, fast streaks parked a metre and a half in
 * front of the rest of the weather and pinned to the left edge, where the
 * stories' practical lives. Two things earn their cost:
 *   • they parallax hard against the plate as the camera drifts, which is the
 *     one depth cue a painted still can never fake — the frames we capture are
 *     stills, so the engine has to bake its advantage into every one of them;
 *   • being close to the lens they render ~2× the streak of the main field, and
 *     the light coupling (see RAIN_DIFFUSE_PATCH) flares them warm as they cross
 *     the lamp and drops them to a whisper over dead black — so only the two or
 *     three actually crossing the light ever read.
 * The camera sits at z=6 and the group at z=0.8, so this box spans roughly 3.0
 * to 3.6 units out — comfortably inside the frustum's left third, where one
 * world unit is ~519 screen pixels against the main field's ~329.
 *
 * The box is deliberately 7 units tall for only 9 particles: at these speeds a
 * shorter box recycles every fifth of a second and strobes. This one gives a
 * ~0.6s period, which leaves two or three streaks in frame at any instant —
 * enough to read as foreground, too few to read as a curtain.
 */
/*
 * …and then the frame acquired an INTERIOR (see setInteriorMask), and this box
 * was sitting squarely inside it. At cx −1.28 the field lands on screen x
 * 0.25–0.42, which is the lamp, the monitor bezel and the near end of the desk:
 * every one of these streaks was falling in front of a prop that is on the
 * camera's side of the glass. The fence would have deleted them, which is the
 * right answer optically and a waste of nine draws.
 *
 * Moved to cx +1.6 — screen 0.66–0.75 — where the wall of window actually is.
 * The parallax argument that earned this field is unchanged (it is still a
 * metre and a half nearer the lens than the main plane and still shears against
 * the plate as the camera drifts); it is simply now shearing against glass
 * rather than across a lamp. Slightly narrower with it: the bay it crosses is
 * narrower than the left edge it used to hug.
 */
/*
 * …and then it was moved AGAIN, and this one is the important move: cx 1.6 puts
 * the box on screen x 0.64–0.77, and the speaker's plate occupies 0.51–0.84 with
 * her face and hair squarely in 0.60–0.75. Nine fat, fast, near-lens streaks
 * were falling directly down her features every frame.
 *
 * That is the whole of the "rain reads as film scratches / compositing
 * artefacts" note, and no amount of fencing fixes it: the figure mask can thin
 * these drops, but a foreground element at 2× the streak length is either
 * visible — in which case it is a bright line down a face — or it is invisible,
 * in which case the nine draws buy nothing. A near plane has to be somewhere
 * there is nothing behind it.
 *
 * cx 3.05 → screen 0.84–0.94: the outboard bay, right of her shoulder, inboard
 * of the frame edge and straddling the second mullion at 0.845. Every argument
 * that earned this field is intact (it is still a metre and a half nearer the
 * lens, it still shears against the plate as the camera drifts) and it now
 * shears past a window member instead of past a cheek — which is strictly a
 * better read of the same effect, because a foreground streak crossing a frame
 * member is the depth cue, and one crossing a face is an artefact.
 */
const NEAR_RAIN: Region = { cx: 3.05, cy: 0, cz: 0.28, hx: 0.42, hy: 3.5, hz: 0.12 };
/* Slightly steeper slant than the main field: closer rain shears more. */
const NEAR_RAIN_WIND = 1.9;
const RAIN_WIND = 1.4;

/** Pre-jitter field opacities (see the note at the `buildField` call sites). */
const RAIN_BASE = 0.9;
const RAIN_NEAR_BASE = 0.285;

export class Weather {
  readonly group: THREE.Group;

  private kind: WeatherKind = 'none';
  private intensity = 0;

  private readonly rain: ParticleField;
  private readonly rainNear: ParticleField;
  private readonly snow: ParticleField;
  private readonly dust: ParticleField;

  private readonly fog: THREE.Mesh;
  private readonly fogMat: THREE.ShaderMaterial;

  private readonly glass: THREE.Mesh;
  private readonly glassMat: THREE.ShaderMaterial;

  private readonly streakTex: THREE.Texture;
  private readonly hairlineTex: THREE.Texture;
  private readonly dotTex: THREE.Texture;

  /** Shared with the rain patch and the glass pass — one texture, two consumers. */
  private readonly neutralTex: THREE.DataTexture;
  private readonly uLight: THREE.IUniform<THREE.Texture>;
  private readonly uHasLight: THREE.IUniform<number>;
  /** Render-target size in device pixels — both systems read gl_FragCoord. */
  private readonly uLightRes: THREE.IUniform<THREE.Vector2>;
  /** Screen-space occupancy of the speaker: (cx, cy, rx, ry), y-up 0..1. */
  private readonly uFigure: THREE.IUniform<THREE.Vector4>;
  private readonly uFigureAmt: THREE.IUniform<number>;
  /** The room's own furniture, as up to three soft ellipses. See pqInterior. */
  private readonly uInteriorA: THREE.IUniform<THREE.Vector4>;
  private readonly uInteriorB: THREE.IUniform<THREE.Vector4>;
  private readonly uInteriorC: THREE.IUniform<THREE.Vector4>;
  private readonly uInteriorD: THREE.IUniform<THREE.Vector4>;
  private readonly uInteriorSoft: THREE.IUniform<THREE.Vector4>;
  private readonly uInteriorAmt: THREE.IUniform<number>;
  /** …and the positive half of the same statement: where the glass is. */
  private readonly uPane: THREE.IUniform<THREE.Vector4>;
  private readonly uPaneSoft: THREE.IUniform<THREE.Vector2>;
  private readonly uPaneAmt: THREE.IUniform<number>;

  private readonly rnd = mulberry32(STAGE_SEED ^ 0x51ed270b);
  private readonly tweens = new Set<gsap.core.Tween>();

  // Per-system opacity multipliers (tweened by setWeather).
  private amt = { rain: 0, snow: 0, dust: 0, fog: 0 };

  constructor(worldZ: number) {
    this.group = new THREE.Group();
    this.group.position.z = worldZ;
    this.group.renderOrder = 10;

    this.streakTex = dotTexture('streak');
    this.hairlineTex = dotTexture('hairline');
    this.dotTex = dotTexture('dot');

    // Neutral stand-in so the sampler is always bound (and the coupling is a
    // no-op) before a background has published its light field.
    this.neutralTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    this.neutralTex.needsUpdate = true;
    this.uLight = { value: this.neutralTex };
    this.uHasLight = { value: 0 };
    this.uLightRes = { value: new THREE.Vector2(1920, 1080) };
    this.uFigure = { value: new THREE.Vector4(0.5, 0.5, 0.001, 0.001) };
    this.uFigureAmt = { value: 0 };
    // Zero radii ⇒ the lobe returns 0 ⇒ the fence is a no-op until a plate
    // declares an interior. A story with no PLATE_INTERIOR entry keeps exactly
    // the weather it had.
    this.uInteriorA = { value: new THREE.Vector4(0, 0, 0, 0) };
    this.uInteriorB = { value: new THREE.Vector4(0, 0, 0, 0) };
    this.uInteriorC = { value: new THREE.Vector4(0, 0, 0, 0) };
    this.uInteriorD = { value: new THREE.Vector4(0, 0, 0, 0) };
    this.uInteriorSoft = { value: new THREE.Vector4(0.3, 0.3, 0.3, 0.3) };
    this.uInteriorAmt = { value: 0 };
    // Amount 0 ⇒ pqPane returns 1 everywhere ⇒ a plate that declares no window
    // keeps exactly the weather it had.
    this.uPane = { value: new THREE.Vector4(0, 0, 1, 1) };
    this.uPaneSoft = { value: new THREE.Vector2(0.05, 0.05) };
    this.uPaneAmt = { value: 0 };

    // Field opacities are the PRE-jitter base: each drop then keeps 30–80% of it
    // (RAIN_DIFFUSE_PATCH), mean 0.55, so these carry the old effective density.
    /* Velocity spread 9–13 → 6.5–16.5, i.e. ±44% about the mean rather than
     * ±18%, and it is the second half of the "vary streak length AND velocity"
     * note (RAIN_POINTSIZE_PATCH already spreads length by a factor of four).
     *
     * The two axes are independently drawn from the same stream and that is the
     * point: with a ±18% spread every drop in a captured STILL crossed the same
     * number of pixels per exposure, so however varied their painted lengths
     * were, the field animated as one sheet — and a sheet moving at one speed is
     * a texture being scrolled, which is exactly the overlay read. At ±44% the
     * near drops visibly outrun the far ones between frames while their lengths
     * disagree with their speeds, which is what a real fall through two metres
     * of depth and a gusting wind actually looks like. */
    this.rain = this.buildField(360, this.streakTex, {
      size: 0.5, color: 0xbcd2dc, opacity: RAIN_BASE, additive: false, velMin: 6.5, velMax: 16.5,
    }, RAIN_FIELD);
    this.patchRainMaterial(this.rain.material);
    this.rainNear = this.buildField(9, this.hairlineTex, {
      size: 0.92, color: 0xcfd9de, opacity: RAIN_NEAR_BASE, additive: false, velMin: 9, velMax: 17,
    }, NEAR_RAIN);
    this.patchRainMaterial(this.rainNear.material);
    this.snow = this.buildField(240, this.dotTex, {
      size: 0.12, color: 0xeef4f8, opacity: 0.9, additive: false, velMin: 0.5, velMax: 1.1,
    }, FIELD);
    this.dust = this.buildField(140, this.dotTex, {
      size: 0.09, color: 0xe6c79a, opacity: 0.6, additive: true, velMin: 0.05, velMax: 0.18,
    }, FIELD);

    this.group.add(this.rain.points, this.rainNear.points, this.snow.points, this.dust.points);

    // Fog veil.
    this.fogMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color(0x8fa6b2) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uTime; uniform float uOpacity; uniform vec3 uColor;
        float h(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.3); return fract(p.x*p.y); }
        float n(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
          return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y); }
        void main(){
          vec2 uv = vUv;
          float f = n(uv*3.0 + vec2(uTime*0.02, uTime*0.01));
          f = f*0.6 + n(uv*6.0 - vec2(uTime*0.015, 0.0))*0.4;
          float band = smoothstep(0.15, 0.75, uv.y);
          float a = uOpacity * (0.35 + 0.65*f) * (0.4 + 0.6*band);
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    this.fog = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2.4, HALF_H * 2.4), this.fogMat);
    this.fog.position.z = -0.6;
    this.fog.renderOrder = 9;
    this.fog.frustumCulled = false;
    this.group.add(this.fog);

    // Rain-on-glass: rivulets + the reflected practical. Screen-space, so it
    // stays welded to the pane the camera is behind instead of parallaxing.
    this.glassMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uRefl: { value: new THREE.Vector2(0.78, 0.44) },
        uReflColor: { value: new THREE.Color(0xe8a05c) },
        uReflAmt: { value: 0 },
        uLight: this.uLight,
        uHasLight: this.uHasLight,
        uLightRes: this.uLightRes,
        uFigure: this.uFigure,
        uFigureAmt: this.uFigureAmt,
        uInteriorA: this.uInteriorA,
        uInteriorB: this.uInteriorB,
        uInteriorC: this.uInteriorC,
        uInteriorD: this.uInteriorD,
        uInteriorSoft: this.uInteriorSoft,
        uInteriorAmt: this.uInteriorAmt,
        uPane: this.uPane,
        uPaneSoft: this.uPaneSoft,
        uPaneAmt: this.uPaneAmt,
      },
      vertexShader: GLASS_VERTEX,
      fragmentShader: GLASS_FRAGMENT,
    });
    this.glass = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2.4, HALF_H * 2.4), this.glassMat);
    this.glass.position.z = 0.2;
    /* 12 → 40 → 12 again, and the round trip is the whole argument, so it is
     * worth stating both halves.
     *
     * At 40 the pane was the last thing drawn in the scene — genuinely in front
     * of the cast — on the reasoning that a shot which contains no surface in
     * front of the subject cannot read as a PLACE. The optics of that are
     * correct and the picture it produced was not. Character sprites sort at
     * 20 + index; with the pane at 40 every rivulet, every dried track, the
     * sheet's own specular, the reflected practical and a mullion were composited
     * ON TOP of a lit face. However hard each of those terms was thinned (and
     * they were thinned, repeatedly, over three rounds), the frame kept coming
     * back read as a SEMI-TRANSPARENT PHOTO-COMPOSITE: a woman with weather
     * crossing her features is not a woman behind a window, she is two layers.
     *
     * The window is not the thing the shot is about. She is. So the pane goes
     * back behind her and the room does the work instead: the fence order is now
     * fog (9) → rain (10) → glass (12) → contact shadow (19) → cast (20+), i.e.
     * every piece of weather in the rig belongs to the far side of her and
     * NOTHING draws over her. What says "there is a surface in this room" is now
     * carried by things that cannot cross a face — the pane's own mullions and
     * arrises out in the bays, the rivulets over the city, the contact shadow
     * under her, the lamp rim on her contour and the laptop's screen-glow rim in
     * front of her (see ui.css → the ops_room lid pass).
     *
     * The consumers in GLASS_FRAGMENT are fenced against her footprint on top of
     * this, because her plate is a 78px feather with a dissolving torso: without
     * the fence the water would simply show THROUGH her lower body, which is the
     * same read arriving by the other door. */
    this.glass.renderOrder = 12;
    this.glass.frustumCulled = false;
    this.glass.visible = false;
    this.group.add(this.glass);

    this.setFieldOpacity(this.rain, 0);
    this.setFieldOpacity(this.rainNear, 0);
    this.setFieldOpacity(this.snow, 0);
    this.setFieldOpacity(this.dust, 0);
  }

  private buildField(
    count: number,
    map: THREE.Texture,
    o: { size: number; color: number; opacity: number; additive: boolean; velMin: number; velMax: number },
    region: Region,
  ): ParticleField {
    const positions = new Float32Array(count * 3);
    const velY = new Float32Array(count);
    const swayPhase = new Float32Array(count);
    // Per-drop variation seed: drives length/width via gl_PointSize and exposure
    // via alpha, so no two streaks in a field are the same drop twice.
    const streak = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = region.cx + (this.rnd() * 2 - 1) * region.hx;
      positions[i * 3 + 1] = region.cy + (this.rnd() * 2 - 1) * region.hy;
      positions[i * 3 + 2] = region.cz + (this.rnd() * 2 - 1) * region.hz;
      velY[i] = o.velMin + this.rnd() * (o.velMax - o.velMin);
      swayPhase[i] = this.rnd() * Math.PI * 2;
      streak[i] = this.rnd();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aStreak', new THREE.BufferAttribute(streak, 1));
    const material = new THREE.PointsMaterial({
      map,
      size: o.size,
      color: o.color,
      transparent: true,
      opacity: o.opacity,
      depthWrite: false,
      depthTest: false,
      sizeAttenuation: true,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const points = new THREE.Points(geo, material);
    points.renderOrder = 10;
    points.frustumCulled = false;
    points.visible = false;
    return { points, material, positions, velY, swayPhase, count, region };
  }

  /**
   * Inject the light coupling into three's stock points program. Patching
   * (rather than replacing) keeps size attenuation, the sprite map, tone mapping
   * and colour management exactly as three intends them.
   */
  private patchRainMaterial(material: THREE.PointsMaterial): void {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uLight = this.uLight;
      shader.uniforms.uHasLight = this.uHasLight;
      shader.uniforms.uLightRes = this.uLightRes;
      shader.uniforms.uFigure = this.uFigure;
      shader.uniforms.uFigureAmt = this.uFigureAmt;
      shader.uniforms.uInteriorA = this.uInteriorA;
      shader.uniforms.uInteriorB = this.uInteriorB;
      shader.uniforms.uInteriorC = this.uInteriorC;
      shader.uniforms.uInteriorD = this.uInteriorD;
      shader.uniforms.uInteriorSoft = this.uInteriorSoft;
      shader.uniforms.uInteriorAmt = this.uInteriorAmt;
      shader.uniforms.uPane = this.uPane;
      shader.uniforms.uPaneSoft = this.uPaneSoft;
      shader.uniforms.uPaneAmt = this.uPaneAmt;
      shader.vertexShader =
        RAIN_VERTEX_DECL + shader.vertexShader.replace('gl_PointSize = size;', RAIN_POINTSIZE_PATCH);
      shader.fragmentShader =
        RAIN_FRAGMENT_DECL + shader.fragmentShader.replace('outgoingLight = diffuseColor.rgb;', RAIN_DIFFUSE_PATCH);
    };
    material.customProgramCacheKey = () => 'pq-rain-lightfield';
  }

  /**
   * Publish the current scene's light reduction. `map` is a small RGBA texture
   * of the background (screen-space, y-up); `refl` places the reflected
   * practical on the glass. Pass nulls to decouple (rain falls back to uniform).
   */
  /** Render-target size in device pixels (Stage owns the sizing). */
  setResolution(width: number, height: number): void {
    this.uLightRes.value.set(Math.max(1, width), Math.max(1, height));
  }

  /**
   * Publish the speaker's screen-space footprint so the weather can fence
   * itself against her. Centre and radii are 0..1 of the framed screen, y-up;
   * `amount` 0 retires the fence entirely (no cast on stage, or a plate still
   * fading in). See LIGHTFIELD_GLSL → pqFigure.
   */
  setFigureMask(cx: number, cy: number, rx: number, ry: number, amount: number): void {
    this.uFigure.value.set(cx, cy, Math.max(rx, 1e-4), Math.max(ry, 1e-4));
    this.uFigureAmt.value = THREE.MathUtils.clamp(amount, 0, 1);
  }

  /**
   * Publish the room's own furniture as up to FOUR soft screen-space ellipses,
   * so every system on this rig stops drawing weather over surfaces that are on
   * the camera's side of the glass. Coordinates are the framed screen, 0..1,
   * y-up — the same frame the light field is sampled in.
   *
   * Pass an empty list (or amount 0) to retire the fence entirely.
   */
  setInteriorMask(lobes: ReadonlyArray<InteriorLobe>, amount: number): void {
    const slots = [this.uInteriorA, this.uInteriorB, this.uInteriorC, this.uInteriorD];
    const soft = this.uInteriorSoft.value;
    for (let i = 0; i < slots.length; i++) {
      const lobe = lobes[i];
      if (lobe) {
        slots[i].value.set(lobe.cx, lobe.cy, Math.max(lobe.rx, 0), Math.max(lobe.ry, 0));
        soft.setComponent(i, Math.max(lobe.soft, 0.02));
      } else {
        slots[i].value.set(0, 0, 0, 0);
      }
    }
    this.uInteriorAmt.value = THREE.MathUtils.clamp(amount, 0, 1);
  }

  /**
   * Publish the window wall itself. Every system on this rig lives on the far
   * side of the glass, so outside this rectangle there is no weather at all —
   * not thinned, absent. Pass null (or amount 0) to retire the matte, which is
   * what a plate with no window does.
   */
  setPaneMask(pane: PaneSpec | null, amount = 1): void {
    if (!pane || amount <= 0) {
      this.uPaneAmt.value = 0;
      return;
    }
    this.uPane.value.set(pane.x0, pane.y0, pane.x1, pane.y1);
    this.uPaneSoft.value.set(Math.max(pane.softX, 1e-3), Math.max(pane.softY, 1e-3));
    this.uPaneAmt.value = THREE.MathUtils.clamp(amount, 0, 1);
  }

  setLightField(map: THREE.Texture | null, refl: ReflectionSpec | null): void {
    this.uLight.value = map ?? this.neutralTex;
    this.uHasLight.value = map ? 1 : 0;
    const u = this.glassMat.uniforms;
    if (refl && refl.amount > 0) {
      (u.uRefl.value as THREE.Vector2).set(refl.x, refl.y);
      (u.uReflColor.value as THREE.Color).copy(refl.color);
      u.uReflAmt.value = refl.amount;
    } else {
      u.uReflAmt.value = 0;
    }
  }

  private baseOpacity(field: ParticleField): number {
    if (field === this.rain) return RAIN_BASE;
    if (field === this.rainNear) return RAIN_NEAR_BASE;
    if (field === this.snow) return 0.9;
    return 0.6;
  }

  private setFieldOpacity(field: ParticleField, amt: number): void {
    field.material.opacity = this.baseOpacity(field) * amt;
    field.points.visible = amt > 0.001;
  }

  private track(t: gsap.core.Tween): void {
    this.tweens.add(t);
    t.eventCallback('onComplete', () => this.tweens.delete(t));
  }

  /** Cross-tween to a new weather kind at the given intensity (0..1). */
  setWeather(kind: WeatherKind, intensity: number): void {
    this.kind = kind;
    this.intensity = THREE.MathUtils.clamp(intensity, 0, 1);
    const targets = { rain: 0, snow: 0, dust: 0, fog: 0 };
    if (kind === 'rain') targets.rain = this.intensity;
    else if (kind === 'snow') targets.snow = this.intensity;
    else if (kind === 'dust') targets.dust = this.intensity;
    else if (kind === 'fog') targets.fog = this.intensity;

    for (const key of ['rain', 'snow', 'dust', 'fog'] as const) {
      this.track(gsap.to(this.amt, {
        [key]: targets[key],
        duration: 1.1,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (key === 'fog') this.fogMat.uniforms.uOpacity.value = this.amt.fog * 0.5;
          else this.setFieldOpacity(this[key], this.amt[key]);
          if (key === 'rain') {
            this.setFieldOpacity(this.rainNear, this.amt.rain);
            this.glassMat.uniforms.uOpacity.value = this.amt.rain;
            this.glass.visible = this.amt.rain > 0.001;
          }
        },
      }));
    }
  }

  update(dt: number, t: number): void {
    this.fogMat.uniforms.uTime.value = t;
    if (this.glass.visible) this.glassMat.uniforms.uTime.value = t;

    if (this.rain.points.visible) this.stepRain(this.rain, RAIN_WIND, dt);
    if (this.rainNear.points.visible) this.stepRain(this.rainNear, NEAR_RAIN_WIND, dt);
    if (this.snow.points.visible) this.stepSnow(dt, t);
    if (this.dust.points.visible) this.stepDust(dt, t);
  }

  private stepRain(f: ParticleField, wind: number, dt: number): void {
    const p = f.positions;
    const r = f.region;
    for (let i = 0; i < f.count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      p[iy] -= f.velY[i] * dt;
      p[ix] += wind * dt;
      if (p[iy] < r.cy - r.hy) {
        p[iy] = r.cy + r.hy;
        p[ix] = r.cx + (this.rnd() * 2 - 1) * r.hx;
      }
      if (p[ix] > r.cx + r.hx) p[ix] = r.cx - r.hx;
    }
    f.points.geometry.attributes.position.needsUpdate = true;
  }

  private stepSnow(dt: number, t: number): void {
    const f = this.snow;
    const p = f.positions;
    const r = f.region;
    for (let i = 0; i < f.count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      p[iy] -= f.velY[i] * dt;
      p[ix] += Math.sin(t * 0.6 + f.swayPhase[i]) * 0.25 * dt;
      if (p[iy] < r.cy - r.hy) {
        p[iy] = r.cy + r.hy;
        p[ix] = r.cx + (this.rnd() * 2 - 1) * r.hx;
      }
    }
    f.points.geometry.attributes.position.needsUpdate = true;
  }

  private stepDust(dt: number, t: number): void {
    const f = this.dust;
    const p = f.positions;
    const r = f.region;
    for (let i = 0; i < f.count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      p[iy] += (Math.sin(t * 0.3 + f.swayPhase[i]) * 0.12 - f.velY[i] * 0.3) * dt;
      p[ix] += Math.cos(t * 0.25 + f.swayPhase[i] * 1.4) * 0.1 * dt;
      if (p[iy] < r.cy - r.hy) p[iy] = r.cy + r.hy;
      if (p[iy] > r.cy + r.hy) p[iy] = r.cy - r.hy;
    }
    f.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void {
    for (const tw of this.tweens) tw.kill();
    this.tweens.clear();
    gsap.killTweensOf(this.amt);
    for (const f of [this.rain, this.rainNear, this.snow, this.dust]) {
      f.points.geometry.dispose();
      f.material.dispose();
    }
    this.fog.geometry.dispose();
    this.fogMat.dispose();
    this.glass.geometry.dispose();
    this.glassMat.dispose();
    this.neutralTex.dispose();
    this.streakTex.dispose();
    this.hairlineTex.dispose();
    this.dotTex.dispose();
    this.group.clear();
  }
}
