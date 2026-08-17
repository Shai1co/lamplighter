/**
 * Picture Quest — the cinematic Three.js stage.
 *
 * Owns the WebGL renderer, scene graph (parallax background layers → characters
 * → near-plane weather), the Ken Burns camera, shader transitions, and the
 * post-processing stack. It is a pure subscriber on the shared bus: the Runtime
 * emits scene/char/weather/camera/fx directives; the Stage renders them. It
 * never emits, never touches narrative state, and degrades gracefully to
 * procedural placeholders when art has not been generated yet.
 */
import * as THREE from 'three';
import type {
  IStage,
  IEmitter,
  StoryBundle,
  StoryTheme,
  Settings,
  CharSide,
  CharacterDef,
  ResolvedBackground,
} from '../core/types';
import { DEFAULT_SETTINGS } from '../core/types';
import { KenBurns } from './camera';
import { Layer } from './Layer';
import { Character } from './Character';
import { Weather } from './weather';
import { Transitions } from './transitions';
import { PostFX } from './postfx';

const FOV = 35;
const CAM_Z = 6;
const FAR_Z = -7;
const NEAR_Z = -1.8;
const CHAR_Z = -0.7;
const WEATHER_Z = 0.8;
const OVERSCAN = 1.3;

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '').trim();
  const n =
    h.length === 3
      ? h.split('').map((c) => c + c).join('')
      : h.padEnd(6, '0').slice(0, 6);
  const int = parseInt(n, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

const css = (c: RGB, a = 1): string => `rgba(${c.r},${c.g},${c.b},${a})`;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Tuning for the character "presence" treatment (see `toPresenceTexture`).
 * All coordinates are normalized image space, origin top-left.
 *
 * The mask is the product of three falloffs, each of which independently reaches
 * 0 before its own frame edge — so no straight edge of the source art can ever
 * survive, whatever the portrait's proportions:
 *   1. a superellipse that owns left/right (and rounds the corners),
 *   2. a short ramp that dissolves the crown of the head into the scene,
 *   3. a long ramp that trails the torso away below the chest.
 */
const PRESENCE = {
  /** Mask centre — sits on the face / upper chest of a 3:4 portrait crop. */
  cx: 0.45,
  cy: 0.43,
  /** Superellipse half-extents; alpha reaches 0 at exactly ±r from the centre. */
  rLeft: 0.43,
  rRight: 0.47,
  /** Vertical extents are deliberately generous — the two ramps below own
   *  top and bottom, so the superellipse only rounds the shape there. */
  rTop: 0.58,
  rBottom: 0.95,
  /** Superellipse exponent; slightly over 2 keeps the core a touch squarer. */
  power: 2.1,
  /** Mask radius inside which alpha is a flat 1 (face + near shoulder). */
  core: 0.48,
  /** Gamma on the core→edge ramp; >1 sheds the painted backdrop sooner while
   *  still landing softly, which keeps the feather from reading as an aura. */
  rampGamma: 1.8,
  /** Crown dissolve: alpha 0 at the very top, full by `headStart`. */
  headStart: 0.15,
  headEnd: 0.0,
  /** Torso dissolve: full until `tailStart`, gone by `tailEnd`. */
  tailStart: 0.55,
  tailEnd: 0.95,
  /** Edge darkening, applied as rgb *= 1 - v·(1-a)^g, so the feather sinks into
   *  the scene's depth instead of hazing over it. Kept light on purpose: too
   *  much and the falloff becomes a dark smear over bright backgrounds. */
  vignette: 0.3,
  vignetteGamma: 1.2,
} as const;

/**
 * Framing. A plate is painted, not shot, so its motivated practical lands
 * wherever the painting put it — for the ops room, hard against the left edge
 * and low enough that the dialogue bar sat on top of it. The frame then has no
 * power point at all and the eye settles on the emptiest thing in it, which
 * here was bare carpet.
 *
 * So the stage frames the plate rather than accepting it: the scene's own warm,
 * bright mass (the same reduction the rain and glass are lit from) is measured
 * in screen space, and if it is outside the rule-of-thirds band the plate is
 * slid until it isn't. Deliberately a ONE-WAY pull — a practical already inside
 * the band is left exactly where the painter put it, so a well-composed plate
 * is never "corrected" — and clamped well inside the overscan margin, so no
 * amount of camera drift can walk an edge into shot.
 */
const FRAME_BAND = { left: 0.34, right: 0.66, top: 0.34, bottom: 0.6 } as const;
/** Maximum slide, as a fraction of the frame. Overscan affords 0.15 either way. */
const FRAME_LIMIT = { x: 0.12, y: 0.1 } as const;

export class Stage implements IStage {
  private readonly bus: IEmitter;
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: KenBurns;
  private readonly clock = new THREE.Clock(false);

  private readonly layerGroup = new THREE.Group();
  private readonly characterGroup = new THREE.Group();
  private readonly layers: Layer[] = [];
  private readonly characters = new Map<string, Character>();
  private readonly charIndex = new Map<string, number>();
  private charSeq = 0;

  private readonly weather: Weather;
  private readonly transitions: Transitions;
  private readonly postfx: PostFX;

  private bundle: StoryBundle | null = null;
  private settings: Settings = { ...DEFAULT_SETTINGS };

  private readonly textureCache = new Map<string, THREE.Texture>();
  private readonly failed = new Set<string>();
  private readonly procedural: THREE.Texture[] = [];
  private gradientTex: THREE.Texture | null = null;
  private readonly silhouettes = new Map<string, THREE.Texture>();
  private lightTex: THREE.DataTexture | null = null;

  private width = 1280;
  private height = 720;
  private running = false;
  private rafId = 0;
  private hasBackground = false;
  private focusZ = CHAR_Z;
  private currentParallax = 0.05;
  private depthHidden: [boolean, boolean] = [true, true];
  /** Framing bias for the current plate, in frame fractions (+x right, +y up). */
  private framingX = 0;
  private framingY = 0;

  private readonly unsub: Array<() => void> = [];

  constructor(bus: IEmitter, canvas: HTMLCanvasElement) {
    this.bus = bus;
    this.canvas = canvas;

    this.measure();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x05080b, 1);

    this.scene = new THREE.Scene();
    this.scene.add(this.layerGroup, this.characterGroup);

    this.camera = new KenBurns(this.width / this.height);

    this.weather = new Weather(WEATHER_Z);
    this.weather.setResolution(
      this.width * this.renderer.getPixelRatio(),
      this.height * this.renderer.getPixelRatio(),
    );
    this.scene.add(this.weather.group);

    // BokehPass builds its depth buffer by rendering the scene a SECOND time
    // with an override MeshDepthMaterial — which is alpha-blind. Two kinds of
    // object poison that buffer and both must sit the depth pass out:
    //
    //   • the weather rig — full-frame planes parked in front of the camera.
    //     Rendered opaque they stamped THEIR distance over every pixel, so the
    //     depth buffer claimed the whole world was one flat plane 5.2 units out
    //     and the DoF degenerated into a uniform soft-focus wash over the frame,
    //     background and faces alike. That wash is most of why the plate read
    //     mushy rather than photographed.
    //   • character sprites — an override material ignores their alphaTest, so
    //     each one wrote its full quad, not its silhouette, and left a hard
    //     RECTANGLE of differently-focused background around the speaker. A
    //     visible focus seam is a hard-fail; a real fix needs alpha-aware
    //     per-object depth, which BokehPass does not support.
    //
    // With both excluded the buffer carries the painted plate's own distance,
    // focus lands exactly on it, and the frame resolves crisp — the shallow-DoF
    // separation then comes from the art, which is where it is actually painted.
    this.scene.onBeforeRender = (): void => {
      if (!this.scene.overrideMaterial) return;
      this.depthHidden = [this.weather.group.visible, this.characterGroup.visible];
      this.weather.group.visible = false;
      this.characterGroup.visible = false;
    };
    this.scene.onAfterRender = (): void => {
      if (!this.scene.overrideMaterial) return;
      this.weather.group.visible = this.depthHidden[0];
      this.characterGroup.visible = this.depthHidden[1];
    };

    this.transitions = new Transitions(
      this.renderer,
      this.width * this.renderer.getPixelRatio(),
      this.height * this.renderer.getPixelRatio(),
      new THREE.Color(0x7db4c8),
    );

    this.postfx = new PostFX(
      this.renderer,
      this.scene,
      this.camera.camera,
      this.transitions.pass,
      this.width,
      this.height,
    );

    this.subscribe();
  }

  /* ───────────────────────────  bus wiring  ─────────────────────────── */

  private subscribe(): void {
    this.unsub.push(
      this.bus.on('scene:bg', (p) => this.onBg(p.id, p.transition)),
      this.bus.on('char:enter', (p) => this.onCharEnter(p.char, p.from, p.pose)),
      this.bus.on('char:exit', (p) => this.onCharExit(p.char, p.to)),
      this.bus.on('char:pose', (p) => this.onCharPose(p.char, p.pose)),
      this.bus.on('char:move', (p) => this.onCharMove(p.char, p.to)),
      this.bus.on('char:speaking', (p) => this.onSpeaking(p.char)),
      this.bus.on('weather:set', (p) => this.weather.setWeather(p.weather, p.intensity)),
      this.bus.on('camera:move', (p) => this.camera.move(p.move, p.zoom, p.duration)),
      this.bus.on('fx:play', (p) => this.onFx(p.effect, p.params)),
    );
  }

  /* ───────────────────────────  load / warm  ─────────────────────────── */

  async loadStory(bundle: StoryBundle): Promise<void> {
    this.bundle = bundle;
    this.resetSceneState();

    const theme = bundle.manifest.theme;
    const paper = hexToRgb(theme.paper || '#0d1418');
    this.renderer.setClearColor(
      new THREE.Color(paper.r / 255, paper.g / 255, paper.b / 255).multiplyScalar(0.4).getHex(),
      1,
    );
    this.postfx.setGrade(theme);
    this.postfx.setGrain(this.settings.grain);
    this.transitions.setKeyColor(new THREE.Color(theme.key || '#7db4c8'));

    // Collect every asset URL and warm the texture cache in parallel. Character
    // portraits are additionally re-baked once, here, through the presence mask.
    const urls = new Set<string>();
    const portraits = new Set<string>();
    for (const bg of Object.values(bundle.assets.backgrounds)) {
      for (const url of bg.layers) if (url) urls.add(url);
    }
    for (const poses of Object.values(bundle.assets.characters)) {
      for (const url of Object.values(poses)) {
        if (!url) continue;
        urls.add(url);
        portraits.add(url);
      }
    }

    const loader = new THREE.TextureLoader();
    await Promise.allSettled(
      [...urls].map(
        (url) =>
          new Promise<void>((resolve) => {
            // Already warmed (a restart of the same story) — never re-bake.
            if (this.textureCache.has(url)) {
              resolve();
              return;
            }
            loader.load(
              url,
              (loaded) => {
                const tex = portraits.has(url) ? this.toPresenceTexture(loaded) : loaded;
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
                tex.generateMipmaps = true;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.needsUpdate = true;
                this.textureCache.set(url, tex);
                resolve();
              },
              undefined,
              () => {
                this.failed.add(url);
                resolve();
              },
            );
          }),
      ),
    );

    // Prime the procedural gradient so the very first frame is never blank.
    this.gradientTex = this.makeGradient(theme);
  }

  private resetSceneState(): void {
    for (const ch of this.characters.values()) {
      this.characterGroup.remove(ch.group);
      ch.dispose();
    }
    this.characters.clear();
    this.charIndex.clear();
    this.charSeq = 0;
    this.hasBackground = false;
  }

  /* ───────────────────────────  background  ─────────────────────────── */

  private resolveBg(id: string): ResolvedBackground | null {
    return this.bundle?.assets.backgrounds[id] ?? null;
  }

  private onBg(id: string, transition?: string): void {
    const rb = this.resolveBg(id);
    const textures: THREE.Texture[] = [];
    if (rb) {
      for (const url of rb.layers) {
        const tex = this.textureCache.get(url);
        if (tex) textures.push(tex);
      }
    }
    const parallax = rb?.parallax ?? 0.05;

    // Freeze the current look before swapping (fades from clear color first time).
    this.transitions.snapshot(this.scene, this.camera.camera);

    const plate = textures.length === 0 ? this.gradientOrMake() : textures[0];
    // Framing first: both the layer placement and the light field are expressed
    // in the FRAMED screen, so the bias has to be known before either is built.
    this.computeFraming(plate);
    this.applyLayers(textures.length === 0 ? [plate] : textures, parallax);
    this.updateLightField(plate);

    this.refreshFocus();
    void this.transitions.play(transition ?? (this.hasBackground ? 'dissolve' : 'crossfade'));
    this.hasBackground = true;
  }

  private gradientOrMake(): THREE.Texture {
    if (!this.gradientTex && this.bundle) this.gradientTex = this.makeGradient(this.bundle.manifest.theme);
    return this.gradientTex!;
  }

  private ensureLayers(n: number): void {
    while (this.layers.length < n) {
      const layer = new Layer();
      this.layers.push(layer);
      this.layerGroup.add(layer.mesh);
    }
  }

  private applyLayers(textures: THREE.Texture[], parallax: number): void {
    const n = textures.length;
    this.currentParallax = parallax;
    this.ensureLayers(n);
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (i < n) {
        const depthNorm = n > 1 ? i / (n - 1) : 0.5;
        const z = THREE.MathUtils.lerp(FAR_Z, NEAR_Z, depthNorm);
        const f = this.frustum(z);
        layer.setTexture(textures[i]);
        layer.configure({
          z,
          width: f.w * OVERSCAN,
          height: f.h * OVERSCAN,
          depth: depthNorm,
          parallax,
          phase: i * 1.73 + 0.4,
          offsetX: this.framingX * f.w,
          offsetY: this.framingY * f.h,
        });
      } else {
        layer.setTexture(null);
      }
    }
  }

  /** Resolution of the per-scene light reduction handed to the weather systems. */
  private static readonly LIGHT_W = 64;
  private static readonly LIGHT_H = 36;

  /**
   * Reduce the plate to a 64×36 colour map of the FRAMED SCREEN.
   *
   * The plate is drawn at `OVERSCAN` and slid by the framing bias, so a naive
   * reduction of the raw image is registered to nothing that is actually on
   * screen — up to 15% out at the edges before the bias is even counted, which
   * is enough to light a rain streak from a practical two desks away. Sampling
   * the same crop the camera sees keeps every consumer honest.
   *
   * Returns null (rather than throwing) for a tainted or undecodable source.
   */
  private samplePlate(
    texture: THREE.Texture | null,
    biasX: number,
    biasY: number,
  ): ImageData | null {
    const W = Stage.LIGHT_W;
    const H = Stage.LIGHT_H;
    const src = texture?.image as CanvasImageSource | undefined;
    if (!src) return null;
    try {
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      const dw = W * OVERSCAN;
      const dh = H * OVERSCAN;
      // Canvas y runs down; the bias is y-up, hence the sign flip.
      ctx.drawImage(src, (W - dw) * 0.5 + biasX * W, (H - dh) * 0.5 - biasY * H, dw, dh);
      return ctx.getImageData(0, 0, W, H);
    } catch {
      return null;
    }
  }

  /**
   * Slide the plate so its warm, bright mass lands on a rule-of-thirds power
   * point. See the FRAME_BAND note: the pull is one-way and clamped, so a plate
   * that already composes well is left untouched.
   */
  private computeFraming(texture: THREE.Texture | null): void {
    this.framingX = 0;
    this.framingY = 0;
    const px = this.samplePlate(texture, 0, 0);
    if (!px) return;

    const W = Stage.LIGHT_W;
    const H = Stage.LIGHT_H;
    let mass = 0;
    let mx = 0;
    let my = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const s = (y * W + x) * 4;
        const r = px.data[s];
        const g = px.data[s + 1];
        const b = px.data[s + 2];
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const warmth = Math.max(0, (r - b) / 255) + 0.22;
        // The same score the reflection uses, floored so the ambient wash of a
        // dark plate cannot drag the centroid back to the middle of the frame.
        const w = Math.max(0, lum * lum * warmth - 0.02);
        mass += w;
        mx += w * ((x + 0.5) / W);
        my += w * ((y + 0.5) / H);
      }
    }
    if (mass <= 1e-4) return;

    const pull = (v: number, lo: number, hi: number, limit: number): number =>
      v < lo ? Math.min(lo - v, limit) : v > hi ? Math.max(hi - v, -limit) : 0;

    this.framingX = pull(mx / mass, FRAME_BAND.left, FRAME_BAND.right, FRAME_LIMIT.x);
    // The centroid is measured downward; lifting the plate is +y.
    this.framingY = -pull(my / mass, FRAME_BAND.top, FRAME_BAND.bottom, FRAME_LIMIT.y);
  }

  /**
   * Publish the framed reduction to the weather so rain and glass are lit by the
   * art instead of by a constant, and find the frame's dominant *warm* practical
   * to mirror across the glass as a reflection target — which is why the glass
   * reflection always lands on a real light source in the painting rather than
   * somewhere an artist would have to hand-place.
   */
  private updateLightField(texture: THREE.Texture | null): void {
    const W = Stage.LIGHT_W;
    const H = Stage.LIGHT_H;
    const pixels = this.samplePlate(texture, this.framingX, this.framingY);
    if (!pixels) {
      // Tainted or undecodable source — fall back to uncoupled weather.
      this.weather.setLightField(null, null);
      return;
    }

    const data = new Uint8Array(W * H * 4);
    let best = -1;
    let bx = 0.5;
    let by = 0.5;
    const bc = new THREE.Color(1, 1, 1);
    for (let y = 0; y < H; y++) {
      const sy = H - 1 - y; // canvas is y-down, texture UV is y-up
      for (let x = 0; x < W; x++) {
        const s = (sy * W + x) * 4;
        const d = (y * W + x) * 4;
        const r = pixels.data[s];
        const g = pixels.data[s + 1];
        const b = pixels.data[s + 2];
        data[d] = r;
        data[d + 1] = g;
        data[d + 2] = b;
        data[d + 3] = 255;
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const warmth = Math.max(0, (r - b) / 255) + 0.22;
        const score = lum * lum * warmth;
        if (score > best) {
          best = score;
          bx = (x + 0.5) / W;
          by = (y + 0.5) / H;
          bc.setRGB(r / 255, g / 255, b / 255);
        }
      }
    }

    this.lightTex?.dispose();
    const tex = new THREE.DataTexture(data, W, H);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    this.lightTex = tex;

    // Peak-normalize the practical's colour, then walk it a touch toward white
    // so the reflection reads as light on glass rather than a coloured decal.
    const peak = Math.max(bc.r, bc.g, bc.b, 0.001);
    bc.setRGB(bc.r / peak, bc.g / peak, bc.b / peak).lerp(new THREE.Color(1, 1, 1), 0.14);

    this.weather.setLightField(tex, {
      // Mirror the practical across frame centre and pull it back in a little,
      // so it counterweights the source instead of pinning to the far edge.
      x: THREE.MathUtils.clamp(0.5 + (0.5 - bx) * 0.78, 0.1, 0.9),
      // Held ABOVE the sill line. A reflection is a property of a surface, and
      // the only reflective surface in shot is the pane — free to sit anywhere,
      // it landed on the carpet, where nothing could have cast it. The shader
      // fences the same band a second time (`reflBand`); this keeps the centre
      // itself out of the floor so the lobe is never merely half-cut.
      y: THREE.MathUtils.clamp(by, 0.55, 0.88),
      color: bc,
      // Halved along with the radius: a tight specular, not a lens smudge.
      amount: best > 0.02 ? 0.05 : 0,
    });
  }

  /**
   * Park the plane of focus on the painted plate. Sprites are excluded from the
   * DoF depth pass (see the scene.onBeforeRender note), so the plate's distance
   * is the only real depth in the buffer — focusing anywhere else just softens
   * the entire frame uniformly, faces included, which is exactly the mush this
   * replaced. Kept as a hook so a scene change re-lands focus on the new plate.
   */
  private refreshFocus(): void {
    this.focusZ = this.averageLayerZ();
  }

  private averageLayerZ(): number {
    const active = this.layers.filter((l) => l.mesh.visible);
    if (active.length === 0) return -3.5;
    return active.reduce((s, l) => s + l.mesh.position.z, 0) / active.length;
  }

  /* ───────────────────────────  characters  ─────────────────────────── */

  private charDef(key: string): CharacterDef | null {
    return this.bundle?.manifest.characters[key] ?? null;
  }

  private anchorsAt(z: number): Record<CharSide, number> {
    const f = this.frustum(z);
    return { left: -f.w * 0.28, center: 0, right: f.w * 0.28 };
  }

  private charTexture(key: string, pose: string): THREE.Texture {
    const url = this.bundle?.assets.characters[key]?.[pose];
    if (url) {
      const tex = this.textureCache.get(url);
      if (tex) return tex;
    }
    // Any other resolvable pose for this character before falling back.
    const poses = this.bundle?.assets.characters[key];
    if (poses) {
      for (const u of Object.values(poses)) {
        const tex = this.textureCache.get(u);
        if (tex) return tex;
      }
    }
    const color = this.charDef(key)?.color ?? this.bundle?.manifest.theme.key ?? '#7db4c8';
    return this.makeSilhouette(color);
  }

  private indexFor(key: string): number {
    let idx = this.charIndex.get(key);
    if (idx === undefined) {
      idx = this.charSeq++;
      this.charIndex.set(key, idx);
    }
    return idx;
  }

  private onCharEnter(key: string, from: CharSide, pose?: string): void {
    const def = this.charDef(key);
    const poseKey = pose ?? def?.defaultPose ?? this.firstPose(key) ?? 'neutral';
    const texture = this.charTexture(key, poseKey);
    const side: CharSide = from ?? def?.home ?? 'center';

    const existing = this.characters.get(key);
    if (existing) {
      existing.setPose(texture, this.settings.reducedMotion);
      existing.moveTo(side, this.settings.reducedMotion);
      return;
    }

    const f = this.frustum(CHAR_Z);
    const character = new Character(
      {
        key,
        index: this.indexFor(key),
        tint: new THREE.Color(def?.color ?? '#ffffff'),
        height: f.h * 0.72 * (def?.scale ?? 1),
        anchors: this.anchorsAt(CHAR_Z),
        worldZ: CHAR_Z,
      },
      texture,
    );
    character.setSpeaking('neutral');
    this.characters.set(key, character);
    this.characterGroup.add(character.group);
    character.enter(side, this.settings.reducedMotion);
    this.refreshFocus();
  }

  private firstPose(key: string): string | null {
    const poses = this.bundle?.manifest.characters[key]?.poses;
    if (!poses) return null;
    const keys = Object.keys(poses);
    return keys.length ? keys[0] : null;
  }

  private onCharExit(key: string, to: CharSide): void {
    const character = this.characters.get(key);
    if (!character) return;
    this.characters.delete(key);
    this.refreshFocus();
    void character.exit(to ?? 'left', this.settings.reducedMotion).then(() => {
      this.characterGroup.remove(character.group);
      character.dispose();
    });
  }

  private onCharPose(key: string, pose: string): void {
    const character = this.characters.get(key);
    if (!character) return;
    character.setPose(this.charTexture(key, pose), this.settings.reducedMotion);
  }

  private onCharMove(key: string, to: CharSide): void {
    this.characters.get(key)?.moveTo(to, this.settings.reducedMotion);
  }

  private onSpeaking(speaker: string | null): void {
    for (const [key, ch] of this.characters) {
      if (speaker === null) ch.setSpeaking('neutral');
      else ch.setSpeaking(key === speaker ? 'speaker' : 'listener');
    }
    this.refreshFocus();
  }

  /* ───────────────────────────  fx  ─────────────────────────── */

  private onFx(effect: string, params: Record<string, number>): void {
    switch (effect) {
      case 'flash':
        this.postfx.flash(params.strength ?? 0.9);
        break;
      case 'shake':
        this.camera.shake(params.intensity ?? 1, params.duration ?? 0.4);
        break;
      case 'glitch':
        this.postfx.glitch(params.strength ?? 1, params.duration ?? 0.5);
        break;
      case 'dissolve':
        if (!this.transitions.busy) this.transitions.fxShimmer(this.scene, this.camera.camera);
        break;
      default:
        break;
    }
  }

  /* ───────────────────────────  loop  ─────────────────────────── */

  start(): void {
    if (this.running) return;
    this.running = true;
    if (!this.clock.running) this.clock.start();
    const tick = (): void => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(tick);
      this.frame();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.clock.stop();
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const reduced = this.settings.reducedMotion;

    this.camera.update(dt, t);
    for (const layer of this.layers) {
      if (layer.mesh.visible) layer.update(t, this.camera.panX, this.camera.panY, reduced);
    }
    for (const ch of this.characters.values()) ch.update(t, dt);
    this.weather.update(dt, t);
    this.transitions.update(t);
    this.postfx.update(dt, t);
    this.postfx.setFocus(this.camera.distanceTo(this.focusZ));

    this.postfx.render(dt);
  }

  /* ───────────────────────────  settings / resize  ─────────────────────────── */

  applySettings(settings: Settings): void {
    this.settings = { ...settings };
    this.camera.setReducedMotion(settings.reducedMotion);
    this.postfx.applySettings(settings);
  }

  private measure(): void {
    const w = this.canvas.clientWidth || window.innerWidth || 1280;
    const h = this.canvas.clientHeight || window.innerHeight || 720;
    this.width = Math.max(1, Math.floor(w));
    this.height = Math.max(1, Math.floor(h));
  }

  private frustum(z: number): { w: number; h: number } {
    const d = CAM_Z - z;
    const h = 2 * d * Math.tan((FOV * Math.PI) / 180 / 2);
    const w = h * (this.width / this.height);
    return { w, h };
  }

  resize(): void {
    this.measure();
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.setAspect(this.width / this.height);
    this.postfx.resize(this.width, this.height);
    this.transitions.resize(this.width * pr, this.height * pr);
    this.weather.setResolution(this.width * pr, this.height * pr);

    // Re-fit layers and characters to the new frustum.
    this.refitLayers();
    const f = this.frustum(CHAR_Z);
    const anchors = this.anchorsAt(CHAR_Z);
    for (const [key, ch] of this.characters) {
      const def = this.charDef(key);
      ch.relayout(f.h * 0.72 * (def?.scale ?? 1), anchors);
    }
  }

  private refitLayers(): void {
    const visible = this.layers.filter((l) => l.mesh.visible);
    const n = visible.length;
    for (let i = 0; i < n; i++) {
      const depthNorm = n > 1 ? i / (n - 1) : 0.5;
      const z = THREE.MathUtils.lerp(FAR_Z, NEAR_Z, depthNorm);
      const fr = this.frustum(z);
      visible[i].configure({
        z,
        width: fr.w * OVERSCAN,
        height: fr.h * OVERSCAN,
        depth: depthNorm,
        parallax: this.currentParallax,
        phase: i * 1.73 + 0.4,
        offsetX: this.framingX * fr.w,
        offsetY: this.framingY * fr.h,
      });
    }
  }

  /* ───────────────────────────  thumbnail  ─────────────────────────── */

  captureThumbnail(width = 480, height = 270): string {
    this.frame();
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(this.renderer.domElement, 0, 0, width, height);
    try {
      return out.toDataURL('image/png');
    } catch {
      return '';
    }
  }

  /* ───────────────────────────  presence treatment  ─────────────────────────── */

  /**
   * Re-bake a character portrait as an *apparition* rather than a card.
   *
   * Portraits ship with an opaque painted backdrop, so composited raw they read
   * as pasted rectangles floating in front of the scene. Once, at load, each is
   * drawn into an offscreen canvas and given:
   *   • a superellipse alpha falloff — a wide, soft feather left and right so no
   *     straight edge ever survives, around a core that holds the face and near
   *     shoulder at a flat alpha 1;
   *   • a short dissolve off the crown of the head and a long one below the
   *     chest, so she trails off like a memory instead of stopping at a frame
   *     line;
   *   • a light edge vignette on the same falloff, so the fading backdrop sinks
   *     into the scene's depth rather than hazing over it.
   *
   * Returns the source texture untouched if the pixels can't be read (a tainted
   * cross-origin canvas, or no 2D context) — the stage must never fail to draw.
   */
  private toPresenceTexture(src: THREE.Texture): THREE.Texture {
    const img = src.image as (CanvasImageSource & { width?: number; height?: number }) | undefined;
    const w = Math.floor(img?.width ?? 0);
    const h = Math.floor(img?.height ?? 0);
    if (!img || w < 2 || h < 2) return src;

    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0, w, h);

    let frame: ImageData;
    try {
      frame = ctx.getImageData(0, 0, w, h);
    } catch {
      return src;
    }

    const px = frame.data;
    const invPower = 1 / PRESENCE.power;
    for (let y = 0; y < h; y++) {
      const v = (y + 0.5) / h;
      const dy = v - PRESENCE.cy;
      const ny = Math.abs(dy / (dy < 0 ? PRESENCE.rTop : PRESENCE.rBottom)) ** PRESENCE.power;
      // Crown dissolve × torso dissolve — constant across the row.
      const vertical =
        smoothstep(PRESENCE.headEnd, PRESENCE.headStart, v) *
        (1 - smoothstep(PRESENCE.tailStart, PRESENCE.tailEnd, v));
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        const u = (x + 0.5) / w;
        const dx = u - PRESENCE.cx;
        const nx = Math.abs(dx / (dx < 0 ? PRESENCE.rLeft : PRESENCE.rRight)) ** PRESENCE.power;
        const d = (nx + ny) ** invPower;
        const a = (1 - smoothstep(PRESENCE.core, 1, d)) ** PRESENCE.rampGamma * vertical;
        if (a >= 1) continue;
        const i = row + x * 4;
        const shade = 1 - PRESENCE.vignette * (1 - a) ** PRESENCE.vignetteGamma;
        px[i] *= shade;
        px[i + 1] *= shade;
        px[i + 2] *= shade;
        px[i + 3] *= a;
      }
    }
    ctx.putImageData(frame, 0, 0);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    src.dispose();
    return tex;
  }

  /* ───────────────────────────  procedural placeholders  ─────────────────────────── */

  private makeGradient(theme: StoryTheme): THREE.Texture {
    const W = 1280;
    const H = 720;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d')!;
    const paper = hexToRgb(theme.paper || '#0d1418');
    const key = hexToRgb(theme.key || '#7db4c8');
    const dark = mixRgb(paper, { r: 0, g: 0, b: 0 }, 0.55);
    const glow = mixRgb(paper, key, 0.4);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, css(glow));
    grad.addColorStop(0.5, css(paper));
    grad.addColorStop(1, css(dark));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Soft off-center key glow.
    const rg = ctx.createRadialGradient(W * 0.68, H * 0.32, 20, W * 0.68, H * 0.32, H * 0.9);
    rg.addColorStop(0, css(mixRgb(paper, key, 0.5), 0.35));
    rg.addColorStop(1, css(paper, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    // Vignette.
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.procedural.push(tex);
    return tex;
  }

  private makeSilhouette(color: string): THREE.Texture {
    const cached = this.silhouettes.get(color);
    if (cached) return cached;
    const W = 600;
    const H = 900;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d')!;
    const c = hexToRgb(color);

    ctx.save();
    ctx.filter = 'blur(6px)';
    ctx.fillStyle = css(c, 0.55);
    // Head.
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.26, W * 0.17, H * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shoulders / torso.
    ctx.beginPath();
    ctx.moveTo(W * 0.5 - W * 0.18, H * 0.42);
    ctx.bezierCurveTo(W * 0.16, H * 0.5, W * 0.1, H * 0.72, W * 0.14, H);
    ctx.lineTo(W * 0.86, H);
    ctx.bezierCurveTo(W * 0.9, H * 0.72, W * 0.84, H * 0.5, W * 0.5 + W * 0.18, H * 0.42);
    ctx.bezierCurveTo(W * 0.6, H * 0.36, W * 0.4, H * 0.36, W * 0.5 - W * 0.18, H * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Rim light from the right so it reads as a lit figure.
    const rim = ctx.createLinearGradient(W * 0.3, 0, W, 0);
    rim.addColorStop(0, 'rgba(255,255,255,0)');
    rim.addColorStop(1, css(mixRgb(c, { r: 255, g: 255, b: 255 }, 0.6), 0.25));
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.silhouettes.set(color, tex);
    this.procedural.push(tex);
    return tex;
  }

  /* ───────────────────────────  teardown  ─────────────────────────── */

  dispose(): void {
    this.stop();
    for (const off of this.unsub) off();
    this.unsub.length = 0;

    for (const ch of this.characters.values()) ch.dispose();
    this.characters.clear();
    for (const layer of this.layers) {
      this.layerGroup.remove(layer.mesh);
      layer.dispose();
    }
    this.layers.length = 0;

    this.weather.dispose();
    this.transitions.dispose();
    this.postfx.dispose();

    for (const tex of this.textureCache.values()) tex.dispose();
    this.textureCache.clear();
    for (const tex of this.procedural) tex.dispose();
    this.procedural.length = 0;
    this.silhouettes.clear();
    this.gradientTex = null;
    this.lightTex?.dispose();
    this.lightTex = null;

    this.camera.dispose();
    this.scene.clear();
    this.renderer.dispose();
  }
}
