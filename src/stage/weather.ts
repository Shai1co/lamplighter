/**
 * Picture Quest — weather & atmosphere.
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
    const w = kind === 'streak' ? 0.12 : 0.04;
    if (kind === 'hairline') {
      // Soft edges across the width as well as along the length.
      const h = ctx.createLinearGradient(s * (0.5 - w * 1.6), 0, s * (0.5 + w * 1.6), 0);
      h.addColorStop(0, 'rgba(255,255,255,0)');
      h.addColorStop(0.5, 'rgba(255,255,255,1)');
      h.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = h;
      ctx.fillRect(s * (0.5 - w * 1.6), 0, s * w * 3.2, s);
      ctx.globalCompositeOperation = 'destination-in';
    }
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(255,255,255,${kind === 'streak' ? 0.85 : 1})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(kind === 'streak' ? s * 0.44 : 0, 0, kind === 'streak' ? s * 0.12 : s, s);
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

/** The full weather volume — everything but the foreground rain lives here. */
const FIELD: Region = { cx: 0, cy: 0, cz: 0, hx: HALF_W, hy: HALF_H, hz: HALF_D };

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
const NEAR_RAIN: Region = { cx: -1.28, cy: 0, cz: 1.9, hx: 0.68, hy: 3.5, hz: 0.3 };
/* Slightly steeper slant than the main field: closer rain shears more. */
const NEAR_RAIN_WIND = 1.9;
const RAIN_WIND = 1.4;

/** Pre-jitter field opacities (see the note at the `buildField` call sites). */
const RAIN_BASE = 0.9;
const RAIN_NEAR_BASE = 0.95;

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

  private readonly rnd = mulberry32(STAGE_SEED ^ 0x51ed270b);
  private readonly tweens = new Set<gsap.core.Tween>();

  // Per-system opacity multipliers (tweened by setWeather).
  private amt = { rain: 0, snow: 0, dust: 0, fog: 0 };

  constructor(worldZ: number) {
    this.group = new THREE.Group();
    this.group.position.z = worldZ;
    this.group.renderOrder = 40;

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

    // Field opacities are the PRE-jitter base: each drop then keeps 30–80% of it
    // (RAIN_DIFFUSE_PATCH), mean 0.55, so these carry the old effective density.
    this.rain = this.buildField(360, this.streakTex, {
      size: 0.5, color: 0xbcd2dc, opacity: RAIN_BASE, additive: false, velMin: 9, velMax: 13,
    }, FIELD);
    this.patchRainMaterial(this.rain.material);
    this.rainNear = this.buildField(9, this.hairlineTex, {
      size: 0.92, color: 0xcfd9de, opacity: RAIN_NEAR_BASE, additive: false, velMin: 10, velMax: 13.5,
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
    this.fog.renderOrder = 39;
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
      },
      vertexShader: GLASS_VERTEX,
      fragmentShader: GLASS_FRAGMENT,
    });
    this.glass = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2.4, HALF_H * 2.4), this.glassMat);
    this.glass.position.z = 0.2;
    this.glass.renderOrder = 41;
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
