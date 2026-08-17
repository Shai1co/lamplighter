/**
 * Picture Quest — story runtime (pure, headless state machine).
 *
 * The Runtime walks a ParsedStory's node lists and drives the whole experience
 * by emitting typed events on the shared bus. It is the SOLE emitter of
 * scene:/char:/weather:/camera:/fx:/audio:/ui:/state:/runtime: events, and it
 * listens for input:* events from the UI to resume after blocking nodes.
 *
 * It imports no rendering / audio / DOM code — only the event bus contract and
 * the guard evaluator. This keeps the narrative logic fully unit-testable.
 */

import type {
  CharacterView,
  GameState,
  IEmitter,
  IRuntime,
  ParsedStory,
  ResolvedChoice,
  StoryBundle,
  StoryManifest,
} from '../core/types';
import { applySet, evalGuard } from './guards';

type Pending = 'say' | 'choice' | 'chapter' | 'wait' | null;

/** Safety cap on consecutive non-blocking steps to break runaway jump loops. */
const STEP_CAP = 10000;

export class Runtime implements IRuntime {
  private readonly bus: IEmitter;
  private readonly unsubscribe: Array<() => void> = [];

  private manifest!: StoryManifest;
  private script!: ParsedStory;

  private storyId = '';
  private label = '';
  private cursor = 0;
  private vars: Record<string, number | boolean> = {};
  private history: GameState['history'] = [];
  private seen: string[] = [];

  private pending: Pending = null;
  private pendingChoices: ResolvedChoice[] = [];
  private ended = false;
  private loaded = false;

  constructor(bus: IEmitter) {
    this.bus = bus;
    this.unsubscribe.push(
      bus.on('input:advance', () => this.onAdvance()),
      bus.on('input:choose', (p) => this.onChoose(p)),
      bus.on('input:continue', () => this.onResumeWait()),
      bus.on('input:skip', () => this.onResumeWait()),
    );
  }

  load(bundle: StoryBundle, state?: GameState): void {
    this.manifest = bundle.manifest;
    this.script = bundle.script;
    this.storyId = bundle.manifest.id;
    this.vars = { ...(bundle.manifest.vars ?? {}), ...(state?.vars ?? {}) };
    this.label = state?.label ?? bundle.manifest.entry ?? bundle.script.entry ?? '';
    this.cursor = state?.cursor ?? 0;
    this.history = state?.history ? state.history.map((h) => ({ ...h })) : [];
    this.seen = state?.seen ? [...state.seen] : [];
    this.pending = null;
    this.pendingChoices = [];
    this.ended = false;
    this.loaded = true;
  }

  start(): void {
    if (!this.loaded) return;
    this.ended = false;
    this.pending = null;
    this.bus.emit('runtime:ready', { story: this.manifest });
    this.emitState();
    this.run();
  }

  snapshot(): GameState {
    return {
      storyId: this.storyId,
      label: this.label,
      cursor: this.cursor,
      vars: { ...this.vars },
      history: this.history.map((h) => ({ ...h })),
      seen: [...this.seen],
    };
  }

  dispose(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
  }

  /* ───────────────────────── execution core ───────────────────────── */

  private run(): void {
    if (this.pending !== null || this.ended || !this.loaded) return;
    let steps = 0;
    for (;;) {
      if (steps++ > STEP_CAP) {
        this.failEnd('Step cap exceeded (possible infinite loop)');
        return;
      }
      const nodes = this.script.labels[this.label];
      if (!nodes) {
        this.failEnd(`Missing label: "${this.label}"`);
        return;
      }
      if (!this.seen.includes(this.label)) this.seen.push(this.label);
      if (this.cursor >= nodes.length) {
        this.end();
        return;
      }

      const node = nodes[this.cursor];
      switch (node.kind) {
        /* ── non-blocking: emit and continue ── */
        case 'bg':
          this.bus.emit('scene:bg', { id: node.id, mood: node.mood, transition: node.transition });
          this.cursor++;
          break;
        case 'enter': {
          const def = this.manifest.characters[node.char];
          this.bus.emit('char:enter', {
            char: node.char,
            from: node.from ?? def?.home ?? 'center',
            pose: node.pose ?? def?.defaultPose,
          });
          this.cursor++;
          break;
        }
        case 'exit': {
          const def = this.manifest.characters[node.char];
          this.bus.emit('char:exit', { char: node.char, to: node.to ?? def?.home ?? 'left' });
          this.cursor++;
          break;
        }
        case 'pose':
          this.bus.emit('char:pose', { char: node.char, pose: node.pose });
          this.cursor++;
          break;
        case 'move':
          this.bus.emit('char:move', { char: node.char, to: node.to });
          this.cursor++;
          break;
        case 'weather':
          this.bus.emit('weather:set', { weather: node.weather, intensity: node.intensity ?? 1 });
          this.cursor++;
          break;
        case 'camera':
          this.bus.emit('camera:move', {
            move: node.move,
            zoom: node.zoom ?? 1,
            duration: node.duration ?? 2,
          });
          this.cursor++;
          break;
        case 'music':
          this.bus.emit('audio:music', { id: node.id, fade: node.fade ?? 1 });
          this.cursor++;
          break;
        case 'sfx':
          this.bus.emit('audio:sfx', { id: node.id });
          this.cursor++;
          break;
        case 'ambience':
          this.bus.emit('audio:ambience', { id: node.id, fade: node.fade ?? 1 });
          this.cursor++;
          break;
        case 'fx':
          this.bus.emit('fx:play', { effect: node.effect, params: node.params ?? {} });
          this.cursor++;
          break;
        case 'set':
          applySet(this.vars, node);
          this.cursor++;
          this.emitState();
          break;
        case 'jump': {
          if (node.guard && !this.test(node.guard)) {
            this.cursor++;
            break;
          }
          if (node.target === 'END') {
            this.end();
            return;
          }
          this.label = node.target;
          this.cursor = 0;
          break;
        }

        /* ── blocking: emit, park, wait for input ── */
        case 'say': {
          if (node.guard && !this.test(node.guard)) {
            this.cursor++;
            break;
          }
          const view = this.resolveSpeaker(node.speaker);
          this.history.push({ speaker: node.speaker, speakerName: view?.name, text: node.text });
          this.bus.emit('char:speaking', { char: node.speaker });
          this.bus.emit('ui:say', { speaker: view, text: node.text, auto: false });
          this.cursor++;
          this.pending = 'say';
          this.emitState();
          return;
        }
        case 'chapter':
          this.bus.emit('ui:chapter', { title: node.title, subtitle: node.subtitle });
          this.cursor++;
          this.pending = 'chapter';
          return;
        case 'wait':
          this.bus.emit('wait:begin', { seconds: node.seconds });
          this.cursor++;
          this.pending = 'wait';
          return;
        case 'choice': {
          const resolved: ResolvedChoice[] = [];
          for (const o of node.options) {
            if (o.guard && !this.test(o.guard)) continue;
            resolved.push({ target: o.target, text: o.text, kind: o.kind });
          }
          if (resolved.length === 0) {
            // No reachable option — skip rather than soft-lock.
            this.cursor++;
            break;
          }
          this.pendingChoices = resolved;
          this.pending = 'choice';
          this.bus.emit('ui:choices', { options: resolved });
          return;
        }
      }
    }
  }

  /* ───────────────────────── input handlers ───────────────────────── */

  private onAdvance(): void {
    if (this.ended) return;
    if (this.pending === 'say' || this.pending === 'chapter') {
      this.pending = null;
      this.run();
    }
  }

  private onResumeWait(): void {
    if (this.ended) return;
    if (this.pending === 'wait') {
      this.pending = null;
      this.run();
    }
  }

  private onChoose(payload: { target: string }): void {
    if (this.pending !== 'choice') return;
    this.pending = null;
    const chosen = this.pendingChoices.find((o) => o.target === payload.target) ?? this.pendingChoices[0];
    this.pendingChoices = [];
    if (chosen) {
      this.history.push({ speaker: null, text: chosen.text, choiceKind: chosen.kind });
      this.emitState();
    }
    const target = chosen ? chosen.target : payload.target;
    if (!target || target === 'END') {
      this.end();
      return;
    }
    this.label = target;
    this.cursor = 0;
    this.run();
  }

  /* ───────────────────────── helpers ───────────────────────── */

  private test(guard: string): boolean {
    return evalGuard(guard, this.vars);
  }

  private resolveSpeaker(key: string | null): CharacterView | null {
    if (key === null) return null;
    const def = this.manifest.characters[key];
    if (!def) return { key, name: key, color: this.manifest.theme.accent };
    return { key, name: def.name, color: def.color };
  }

  private emitState(): void {
    this.bus.emit('state:changed', { state: this.snapshot() });
  }

  private end(): void {
    if (this.ended) return;
    this.ended = true;
    this.pending = null;
    this.bus.emit('ui:end', { credits: this.manifest.credits });
  }

  private failEnd(reason: string): void {
    // eslint-disable-next-line no-console
    console.warn(`[pq:runtime] ${reason}`);
    this.end();
  }
}
