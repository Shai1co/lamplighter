/**
 * Lamplighter — post-processing stack.
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
  uGrainSize: { value: number };
  uAberration: { value: number };
  uFlash: { value: number };
  uGlitch: { value: number };
  uFocus: { value: THREE.Vector4 };
  uFieldBlur: { value: number };
  uShadowBridge: { value: number };
  uMidLift: { value: number };
  [key: string]: THREE.IUniform;
}

/**
 * Iris. Deliberately stopped almost all the way down.
 *
 * BokehPass's depth pass is alpha-blind (it overrides every material with a
 * plain MeshDepthMaterial), so character sprites can only ever contribute their
 * rectangular quad, never their silhouette. Any aperture wide enough to throw
 * the city out of focus therefore also stamps a hard-edged rectangle of
 * differently-focused background around the speaker — a visible focus seam,
 * which is a hard-fail on the rubric. Stage keeps the plate itself excluded
 * from that trap by parking focus exactly on it; this stop then leaves a
 * whisper of falloff during a scene's focus ramp and nothing else. The shallow
 * depth of field the frames actually show is painted into the plates.
 */
const APERTURE = 0.0005;

/** Grain clump edge, in CSS pixels before the device pixel ratio. */
const GRAIN_PX = 2.2;

/**
 * Bloom gate.
 *
 * THRESHOLD was 0.85, which on a daylit plate — a wall of clerestory glass, a
 * lamp-lit sheet of paper — puts most of the upper midtones inside the bloom
 * and returns them as a veil over the whole middle of the frame. That veil is
 * indistinguishable from fog, and fog with no source has no shape: it is the
 * single largest contributor to a centre that reads as undifferentiated mush.
 * 0.93 admits only genuine specular highlights — the glass itself, the filament
 * side of a shade, a wet eye — so bloom decorates the SOURCES and stops
 * dissolving everything within a stop of them.
 *
 * RADIUS follows it down: a tight gate with a wide radius smears the few
 * highlights that survive across the frame, which is the same failure by
 * another route. 0.34 keeps the halo inside roughly a window's width.
 */
/*
 * …and then 0.93 turned out to be a gate with nothing behind it. The plates are
 * baked with a print shoulder of their own (compressPracticals, ceiling 0.90 in
 * sRGB ≈ 0.79 linear), so on the ops room NOTHING in the frame ever crossed
 * 0.93 and the bloom pass was, arithmetically, switched off. A night interior
 * whose practicals do not scatter has no air in it — every source is a flat
 * shape with a hard edge — and that is half of what made the frame read as an
 * upscaled still rather than a photograph of a lit room.
 *
 * 0.82 admits sRGB ≳ 233: the interior of the lamp shade, the hottest glyphs on
 * the relay board and the two or three brightest discs of city bokeh, and
 * nothing else. It is still a specular gate — the lit desktop (≈0.55 linear)
 * and the atrium's upper midtones stay well outside it — it simply now has
 * something on the far side of it.
 */
/*
 * …and then the RADIUS came down, 0.34 → 0.25.
 *
 * The note is specific and it is about the one asset in the frame worth
 * protecting: the relay board's cyan was smearing past its own bezel and onto
 * the wall behind it as a soft structureless blob, so the sharpest, most
 * legible, most diegetic object in the picture was being surrounded by the
 * blurriest. That is the wrong way round — bloom exists to say a source is
 * BRIGHT, and a halo wider than the source it comes from says instead that the
 * renderer could not resolve it.
 *
 * 0.25 keeps the scatter inside roughly a bezel's width of whatever emits it,
 * which still buys the air the gate note above is about (the shade's interior
 * and the brightest discs of city bokeh both still flare) and stops the board's
 * 12px type from being wrapped in a glow four times its own stroke.
 */
/*
 * …and the RADIUS comes in again, 0.25 → 0.17, with the gate opened four points
 * to keep it populated.
 *
 * The note is a value-HIERARCHY one — "the lamp head is the brightest region in
 * the frame and wins the eye over the face" — and half of what makes a source win
 * an eye is not its peak value at all, it is the AREA it occupies. A 233-code
 * shade interior is perhaps 180 × 60px; the same interior wearing a 0.25-radius
 * halo is a soft amber event four times that size, and the eye integrates the
 * event, not the pixel. So the shade's own exposure comes down at the plate bake
 * (Stage → PRACTICAL_KNEE / PRACTICAL_CEIL) and its scatter is pulled to roughly
 * two thirds of its old reach here. The two moves are the same fix billed to the
 * two things that actually compete for attention: peak and spread.
 *
 * THRESHOLD 0.82 → 0.78 exists only to stop that from switching the pass off. The
 * plate's print shoulder now ceilings at 0.80 sRGB rather than 0.90, and this file
 * has already made the mistake once of gating above everything the plate can
 * produce — a night interior whose practicals do not scatter at all has no air in
 * it. Four points down keeps the shade's interior, the hottest city discs and the
 * relay's brightest glyphs on the far side of the gate and still leaves the lit
 * desktop, the midtones and her skin well outside it, which is what a specular
 * gate is for.
 */
const BLOOM_THRESHOLD = 0.78;
const BLOOM_RADIUS = 0.17;

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
  private fieldBlur = 0;
  private shadowBridge = 0;
  private midLift = 0;

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

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.65,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD,
    );
    this.composer.addPass(this.bloom);

    this.bokeh = new BokehPass(scene, camera, { focus: 6.5, aperture: APERTURE, maxblur: 0.009 });
    this.composer.addPass(this.bokeh);

    this.gradeU = {
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2(width, height).multiplyScalar(renderer.getPixelRatio()) },
      uTime: { value: 0 },
      uLift: { value: v3(undefined, 0) },
      uGamma: { value: v3(undefined, 1) },
      uGain: { value: v3(undefined, 1) },
      uContrast: { value: 1.06 },
      uSaturation: { value: 1.03 },
      uSplitTone: { value: 0.35 },
      uVignette: { value: 0.32 },
      uGrain: { value: 0.5 },
      // Grain cell edge in RENDER-TARGET pixels. At 1.5px the clump was small
      // enough to alias against the display grid and read as a fixed screen
      // door; 2.2px is the classic 35mm-scan size — coarse enough to be seen as
      // emulsion, fine enough not to read as a texture overlay. Scaled by the
      // pixel ratio so a HiDPI frame keeps the same *apparent* grain rather
      // than a twice-as-fine one.
      uGrainSize: { value: GRAIN_PX * renderer.getPixelRatio() },
      uAberration: { value: 0.0016 },
      uFlash: { value: 0 },
      uGlitch: { value: 0 },
      // Focal plane + peak defocus. Both are per-plate (Stage → PLATE_FOCUS);
      // the defaults here are a wide-open focus that blurs nothing, so a story
      // that declares no focal composition renders exactly as it did.
      uFocus: { value: new THREE.Vector4(0.5, 0.5, 1, 1) },
      uFieldBlur: { value: 0 },
      uShadowBridge: { value: 0 },
      uMidLift: { value: 0 },
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

  /**
   * Declare the frame's focal composition: where the lens is focused in frame
   * coordinates (centre + half-extents, 0..1) and how far out of focus the far
   * edge is allowed to go, in UV. `blur` 0 retires the pass entirely.
   *
   * This is the DoF that actually prints — BokehPass's is stopped down to a
   * whisper because its depth buffer cannot be trusted with alpha (see
   * APERTURE). Here the "depth" is the composition itself, which for a painted
   * plate is the only honest description of it anyway.
   */
  setFieldFocus(cx: number, cy: number, rx: number, ry: number, blur: number): void {
    this.gradeU.uFocus.value.set(cx, cy, Math.max(rx, 1e-3), Math.max(ry, 1e-3));
    this.fieldBlur = Math.max(0, blur);
    this.gradeU.uFieldBlur.value = this.cinematic ? this.fieldBlur : 0;
  }

  /** How hard ungraded dark regions are pulled toward the room's teal (0..1). */
  setShadowBridge(x: number): void {
    this.shadowBridge = THREE.MathUtils.clamp(x, 0, 1);
    this.gradeU.uShadowBridge.value = this.cinematic ? this.shadowBridge : 0;
  }

  /**
   * The plate's print exposure: a midtone-weighted gain, zero at the black floor
   * and zero again before the practicals. 0.42 ≈ +0.5 stop through the middle of
   * the range. See GRADE_FRAGMENT — this is the instrument that stops a night
   * interior reading as a lamp on a black rectangle, and it is per-plate because
   * a daylit room's failure mode is the opposite one.
   */
  setMidLift(x: number): void {
    this.midLift = THREE.MathUtils.clamp(x, 0, 1);
    this.gradeU.uMidLift.value = this.cinematic ? this.midLift : 0;
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
    this.gradeU.uFieldBlur.value = settings.cinematic ? this.fieldBlur : 0;
    this.gradeU.uShadowBridge.value = settings.cinematic ? this.shadowBridge : 0;
    this.gradeU.uMidLift.value = settings.cinematic ? this.midLift : 0;
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
    this.gradeU.uGrainSize.value = GRAIN_PX * pr;
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
