/**
 * DialogueBox — the reading surface.
 *
 * Filmic dialogue bar in the Eliza idiom: a CAPS nameplate at far left of a
 * two-column set, body in a transitional serif on a fixed 1050px measure,
 * resting over a soft bottom-fade gradient (never a hard opaque box). The
 * continue ▼ is *inline* — it flows on the last line's baseline right after the
 * final glyph, so it can never orphan itself below the block.
 * Owns a time-based typewriter with punctuation-aware cadence, skippable instantly.
 */
import type { CharacterView } from '../core/types';
import { clear, el } from './dom';

export interface ShowOptions {
  /** Characters per second. 0 (or reduced-motion) = instant. */
  speed: number;
  /** Force an instant reveal regardless of speed. */
  instant?: boolean;
  /**
   * Plate to show for narration (no speaker) — e.g. the role the player is
   * reading as. Omitted ⇒ narration runs plate-less.
   */
  narrator?: string;
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
    // A single clipped box, not two rotated bars: the glyph is a solid ▼ and
    // carries no interior detail. See .pq-continue.
    this.continueEl = el('span', { class: 'pq-continue', aria: { hidden: true } });

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

    // Nameplate. Speech uses the character's name; narration falls back to the
    // story's narrator role, so a line is never anonymous when one is declared.
    const plate = speaker ? speaker.name : (opts.narrator ?? '');
    this.root.classList.toggle('is-narration', !speaker);
    this.nameEl.textContent = plate;
    this.nameEl.hidden = plate.length === 0;

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
    this.nameEl.hidden = true;
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
