/**
 * Lamplighter — background transitions.
 *
 * A single ShaderPass inserted right after the RenderPass. When a background
 * changes we (1) freeze the OUTGOING scene into a render target, (2) let the
 * Stage swap the layer textures, then (3) tween `uProgress` 0→1 so the frozen
 * snapshot blends into the freshly-rendered incoming scene. When idle the pass
 * is a pure pass-through (`uActive = 0`), so it costs one texture fetch.
 *
 * Kinds: dissolve (default) · crossfade · iris · light-bleed (chapter breaks).
 */
import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import gsap from 'gsap';
import { FULLSCREEN_VERTEX, TRANSITION_FRAGMENT } from './shaders';

export type TransitionKind = 'dissolve' | 'crossfade' | 'iris' | 'light-bleed';

const KIND_INDEX: Record<TransitionKind, number> = {
  dissolve: 0,
  crossfade: 1,
  iris: 2,
  'light-bleed': 3,
};

function normalizeKind(name: string | undefined): TransitionKind {
  switch (name) {
    case 'crossfade':
    case 'fade':
      return 'crossfade';
    case 'iris':
      return 'iris';
    case 'light-bleed':
    case 'lightbleed':
    case 'bleed':
    case 'chapter':
      return 'light-bleed';
    case 'dissolve':
    default:
      return 'dissolve';
  }
}

export class Transitions {
  readonly pass: ShaderPass;

  private readonly renderer: THREE.WebGLRenderer;
  private prevRT: THREE.WebGLRenderTarget;
  private active: gsap.core.Tween | null = null;

  constructor(renderer: THREE.WebGLRenderer, width: number, height: number, keyColor: THREE.Color) {
    this.renderer = renderer;
    this.prevRT = new THREE.WebGLRenderTarget(Math.max(1, width), Math.max(1, height), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    });

    this.pass = new ShaderPass({
      name: 'PQTransition',
      uniforms: {
        tDiffuse: { value: null },
        tPrev: { value: this.prevRT.texture },
        uProgress: { value: 0 },
        uActive: { value: 0 },
        uKind: { value: 0 },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uKey: { value: keyColor.clone() },
      },
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: TRANSITION_FRAGMENT,
    });
  }

  setKeyColor(color: THREE.Color): void {
    (this.pass.uniforms.uKey.value as THREE.Color).copy(color);
  }

  update(t: number): void {
    this.pass.uniforms.uTime.value = t;
  }

  /** Freeze the current scene (call BEFORE swapping layer textures). */
  snapshot(scene: THREE.Scene, camera: THREE.Camera): void {
    const prevTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.prevRT);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(prevTarget);
    this.pass.uniforms.tPrev.value = this.prevRT.texture;
  }

  /**
   * Run a transition. Snapshot first, swap textures, then call this. Resolves
   * when the blend completes. Duration is clamped to the cinematic 0.8–1.4s band
   * (light-bleed a touch longer for chapter breaks).
   */
  play(kind: string | undefined, durationSec?: number): Promise<void> {
    const resolved = normalizeKind(kind);
    const base = resolved === 'light-bleed' ? 1.3 : 1.0;
    const dur = THREE.MathUtils.clamp(durationSec ?? base, 0.8, 1.4);

    if (this.active) {
      this.active.kill();
      this.active = null;
    }
    const u = this.pass.uniforms;
    u.uKind.value = KIND_INDEX[resolved];
    u.uProgress.value = 0;
    u.uActive.value = 1;

    return new Promise((resolve) => {
      this.active = gsap.to(u.uProgress, {
        value: 1,
        duration: dur,
        ease: resolved === 'light-bleed' ? 'power2.inOut' : 'power1.inOut',
        onComplete: () => {
          u.uActive.value = 0;
          u.uProgress.value = 0;
          this.active = null;
          resolve();
        },
      });
    });
  }

  /** Short self-dissolve shimmer used for the `fx dissolve` effect. */
  fxShimmer(scene: THREE.Scene, camera: THREE.Camera): void {
    this.snapshot(scene, camera);
    void this.play('dissolve', 0.8);
  }

  get busy(): boolean {
    return this.pass.uniforms.uActive.value > 0.5;
  }

  resize(width: number, height: number): void {
    this.prevRT.setSize(Math.max(1, width), Math.max(1, height));
    this.pass.uniforms.tPrev.value = this.prevRT.texture;
    (this.pass.uniforms.uResolution.value as THREE.Vector2).set(width, height);
  }

  dispose(): void {
    if (this.active) this.active.kill();
    this.active = null;
    gsap.killTweensOf(this.pass.uniforms.uProgress);
    this.prevRT.dispose();
    this.pass.dispose();
  }
}
