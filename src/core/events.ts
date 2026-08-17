/**
 * Picture Quest — tiny typed event bus.
 *
 * The single integration seam between engine ⇄ stage ⇄ ui ⇄ audio.
 * main.ts creates one Emitter and passes it to every subsystem constructor.
 */
import type {
  EngineEventHandler,
  EngineEventMap,
  EngineEventName,
  IEmitter,
} from './types';

export class Emitter implements IEmitter {
  private handlers: {
    [K in EngineEventName]?: Set<EngineEventHandler<K>>;
  } = {};

  /** Optional debug hook: set to log every event. */
  debug = false;

  on<K extends EngineEventName>(event: K, handler: EngineEventHandler<K>): () => void {
    let set = this.handlers[event] as Set<EngineEventHandler<K>> | undefined;
    if (!set) {
      set = new Set<EngineEventHandler<K>>();
      this.handlers[event] = set as never;
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  once<K extends EngineEventName>(event: K, handler: EngineEventHandler<K>): () => void {
    const wrapped: EngineEventHandler<K> = (payload) => {
      this.off(event, wrapped);
      handler(payload);
    };
    return this.on(event, wrapped);
  }

  off<K extends EngineEventName>(event: K, handler: EngineEventHandler<K>): void {
    const set = this.handlers[event] as Set<EngineEventHandler<K>> | undefined;
    set?.delete(handler);
  }

  emit<K extends EngineEventName>(event: K, payload: EngineEventMap[K]): void {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.debug('[pq:event]', event, payload);
    }
    const set = this.handlers[event] as Set<EngineEventHandler<K>> | undefined;
    if (!set || set.size === 0) return;
    // Copy to allow handlers to unsubscribe safely during dispatch.
    for (const handler of [...set]) {
      handler(payload);
    }
  }

  /** Remove every subscription (used on teardown). */
  clear(): void {
    this.handlers = {};
  }
}
