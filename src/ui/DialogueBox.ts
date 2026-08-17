/**
 * DialogueBox — the reading surface.
 *
 * Filmic dialogue bar in the Eliza idiom: a CAPS speaker nameplate at far left,
 * body set in a transitional serif with generous leading, resting over a soft
 * bottom-fade gradient (never a hard opaque box), with a small ▼ continue glyph.
 * Owns a time-based typewriter with punctuation-aware cadence, skippable instantly.
 */
import type { CharacterView } from '../core/types';
import { clear, el } from './dom';

export interface ShowOptions {
  /** Characters per second. 0 (or reduced-motion) = instant. */
  speed: number;
  /** Force an instant reveal regardless of speed. */
  instant?: boolean;
}

export class DialogueBox {
  readonly root: HTMLElement;
  private readonly nameEl: HTMLElement;
  private readonly bodyEl: HTMLElement;
  private readonly continueEl: HTMLElement;

  private full = '';
  private schedule: number[] = [];
  private startTime = 0;
  private raf = 0;
  private typing = false;
  private revealed = 0;
  private onDone: ((natural: boolean) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.nameEl = el('div', { class: 'pq-dialogue__name', aria: { hidden: true } });
    this.bodyEl = el('p', { class: 'pq-dialogue__body' });
    this.continueEl = el('span', {
      class: 'pq-continue',
      aria: { hidden: true },
      html: '<i></i><i></i>',
    });

    this.root = el(
      'div',
      {
        class: 'pq-dialogue',
        role: 'group',
        aria: { label: 'Dialogue', live: 'polite' },
        hidden: true,
      },
      [
        el('div', { class: 'pq-dialogue__scrim', aria: { hidden: true } }),
        el('div', { class: 'pq-dialogue__inner' }, [
          this.nameEl,
          el('div', { class: 'pq-dialogue__text' }, [this.bodyEl, this.continueEl]),
        ]),
      ],
    );
    parent.appendChild(this.root);
  }

  /** The paragraph element — used as the FLIP target when a proxy line lifts in. */
  get textElement(): HTMLElement {
    return this.bodyEl;
  }

  isTyping(): boolean {
    return this.typing;
  }

  isVisible(): boolean {
    return !this.root.hidden;
  }

  show(speaker: CharacterView | null, text: string, opts: ShowOptions, onDone?: (natural: boolean) => void): void {
    this.stopRaf();
    this.full = text;
    this.onDone = onDone ?? null;
    this.root.hidden = false;
    this.root.classList.remove('is-done');
    this.continueEl.classList.remove('is-shown');

    // Speaker nameplate — narration (null) collapses the plate and italicises body.
    if (speaker) {
      this.root.classList.remove('is-narration');
      this.nameEl.textContent = speaker.name;
      this.nameEl.style.setProperty('--pq-name', speaker.color || 'var(--pq-accent)');
      this.nameEl.hidden = false;
    } else {
      this.root.classList.add('is-narration');
      this.nameEl.hidden = true;
      this.nameEl.textContent = '';
    }

    const instant = opts.instant || opts.speed <= 0;
    if (instant) {
      this.bodyEl.textContent = text;
      this.typing = false;
      this.revealed = text.length;
      this.markDone(true);
      return;
    }

    this.schedule = buildSchedule(text, opts.speed);
    this.revealed = 0;
    this.bodyEl.textContent = '';
    this.typing = true;
    this.startTime = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number): void => {
    const elapsed = now - this.startTime;
    let n = this.revealed;
    while (n < this.schedule.length && this.schedule[n] <= elapsed) n++;
    if (n !== this.revealed) {
      this.revealed = n;
      this.bodyEl.textContent = this.full.slice(0, n);
    }
    if (n >= this.full.length) {
      this.typing = false;
      this.markDone(true);
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  /** Reveal everything immediately (user skip). Fires completion as non-natural. */
  skip(): void {
    if (!this.typing && this.revealed >= this.full.length) return;
    this.stopRaf();
    this.typing = false;
    this.revealed = this.full.length;
    this.bodyEl.textContent = this.full;
    this.markDone(false);
  }

  clear(): void {
    this.stopRaf();
    this.typing = false;
    this.full = '';
    this.revealed = 0;
    this.bodyEl.textContent = '';
    this.nameEl.textContent = '';
    this.continueEl.classList.remove('is-shown');
    this.root.classList.remove('is-done');
    this.root.hidden = true;
  }

  private markDone(natural: boolean): void {
    this.root.classList.add('is-done');
    this.continueEl.classList.add('is-shown');
    const cb = this.onDone;
    this.onDone = null;
    if (cb) cb(natural);
  }

  private stopRaf(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  destroy(): void {
    this.stopRaf();
    this.root.remove();
  }
}

/**
 * Build cumulative reveal times (ms) per character index (1-based end).
 * Base cadence from `cps`, with breathing pauses after punctuation and a small
 * ease-in so the first few characters don't arrive as a hard burst.
 */
function buildSchedule(text: string, cps: number): number[] {
  const base = 1000 / Math.max(1, cps);
  const out: number[] = new Array(text.length);
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    let step = base;
    if (ch === ' ' || ch === ' ') step = base * 0.4;
    else if (ch === ',' || ch === ';' || ch === ':') step = base * 3.2;
    else if (ch === '.' || ch === '!' || ch === '?' || ch === '…') step = base * 6;
    else if (ch === '—' || ch === '-') step = base * 2.4;
    // Gentle ease-in over the opening run.
    if (i < 6) step *= 1.6 - i * 0.1;
    t += step;
    out[i] = t;
  }
  return out;
}
