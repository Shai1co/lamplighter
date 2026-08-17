/**
 * Lamplighter — a character sprite.
 *
 * An alpha plane between the mid and near background layers. Supports:
 *   • enter from a side with an eased overshoot + fade,
 *   • exit to a side,
 *   • pose swaps via a short ghost-crossfade,
 *   • continuous idle breathing (tiny scale/Y sine, deterministic per-index phase),
 *   • speaking highlight — the speaker brightens while others dim + desaturate.
 *
 * Color management stays correct by patching a MeshBasicMaterial with
 * onBeforeCompile (three keeps the sRGB texture decode + tone-map path); the
 * injected uniforms add brighten / desaturate / tint.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import type { CharSide } from '../core/types';
import { SPRITE_UNIFORMS_DECL, SPRITE_DIFFUSE_PATCH, hash01 } from './shaders';

interface SpriteUniforms {
  uBright: { value: number };
  uDesat: { value: number };
  uTintAmt: { value: number };
  uTint: { value: THREE.Color };
  uPlateDesat: { value: number };
  uPlateSplit: { value: number };
  uPlateCool: { value: number };
  uEnvTint: { value: number };
  uCanvas: { value: number };
  uPaint: { value: number };
  uBrush: { value: number };
}

/**
 * How far the plate is pre-graded toward the room before the composite grade
 * sees it. See SPRITE_DIFFUSE_PATCH for why this happens in the sprite's own
 * material rather than downstream.
 *
 * PLATE_DESAT — 15%. Skin is the most saturated surface in a night interior and
 * a photographic plate carries it at full strength into a painterly, low-chroma
 * room; 15% is the point where she stops being the only saturated object in
 * frame and still has blood in her.
 * PLATE_SPLIT — 0.22, against the grade's own effective 0.36 × 0.55 ≈ 0.20, so
 * the plate arrives already carrying roughly the split-tone the room has and
 * the two are graded from the same place rather than converging from different
 * ones.
 * PLATE_COOL — 0.30. The room's teal, pulled into the specular end of skin (see
 * SPRITE_DIFFUSE_PATCH). A third is the point where a highlight stops being the
 * only warm-only surface in the frame and still reads as flesh; past ~0.45 the
 * sheen goes grey and the face looks lit through a window that isn't there.
 */
const PLATE_DESAT = 0.15;
const PLATE_SPLIT = 0.22;
const PLATE_COOL = 0.3;

/**
 * PLATE_ENV — 12%. The room's ambient teal laid over ALL of her, not only her
 * speculars (see the uEnvTint note in SPRITE_DIFFUSE_PATCH). Value-preserving
 * by construction, so this is a chroma move and never an exposure one; the
 * critic's brief asked for 10–15% and 12 is the middle of it.
 *
 * PLATE_CANVAS — 0.045, which after the ×2 in the patch is a ±9% modulation:
 * the painterly tooth that puts the plate and the painted room on the same
 * surface. Read against the emulsion downstream (~2% at the default mix) this
 * is deliberately the LOUDER of the two — grain is a property of the camera and
 * belongs to the whole frame at one strength, tooth is a property of a painted
 * SURFACE and only the plate is missing it.
 */
const PLATE_ENV = 0.12;
/* 0.045 → 0.055. The tooth is the ground UNDER the brush (see PLATE_PAINT), and
   the two have to be dosed together: the smear takes high-frequency detail out
   of the plate, so without a matching lift the portrait would end up SMOOTHER
   than the painted room rather than differently-structured from it. At 0.055 —
   ±11% after the ×2 in the patch — the plate's surface noise measures in the
   same band as the desk still-life's, which is the "matched noise structure"
   half of the note. Deliberately short of the ±12.4% a first pass tried: past
   about ±11 the mottle stops reading as canvas under a stroke and starts
   reading as sensor noise on a dirty plate, which trades one artefact for
   another. */
const PLATE_CANVAS = 0.055;

/**
 * The painterly resample. See the head of SPRITE_DIFFUSE_PATCH for what it does
 * and why colour work alone could not.
 *
 * PLATE_PAINT — 0.62. How far the plate is carried from its photographic sample
 * toward the four-tap brush average. Below ~0.4 the micro-detail survives and
 * the plate still reads as a photograph with a filter on it; past ~0.8 the form
 * itself starts to go and skin turns to wax, which trades one AI-artefact read
 * for a worse one. At 0.62 pores, stray hairs and sensor noise are gone,
 * cheekbone-to-jaw modelling is intact, and the surface is described in marks.
 *
 * PLATE_BRUSH — 0.0026, in the plate's OWN uv rather than in pixels, and that is
 * deliberate: a brush stroke is a fraction of the FIGURE, not a count of
 * screen samples, so the mark scales with her instead of changing character
 * every time the plate is re-exported at a different resolution. On the flagship
 * portrait (1024 wide) it is a ~2.7px reach, which at the ×4 tap spread reads as
 * a stroke about five pixels across — a sable at portrait scale.
 */
const PLATE_PAINT = 0.62;
const PLATE_BRUSH = 0.0026;

function makeSpriteMaterial(map: THREE.Texture, tint: THREE.Color): {
  material: THREE.MeshBasicMaterial;
  uniforms: SpriteUniforms;
} {
  const material = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    toneMapped: true,
    alphaTest: 0.01,
  });
  const uniforms: SpriteUniforms = {
    uBright: { value: 1 },
    uDesat: { value: 0 },
    uTintAmt: { value: 0 },
    uTint: { value: tint.clone() },
    uPlateDesat: { value: PLATE_DESAT },
    uPlateSplit: { value: PLATE_SPLIT },
    uPlateCool: { value: PLATE_COOL },
    uEnvTint: { value: PLATE_ENV },
    uCanvas: { value: PLATE_CANVAS },
    uPaint: { value: PLATE_PAINT },
    uBrush: { value: PLATE_BRUSH },
  };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBright = uniforms.uBright;
    shader.uniforms.uDesat = uniforms.uDesat;
    shader.uniforms.uTintAmt = uniforms.uTintAmt;
    shader.uniforms.uTint = uniforms.uTint;
    shader.uniforms.uPlateDesat = uniforms.uPlateDesat;
    shader.uniforms.uPlateSplit = uniforms.uPlateSplit;
    shader.uniforms.uPlateCool = uniforms.uPlateCool;
    shader.uniforms.uEnvTint = uniforms.uEnvTint;
    shader.uniforms.uCanvas = uniforms.uCanvas;
    shader.uniforms.uPaint = uniforms.uPaint;
    shader.uniforms.uBrush = uniforms.uBrush;
    shader.fragmentShader = SPRITE_UNIFORMS_DECL + shader.fragmentShader.replace(
      '#include <map_fragment>',
      SPRITE_DIFFUSE_PATCH,
    );
  };
  return { material, uniforms };
}

export interface CharacterInit {
  key: string;
  index: number;
  tint: THREE.Color;
  /** Base sprite height in world units (already scaled by char.scale). */
  height: number;
  /** X coordinates for left / center / right at the sprite's Z. */
  anchors: Record<CharSide, number>;
  worldZ: number;
}

export class Character {
  readonly key: string;
  readonly group: THREE.Group;

  private readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.PlaneGeometry;
  private material: THREE.MeshBasicMaterial;
  private uniforms: SpriteUniforms;
  private readonly tint: THREE.Color;
  private readonly index: number;
  private readonly phase: number;

  private anchors: Record<CharSide, number>;
  private baseHeight: number;
  private texAspect = 0.62;
  private currentTexture: THREE.Texture;

  private targetBright = 1;
  private targetDesat = 0;
  private breathAmp = 1;

  private ghost: THREE.Mesh | null = null;
  private readonly tweens = new Set<gsap.core.Tween>();
  private disposed = false;

  constructor(init: CharacterInit, texture: THREE.Texture) {
    this.key = init.key;
    this.index = init.index;
    this.tint = init.tint.clone();
    this.anchors = init.anchors;
    this.baseHeight = init.height;
    this.phase = hash01(init.index) * Math.PI * 2;
    this.currentTexture = texture;
    this.texAspect = this.aspectOf(texture);

    this.group = new THREE.Group();
    this.group.position.z = init.worldZ;

    this.geometry = new THREE.PlaneGeometry(1, 1);
    const built = makeSpriteMaterial(texture, this.tint);
    this.material = built.material;
    this.uniforms = built.uniforms;
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20 + init.index;
    this.applySize();
    this.group.add(this.mesh);
    this.group.visible = false;
  }

  private aspectOf(tex: THREE.Texture): number {
    const img = tex.image as { width?: number; height?: number } | undefined;
    if (img && img.width && img.height) return img.width / img.height;
    return 0.62;
  }

  private applySize(): void {
    const h = this.baseHeight;
    const w = h * this.texAspect;
    this.mesh.scale.set(w, h, 1);
  }

  /**
   * World-space centre and half-extents of the plate's SOLID CORE — the region
   * the weather rig fences itself against (see LIGHTFIELD_GLSL → pqFigure).
   *
   * Not the quad: a portrait plate is mostly feather, and a mask cut to the
   * quad would carve a rain-free rectangle two hundred pixels wider than she
   * is. These fractions are read straight off the presence mask — its centre
   * sits at (0.45, 0.43) of the image with a superellipse core reaching ~0.30
   * of the width and ~0.40 of the height before the ramp begins.
   */
  static readonly CORE = { cx: 0.45, cy: 0.43, hx: 0.3, hy: 0.4 } as const;

  coreBounds(): { x: number; y: number; hx: number; hy: number } {
    const w = this.mesh.scale.x;
    const h = this.mesh.scale.y;
    return {
      x: this.group.position.x + this.mesh.position.x + (Character.CORE.cx - 0.5) * w,
      // Image space runs y-down, world runs y-up, hence the flip.
      y: this.group.position.y + this.mesh.position.y + (0.5 - Character.CORE.cy) * h,
      hx: w * Character.CORE.hx,
      hy: h * Character.CORE.hy,
    };
  }

  /** How present the plate currently is — drives the mask's own strength so a
   *  figure mid-entrance never punches a hole in the weather ahead of itself. */
  get presence(): number {
    return this.group.visible ? this.material.opacity : 0;
  }

  /** Re-layout on resize: new height + anchor positions. */
  relayout(height: number, anchors: Record<CharSide, number>): void {
    this.baseHeight = height;
    this.anchors = anchors;
    this.applySize();
    // Snap X toward the nearest current anchor is not needed; keep target side.
  }

  private track(t: gsap.core.Tween): gsap.core.Tween {
    this.tweens.add(t);
    t.eventCallback('onComplete', () => this.tweens.delete(t));
    return t;
  }

  /** Slide in from a side with a soft overshoot + fade. */
  enter(from: CharSide, reduced: boolean): void {
    const target = this.anchors[from] ?? this.anchors.center;
    const offMag = Math.max(Math.abs(this.anchors.left), Math.abs(this.anchors.right)) + 2.5;
    const startX = from === 'right' ? offMag : from === 'left' ? -offMag : target;
    this.group.visible = true;
    this.group.position.x = startX;
    this.group.position.y = from === 'center' ? -0.35 : 0;
    this.uniforms.uBright.value = 0.2;
    this.material.opacity = 0;

    if (reduced) {
      this.group.position.set(target, 0, this.group.position.z);
      this.material.opacity = 1;
      this.uniforms.uBright.value = this.targetBright;
      return;
    }
    this.track(gsap.to(this.group.position, {
      x: target, y: 0, duration: 0.95, ease: 'back.out(1.4)',
    }));
    this.track(gsap.to(this.material, { opacity: 1, duration: 0.6, ease: 'power2.out' }));
    this.track(gsap.to(this.uniforms.uBright, {
      value: this.targetBright, duration: 0.8, ease: 'power2.out',
    }));
  }

  /** Move to a new side. */
  moveTo(side: CharSide, reduced: boolean): void {
    const target = this.anchors[side] ?? this.anchors.center;
    if (reduced) {
      this.group.position.x = target;
      return;
    }
    this.track(gsap.to(this.group.position, {
      x: target, duration: 0.8, ease: 'power3.inOut',
    }));
  }

  /** Slide out to a side + fade, resolving when fully gone. */
  exit(to: CharSide, reduced: boolean): Promise<void> {
    const offMag = Math.max(Math.abs(this.anchors.left), Math.abs(this.anchors.right)) + 3;
    const targetX = to === 'left' ? -offMag : offMag;
    if (reduced) {
      return new Promise((resolve) => {
        this.material.opacity = 0;
        this.group.visible = false;
        resolve();
      });
    }
    return new Promise((resolve) => {
      this.track(gsap.to(this.group.position, { x: targetX, duration: 0.7, ease: 'power2.in' }));
      this.track(gsap.to(this.material, {
        opacity: 0, duration: 0.6, ease: 'power2.in',
        onComplete: () => { this.group.visible = false; resolve(); },
      }));
    });
  }

  /** Swap expression with a brief ghost-crossfade of the outgoing pose. */
  setPose(texture: THREE.Texture, reduced: boolean): void {
    if (texture === this.currentTexture) return;
    const prevTex = this.currentTexture;
    this.currentTexture = texture;
    this.texAspect = this.aspectOf(texture);

    if (reduced) {
      this.material.map = texture;
      this.material.needsUpdate = true;
      this.applySize();
      return;
    }

    // Ghost of the old pose fades out over the new one. Built through the same
    // factory as the live sprite — an un-patched MeshBasicMaterial here would
    // cross-fade an *ungraded* plate over a graded one for 280ms, i.e. flash the
    // exact composite seam the plate grade exists to remove.
    this.clearGhost();
    const built = makeSpriteMaterial(prevTex, this.tint);
    const ghostMat = built.material;
    built.uniforms.uBright.value = this.uniforms.uBright.value;
    built.uniforms.uDesat.value = this.uniforms.uDesat.value;
    const ghost = new THREE.Mesh(this.geometry, ghostMat);
    ghost.scale.copy(this.mesh.scale);
    ghost.renderOrder = this.mesh.renderOrder + 1;
    ghost.frustumCulled = false;
    this.group.add(ghost);
    this.ghost = ghost;

    this.material.map = texture;
    this.material.needsUpdate = true;
    this.applySize();
    ghost.scale.copy(this.mesh.scale);

    this.track(gsap.to(ghostMat, {
      opacity: 0, duration: 0.28, ease: 'power2.out',
      onComplete: () => {
        this.group.remove(ghost);
        ghostMat.dispose();
        if (this.ghost === ghost) this.ghost = null;
      },
    }));
    // A tiny pose-change pop.
    this.track(gsap.fromTo(this.mesh.scale, { y: this.mesh.scale.y * 0.985 }, {
      y: this.mesh.scale.y, duration: 0.3, ease: 'back.out(2)',
    }));
  }

  private clearGhost(): void {
    if (this.ghost) {
      const mat = this.ghost.material as THREE.Material;
      this.group.remove(this.ghost);
      mat.dispose();
      this.ghost = null;
    }
  }

  /**
   * Speaking state. `null` speaker ⇒ nobody speaking (all settle to a neutral
   * mid level). Non-speakers dim + desaturate; the speaker brightens.
   */
  setSpeaking(state: 'speaker' | 'listener' | 'neutral'): void {
    if (state === 'speaker') {
      this.targetBright = 1.12;
      this.targetDesat = 0;
      this.breathAmp = 1.25;
    } else if (state === 'listener') {
      this.targetBright = 0.62;
      this.targetDesat = 0.45;
      this.breathAmp = 0.7;
    } else {
      this.targetBright = 0.85;
      this.targetDesat = 0.18;
      this.breathAmp = 1;
    }
  }

  update(t: number, dt: number): void {
    if (this.disposed) return;
    // Ease brightness / desaturation toward targets.
    const k = 1 - Math.exp(-dt * 6);
    this.uniforms.uBright.value += (this.targetBright - this.uniforms.uBright.value) * k;
    this.uniforms.uDesat.value += (this.targetDesat - this.uniforms.uDesat.value) * k;

    // Idle breathing — subtle scale + vertical bob, per-character phase.
    const breath = Math.sin(t * 1.05 + this.phase) * 0.008 * this.breathAmp;
    const sway = Math.sin(t * 0.5 + this.phase * 1.3) * 0.006 * this.breathAmp;
    this.mesh.scale.setY(this.baseHeight * (1 + breath));
    this.mesh.scale.setX(this.baseHeight * this.texAspect * (1 - breath * 0.4));
    this.mesh.position.y = sway;
    if (this.ghost) {
      this.ghost.scale.copy(this.mesh.scale);
      this.ghost.position.y = this.mesh.position.y;
    }
  }

  dispose(): void {
    this.disposed = true;
    for (const tw of this.tweens) tw.kill();
    this.tweens.clear();
    gsap.killTweensOf(this.group.position);
    gsap.killTweensOf(this.material);
    gsap.killTweensOf(this.uniforms.uBright);
    this.clearGhost();
    this.geometry.dispose();
    this.material.dispose();
    this.group.clear();
  }
}
