/**
 * Picture Quest — weather & atmosphere.
 *
 * Four cheap, GPU-friendly systems living on a near plane in front of the cast:
 *   • rain  — streaked point sprites falling with a slight wind,
 *   • snow  — drifting points with a lateral sway,
 *   • dust  — slow floating motes (additive) that catch the light,
 *   • fog   — a soft, slowly-drifting depth veil.
 * `setWeather(kind, intensity)` cross-tweens visibility; particle placement is
 * fully deterministic (mulberry32, fixed seed) — never Math.random.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import type { WeatherKind } from '../core/types';
import { mulberry32, STAGE_SEED } from './shaders';

/** Draws a soft radial dot into a canvas → sprite texture. */
function dotTexture(streak: boolean): THREE.Texture {
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = s;
  cv.height = s;
  const ctx = cv.getContext('2d')!;
  if (streak) {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(s * 0.44, 0, s * 0.12, s);
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

interface ParticleField {
  points: THREE.Points;
  material: THREE.PointsMaterial;
  positions: Float32Array;
  velY: Float32Array;
  swayPhase: Float32Array;
  count: number;
  bounds: { x: number; y: number; z: number };
}

const HALF_W = 9;
const HALF_H = 6;
const HALF_D = 2.2;

export class Weather {
  readonly group: THREE.Group;

  private kind: WeatherKind = 'none';
  private intensity = 0;

  private readonly rain: ParticleField;
  private readonly snow: ParticleField;
  private readonly dust: ParticleField;

  private readonly fog: THREE.Mesh;
  private readonly fogMat: THREE.ShaderMaterial;

  private readonly streakTex: THREE.Texture;
  private readonly dotTex: THREE.Texture;

  private readonly rnd = mulberry32(STAGE_SEED ^ 0x51ed270b);
  private readonly tweens = new Set<gsap.core.Tween>();

  // Per-system opacity multipliers (tweened by setWeather).
  private amt = { rain: 0, snow: 0, dust: 0, fog: 0 };

  constructor(worldZ: number) {
    this.group = new THREE.Group();
    this.group.position.z = worldZ;
    this.group.renderOrder = 40;

    this.streakTex = dotTexture(true);
    this.dotTex = dotTexture(false);

    this.rain = this.buildField(360, this.streakTex, {
      size: 0.5, color: 0xbcd2dc, opacity: 0.5, additive: false, velMin: 9, velMax: 13,
    });
    this.snow = this.buildField(240, this.dotTex, {
      size: 0.12, color: 0xeef4f8, opacity: 0.9, additive: false, velMin: 0.5, velMax: 1.1,
    });
    this.dust = this.buildField(140, this.dotTex, {
      size: 0.09, color: 0xe6c79a, opacity: 0.6, additive: true, velMin: 0.05, velMax: 0.18,
    });

    this.group.add(this.rain.points, this.snow.points, this.dust.points);

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

    this.setFieldOpacity(this.rain, 0);
    this.setFieldOpacity(this.snow, 0);
    this.setFieldOpacity(this.dust, 0);
  }

  private buildField(
    count: number,
    map: THREE.Texture,
    o: { size: number; color: number; opacity: number; additive: boolean; velMin: number; velMax: number },
  ): ParticleField {
    const positions = new Float32Array(count * 3);
    const velY = new Float32Array(count);
    const swayPhase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (this.rnd() * 2 - 1) * HALF_W;
      positions[i * 3 + 1] = (this.rnd() * 2 - 1) * HALF_H;
      positions[i * 3 + 2] = (this.rnd() * 2 - 1) * HALF_D;
      velY[i] = o.velMin + this.rnd() * (o.velMax - o.velMin);
      swayPhase[i] = this.rnd() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
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
    return { points, material, positions, velY, swayPhase, count, bounds: { x: HALF_W, y: HALF_H, z: HALF_D } };
  }

  private baseOpacity(field: ParticleField): number {
    if (field === this.rain) return 0.5;
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
        },
      }));
    }
  }

  update(dt: number, t: number): void {
    this.fogMat.uniforms.uTime.value = t;

    if (this.rain.points.visible) this.stepRain(dt);
    if (this.snow.points.visible) this.stepSnow(dt, t);
    if (this.dust.points.visible) this.stepDust(dt, t);
  }

  private stepRain(dt: number): void {
    const f = this.rain;
    const p = f.positions;
    const wind = 1.4;
    for (let i = 0; i < f.count; i++) {
      const iy = i * 3 + 1;
      p[iy] -= f.velY[i] * dt;
      p[i * 3] += wind * dt;
      if (p[iy] < -f.bounds.y) {
        p[iy] = f.bounds.y;
        p[i * 3] = (this.rnd() * 2 - 1) * f.bounds.x;
      }
      if (p[i * 3] > f.bounds.x) p[i * 3] = -f.bounds.x;
    }
    f.points.geometry.attributes.position.needsUpdate = true;
  }

  private stepSnow(dt: number, t: number): void {
    const f = this.snow;
    const p = f.positions;
    for (let i = 0; i < f.count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      p[iy] -= f.velY[i] * dt;
      p[ix] += Math.sin(t * 0.6 + f.swayPhase[i]) * 0.25 * dt;
      if (p[iy] < -f.bounds.y) {
        p[iy] = f.bounds.y;
        p[ix] = (this.rnd() * 2 - 1) * f.bounds.x;
      }
    }
    f.points.geometry.attributes.position.needsUpdate = true;
  }

  private stepDust(dt: number, t: number): void {
    const f = this.dust;
    const p = f.positions;
    for (let i = 0; i < f.count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      p[iy] += (Math.sin(t * 0.3 + f.swayPhase[i]) * 0.12 - f.velY[i] * 0.3) * dt;
      p[ix] += Math.cos(t * 0.25 + f.swayPhase[i] * 1.4) * 0.1 * dt;
      if (p[iy] < -f.bounds.y) p[iy] = f.bounds.y;
      if (p[iy] > f.bounds.y) p[iy] = -f.bounds.y;
    }
    f.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void {
    for (const tw of this.tweens) tw.kill();
    this.tweens.clear();
    gsap.killTweensOf(this.amt);
    for (const f of [this.rain, this.snow, this.dust]) {
      f.points.geometry.dispose();
      f.material.dispose();
    }
    this.fog.geometry.dispose();
    this.fogMat.dispose();
    this.streakTex.dispose();
    this.dotTex.dispose();
    this.group.clear();
  }
}
