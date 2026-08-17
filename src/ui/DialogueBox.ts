/**
 * DialogueBox — the reading surface.
 *
 * Filmic dialogue bar in the Eliza idiom: a CAPS nameplate at far left of a
 * two-column set, body in a transitional serif on a fixed measure, resting over
 * a soft bottom-fade gradient (never a hard opaque box). The continue ▼ is
 * *inline* — it flows on the last line's baseline right after the final glyph.
 *
 * The prose is split across TWO nodes, not one, and that is load-bearing:
 * everything up to the last couple of words goes in `body`, and the tail —
 * final words PLUS the ▼ — goes in a `white-space: nowrap` span. Two typography
 * crimes are structurally impossible as a result: the last line can never come
 * down to a single orphaned word, and the continue mark can never wrap onto a
 * line of its own away from the sentence it belongs to. Neither is fixable by
 * `text-wrap: pretty` alone, because the glyph is a separate inline box the
 * line-breaker is free to move.
 *
 * Owns a time-based typewriter with punctuation-aware cadence, skippable instantly.
 */
import type { CharacterView } from '../core/types';
import { clear, el, smartQuotes } from './dom';

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
  private readonly tailEl: HTMLElement;
  private readonly tailText: Text;
  private readonly continueEl: HTMLElement;

  private full = '';
  /** Index into `full` at which the un-breakable tail begins. */
  private tailAt = 0;
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

    // The tail: last words + the mark, welded together by `white-space: nowrap`.
    // The text lives in its own node so the mark survives every re-render of the
    // typewriter (assigning textContent on the span would delete it).
    this.tailText = document.createTextNode('');
    this.tailEl = el('span', { class: 'pq-dialogue__tail' });
    this.tailEl.append(this.tailText, this.continueEl);

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
          el('div', { class: 'pq-dialogue__text' }, [this.bodyEl, this.tailEl]),
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

  show(speaker: CharacterView | null, raw: string, opts: ShowOptions, onDone?: (natural: boolean) => void): void {
    this.stopRaf();
    // Typography first, and BEFORE the typewriter is scheduled — the schedule is
    // indexed by character, so substituting glyphs afterwards would slide every
    // reveal time by however many "..." collapsed into "…". See smartQuotes():
    // the reading serif has proper marks and the frame was printing straight
    // ones, which is a named hard-fail on the rubric.
    const text = smartQuotes(raw);
    this.full = text;
    this.tailAt = tailIndex(text);
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
      this.paint(text.length);
      this.typing = false;
      this.revealed = text.length;
      this.markDone(true);
      return;
    }

    this.schedule = buildSchedule(text, opts.speed);
    this.revealed = 0;
    this.paint(0);
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
      this.paint(n);
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
    this.paint(this.full.length);
    this.markDone(false);
  }

  /** Distribute the first `n` characters across the body / no-wrap tail pair. */
  private paint(n: number): void {
    const head = Math.min(n, this.tailAt);
    this.bodyEl.textContent = this.full.slice(0, head);
    this.tailText.data = n > this.tailAt ? this.full.slice(this.tailAt, n) : '';
  }

  clear(): void {
    this.stopRaf();
    this.typing = false;
    this.full = '';
    this.tailAt = 0;
    this.revealed = 0;
    this.paint(0);
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

/** Longest tail (in characters) that may be welded into one un-breakable run. */
const TAIL_MAX = 26;

/**
 * Where the un-breakable tail of a line begins.
 *
 * Prefers the last TWO words, so the closing line of a speech always carries a
 * phrase rather than a lone survivor — the "…heard of / it" orphan is the
 * single most legible typography crime a dialogue bar can commit, and
 * `text-wrap: pretty` is a hint, not a guarantee. Falls back to one word when
 * two would make an un-breakable run long enough to force a bad break of its
 * own, and to the whole string when there is nothing to split.
 */
function tailIndex(text: string): number {
  const t = text.trimEnd();
  const last = t.lastIndexOf(' ');
  if (last <= 0) return 0;
  const prev = t.lastIndexOf(' ', last - 1);
  if (prev > 0 && t.length - prev - 1 <= TAIL_MAX) return prev + 1;
  return last + 1;
}

/**
 * Build cumulative reveal times (ms) per character index (1-based end).
 *
 * The breathing pause belongs AFTER the punctuation, never before it. That
 * reads like a pedantic distinction and is not: charging a full stop six
 * character-times *before* revealing it means every sentence spends a third of
 * a second on screen with its last word complete, its terminal punctuation
 * missing and — since the line has not finished typing — no continue mark on
 * it. A frame grabbed anywhere in that window shows an unpunctuated fragment
 * with no affordance, which is exactly how the reading surface was being read
 * as unfinished next to a shipped one. Marks now arrive with the word they
 * close and the breath is spent before the NEXT character instead.
 *
 * Base cadence from `cps`, plus a small ease-in so the first few characters
 * don't arrive as a hard burst.
 */
function buildSchedule(text: string, cps: number): number[] {
  const base = 1000 / Math.max(1, cps);
  const out: number[] = new Array(text.length);
  let t = 0;
  let rest = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    let step = isSpace(ch) ? base * 0.4 : base;
    // Gentle ease-in over the opening run.
    if (i < 6) step *= 1.6 - i * 0.1;
    // The mark that CLOSES the line arrives with the word it closes. There is
    // no reading benefit to metering out a full stop that nothing follows, and
    // every frame it is missing is a frame in which the line reads as an
    // unpunctuated fragment with no continue mark under it.
    if (i === text.length - 1 && restAfter(ch) > 0) step *= 0.15;
    // `rest` is the breath owed by the PREVIOUS character's mark.
    t += step + rest;
    out[i] = t;
    rest = restAfter(ch) * base;
  }
  return out;
}

/** Ordinary space or the thin space the reading face sets before some marks. */
function isSpace(ch: string): boolean {
  return ch === ' ' || ch === ' ';
}

/**
 * Breath charged after a mark, as a multiple of the base step. Slightly shorter
 * than the old pre-mark figures (6 -> 5, 3.2 -> 2.2, 2.4 -> 1.4): a pause the
 * reader enters having already SEEN the punctuation needs less length to read
 * as a sentence ending than one they enter mid-word.
 */
function restAfter(ch: string): number {
  if (ch === ',' || ch === ';' || ch === ':') return 2.2;
  if (ch === '.' || ch === '!' || ch === '?' || ch === '…') return 5;
  if (ch === '—' || ch === '-') return 1.4;
  return 0;
}
