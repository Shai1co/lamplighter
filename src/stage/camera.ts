/**
 * Picture Quest — cinematic camera (Ken Burns).
 *
 * A PerspectiveCamera driven with a slow, continuous idle drift (dolly + float)
 * plus gsap-tweened directive moves (push / pull / pan / still) and a decaying
 * procedural shake for `fx:play shake`. Reduced-motion cuts drift and shake.
 * The layered planes live at distinct Z, so real perspective supplies parallax;
 * this controller only adds the tasteful micro-motion on top.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import type { CameraMove } from '../core/types';

const BASE_FOV = 35;
const BASE_Z = 6;

export class KenBurns {
  readonly camera: THREE.PerspectiveCamera;

  /** Base (target) position the drift oscillates around. gsap tweens this. */
  private readonly base = new THREE.Vector3(0, 0, BASE_Z);
  private readonly look = new THREE.Vector3(0, 0, 0);
  private readonly applied = new THREE.Vector3(0, 0, BASE_Z);

  /** fov = BASE_FOV / zoom (zoom > 1 ⇒ tighter). gsap tweens this. */
  private zoom = 1;
  private lastFov = BASE_FOV;

  private reduced = false;
  private shakeAmp = 0;
  private shakeTime = 0;

  private readonly tweens = new Set<gsap.core.Tween>();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(BASE_FOV, aspect, 0.1, 100);
    this.camera.position.copy(this.base);
    this.camera.lookAt(this.look);
  }

  setReducedMotion(v: boolean): void {
    this.reduced = v;
    if (v) this.shakeAmp = 0;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Distance from the camera to a world Z (used to focus the DoF). */
  distanceTo(worldZ: number): number {
    return Math.abs(this.applied.z - worldZ);
  }

  private track(t: gsap.core.Tween): void {
    this.tweens.add(t);
    t.eventCallback('onComplete', () => this.tweens.delete(t));
  }

  /** Handle a `camera:move` directive. */
  move(kind: CameraMove, zoom: number, duration: number): void {
    const dur = this.reduced ? Math.min(duration, 0.4) : Math.max(duration, 0.001);
    const ease = 'power2.inOut';
    const targetZoom = zoom && zoom > 0 ? zoom : 1;

    switch (kind) {
      case 'push':
        this.track(gsap.to(this.base, { z: BASE_Z - 1.1, duration: dur, ease }));
        this.track(gsap.to(this, { zoom: targetZoom > 1 ? targetZoom : 1.18, duration: dur, ease }));
        break;
      case 'pull':
        this.track(gsap.to(this.base, { z: BASE_Z + 0.6, duration: dur, ease }));
        this.track(gsap.to(this, { zoom: targetZoom < 1 ? targetZoom : 0.9, duration: dur, ease }));
        break;
      case 'pan-left':
        this.track(gsap.to(this.base, { x: -0.9, duration: dur, ease }));
        if (targetZoom !== 1) this.track(gsap.to(this, { zoom: targetZoom, duration: dur, ease }));
        break;
      case 'pan-right':
        this.track(gsap.to(this.base, { x: 0.9, duration: dur, ease }));
        if (targetZoom !== 1) this.track(gsap.to(this, { zoom: targetZoom, duration: dur, ease }));
        break;
      case 'still':
      default:
        this.track(gsap.to(this.base, { x: 0, y: 0, z: BASE_Z, duration: dur, ease }));
        this.track(gsap.to(this, { zoom: 1, duration: dur, ease }));
        break;
    }
  }

  /** Decaying camera shake (world units). No-op under reduced motion. */
  shake(intensity: number, _duration: number): void {
    if (this.reduced) return;
    this.shakeAmp = Math.max(this.shakeAmp, 0.06 + intensity * 0.18);
    this.shakeTime = 0;
  }

  /** Per-frame update. `t` is elapsed seconds. */
  update(dt: number, t: number): void {
    let dx = 0;
    let dy = 0;
    let dz = 0;
    if (!this.reduced) {
      dx = Math.sin(t * 0.13) * 0.08 + Math.sin(t * 0.07 + 1.3) * 0.05;
      dy = Math.cos(t * 0.11) * 0.05 + Math.sin(t * 0.05 + 0.6) * 0.03;
      dz = Math.sin(t * 0.05) * 0.06;
    }

    let sx = 0;
    let sy = 0;
    if (this.shakeAmp > 0.0005) {
      this.shakeTime += dt;
      sx = Math.sin(this.shakeTime * 57.0) * this.shakeAmp;
      sy = Math.sin(this.shakeTime * 63.3 + 2.1) * this.shakeAmp;
      this.shakeAmp *= Math.exp(-dt * 7.0);
    } else {
      this.shakeAmp = 0;
    }

    this.applied.set(this.base.x + dx + sx, this.base.y + dy + sy, this.base.z + dz);
    this.camera.position.copy(this.applied);
    this.camera.lookAt(this.look);

    const fov = BASE_FOV / Math.max(this.zoom, 0.05);
    if (Math.abs(fov - this.lastFov) > 1e-4) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
      this.lastFov = fov;
    }
  }

  /** Current horizontal offset — layers read this for exaggerated parallax. */
  get panX(): number {
    return this.applied.x;
  }
  get panY(): number {
    return this.applied.y;
  }

  dispose(): void {
    for (const tw of this.tweens) tw.kill();
    this.tweens.clear();
    gsap.killTweensOf(this.base);
    gsap.killTweensOf(this);
  }
}
