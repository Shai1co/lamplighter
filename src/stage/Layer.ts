/**
 * Picture Quest — a single parallax background plane.
 *
 * Layers sit at distinct Z (far → near). Perspective already parallaxes them as
 * the camera drifts; each layer adds a subtle extra offset (scaled by depth and
 * the story's `parallax` strength) plus a gentle idle sway, so the scene feels
 * alive even when nothing is happening. Textures are owned/cached by the Stage;
 * a Layer never disposes a texture it was handed.
 */
import * as THREE from 'three';

export interface LayerConfig {
  /** World Z (more negative = farther from camera). */
  z: number;
  /** Plane width/height in world units (already overscanned). */
  width: number;
  height: number;
  /** 0 = farthest layer, 1 = nearest layer. Drives parallax weighting. */
  depth: number;
  /** Story parallax strength (manifest.backgrounds[].parallax, 0..~0.2). */
  parallax: number;
  /** Deterministic phase so sibling layers drift out of sync. */
  phase: number;
}

export class Layer {
  readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly base = new THREE.Vector3();
  private depth = 0;
  private parallax = 0;
  private phase = 0;

  constructor() {
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.MeshBasicMaterial({
      transparent: false,
      depthTest: true,
      depthWrite: true,
      toneMapped: true,
      color: 0xffffff,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 0;
  }

  setTexture(texture: THREE.Texture | null): void {
    this.material.map = texture;
    this.material.needsUpdate = true;
    this.mesh.visible = texture !== null;
  }

  configure(cfg: LayerConfig): void {
    this.base.set(0, 0, cfg.z);
    this.depth = cfg.depth;
    this.parallax = cfg.parallax;
    this.phase = cfg.phase;
    this.mesh.scale.set(cfg.width, cfg.height, 1);
    this.mesh.position.copy(this.base);
    this.mesh.renderOrder = Math.round(cfg.depth * 8);
  }

  /** `camX`/`camY` are the camera's current pan offsets. */
  update(t: number, camX: number, camY: number, reduced: boolean): void {
    // Nearer layers (higher depth) counter-move more for felt parallax.
    const weight = this.parallax * (0.25 + this.depth * 0.9);
    const driftX = reduced ? 0 : Math.sin(t * 0.05 + this.phase) * 0.03 * (0.4 + this.depth * 0.6);
    const driftY = reduced ? 0 : Math.cos(t * 0.04 + this.phase * 1.7) * 0.02 * (0.4 + this.depth * 0.6);
    this.mesh.position.set(
      this.base.x - camX * weight + driftX,
      this.base.y - camY * weight * 0.6 + driftY,
      this.base.z,
    );
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
