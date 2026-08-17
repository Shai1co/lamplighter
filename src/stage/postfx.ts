/**
 * Picture Quest — post-processing stack.
 *
 * EffectComposer pipeline (all intermediate targets stay linear; OutputPass does
 * the final ACES tone-map + sRGB encode):
 *
 *   RenderPass → Transition → UnrealBloom → Bokeh (DoF) → Grade → SMAA → Output
 *
 * • UnrealBloom: soft, high threshold so only genuine highlights bloom.
 * • Bokeh: gentle DoF focused on the active character / foreground.
 * • Grade: the custom look — per-theme lift/gamma/gain + contrast/saturation,
 *   teal-orange split-tone, vignette, edge chromatic aberration, animated grain,
 *   plus transient flash + glitch hooks for fx:play.
 *
 * applySettings: cinematic=false disables bloom/DoF/grade (RenderPass→Transition
 * →Output only); grain drives the grain uniform; reducedMotion is honored by the
 * camera/shake path, and here damps the grain a touch.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import gsap from 'gsap';
import type { StoryTheme, Settings } from '../core/types';
import { FULLSCREEN_VERTEX, GRADE_FRAGMENT } from './shaders';

interface GradeUniforms {
  tDiffuse: { value: THREE.Texture | null };
  uResolution: { value: THREE.Vector2 };
  uTime: { value: number };
  uLift: { value: THREE.Vector3 };
  uGamma: { value: THREE.Vector3 };
  uGain: { value: THREE.Vector3 };
  uContrast: { value: number };
  uSaturation: { value: number };
  uSplitTone: { value: number };
  uVignette: { value: number };
  uGrain: { value: number };
  uAberration: { value: number };
  uFlash: { value: number };
  uGlitch: { value: number };
  [key: string]: THREE.IUniform;
}

const v3 = (a?: [number, number, number], d = 0): THREE.Vector3 =>
  a ? new THREE.Vector3(a[0], a[1], a[2]) : new THREE.Vector3(d, d, d);

export class PostFX {
  readonly composer: EffectComposer;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly bloom: UnrealBloomPass;
  private readonly bokeh: BokehPass;
  private readonly grade: ShaderPass;
  private readonly smaa: SMAAPass;
  private readonly output: OutputPass;
  private readonly gradeU: GradeUniforms;

  private cinematic = true;
  private reduced = false;
  private grainSetting = 0.5;
  private themeGrain = 1;
  private themeBloom = 0.65;

  private flashTween: gsap.core.Tween | null = null;
  private glitchTween: gsap.core.Tween | null = null;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    transitionPass: ShaderPass,
    width: number,
    height: number,
  ) {
    this.renderer = renderer;

    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(renderer.getPixelRatio());
    this.composer.setSize(width, height);

    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);
    this.composer.addPass(transitionPass);

    this.bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.65, 0.42, 0.85);
    this.composer.addPass(this.bloom);

    this.bokeh = new BokehPass(scene, camera, { focus: 6.5, aperture: 0.0006, maxblur: 0.008 });
    this.composer.addPass(this.bokeh);

    this.gradeU = {
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2(width, height) },
      uTime: { value: 0 },
      uLift: { value: v3(undefined, 0) },
      uGamma: { value: v3(undefined, 1) },
      uGain: { value: v3(undefined, 1) },
      uContrast: { value: 1.06 },
      uSaturation: { value: 1.03 },
      uSplitTone: { value: 0.35 },
      uVignette: { value: 0.32 },
      uGrain: { value: 0.5 },
      uAberration: { value: 0.0016 },
      uFlash: { value: 0 },
      uGlitch: { value: 0 },
    };
    this.grade = new ShaderPass({
      name: 'PQGrade',
      uniforms: this.gradeU,
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: GRADE_FRAGMENT,
    });
    this.composer.addPass(this.grade);

    this.smaa = new SMAAPass(
      width * renderer.getPixelRatio(),
      height * renderer.getPixelRatio(),
    );
    this.composer.addPass(this.smaa);

    this.output = new OutputPass();
    this.composer.addPass(this.output);
  }

  /** Apply a story theme's grade + bloom/vignette/grain overrides. */
  setGrade(theme: StoryTheme): void {
    const g = theme.grade ?? {};
    this.gradeU.uLift.value.copy(v3(g.lift, 0));
    this.gradeU.uGamma.value.copy(v3(g.gamma, 1));
    this.gradeU.uGain.value.copy(v3(g.gain, 1));
    this.gradeU.uContrast.value = g.contrast ?? 1.06;
    this.gradeU.uSaturation.value = g.saturation ?? 1.03;
    this.gradeU.uSplitTone.value = g.splitTone ?? 0.35;
    this.gradeU.uVignette.value = theme.vignette ?? 0.32;
    this.themeGrain = theme.grain ?? 1;
    this.themeBloom = theme.bloom ?? 0.65;
    this.bloom.strength = this.cinematic ? this.themeBloom : 0;
    this.refreshGrain();
  }

  setGrain(x: number): void {
    this.grainSetting = THREE.MathUtils.clamp(x, 0, 1);
    this.refreshGrain();
  }

  setBloom(x: number): void {
    this.themeBloom = x;
    this.bloom.strength = this.cinematic ? x : 0;
  }

  private refreshGrain(): void {
    const damp = this.reduced ? 0.5 : 1;
    this.gradeU.uGrain.value = this.cinematic ? this.grainSetting * this.themeGrain * damp : 0;
  }

  /** Focus the DoF on a world-space distance from the camera. */
  setFocus(distance: number): void {
    if (!this.cinematic) return;
    const u = this.bokeh.materialBokeh.uniforms as { [k: string]: THREE.IUniform };
    const cur = u.focus.value as number;
    u.focus.value = cur + (distance - cur) * 0.1;
  }

  /** White flash (fx:play flash). */
  flash(strength = 0.9): void {
    if (this.flashTween) this.flashTween.kill();
    this.gradeU.uFlash.value = THREE.MathUtils.clamp(strength, 0, 1);
    this.flashTween = gsap.to(this.gradeU.uFlash, {
      value: 0, duration: 0.5, ease: 'power2.out',
    });
  }

  /** Chromatic/scanline glitch burst (fx:play glitch). */
  glitch(strength = 1, duration = 0.5): void {
    if (this.glitchTween) this.glitchTween.kill();
    this.gradeU.uGlitch.value = THREE.MathUtils.clamp(strength, 0, 1.5);
    this.glitchTween = gsap.to(this.gradeU.uGlitch, {
      value: 0, duration, ease: 'power2.out',
    });
  }

  update(_dt: number, elapsed: number): void {
    this.gradeU.uTime.value = elapsed;
  }

  applySettings(settings: Settings): void {
    this.cinematic = settings.cinematic;
    this.reduced = settings.reducedMotion;
    this.grainSetting = settings.grain;

    this.bloom.enabled = settings.cinematic;
    this.bokeh.enabled = settings.cinematic;
    this.grade.enabled = settings.cinematic;
    this.bloom.strength = settings.cinematic ? this.themeBloom : 0;
    this.refreshGrain();
  }

  render(dt: number): void {
    this.composer.render(dt);
  }

  resize(width: number, height: number): void {
    const pr = this.renderer.getPixelRatio();
    this.composer.setPixelRatio(pr);
    this.composer.setSize(width, height);
    this.bloom.resolution.set(width, height);
    this.bloom.setSize(width, height);
    this.gradeU.uResolution.value.set(width * pr, height * pr);
    this.smaa.setSize(width * pr, height * pr);
  }

  dispose(): void {
    if (this.flashTween) this.flashTween.kill();
    if (this.glitchTween) this.glitchTween.kill();
    gsap.killTweensOf(this.gradeU.uFlash);
    gsap.killTweensOf(this.gradeU.uGlitch);
    this.bloom.dispose();
    this.bokeh.dispose();
    this.grade.dispose();
    this.smaa.dispose();
    this.output.dispose();
    this.composer.dispose();
  }
}
