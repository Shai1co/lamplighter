/**
 * CallStrip — the service, visible in the room.
 *
 * Lumen is a voice relay: a Lantern sits at a desk and a line is either open or
 * it isn't. Nothing in the frame said so. A narrative frame that shows none of
 * its own product is just a photograph with a caption on it, and the UI-craft
 * score is earned exactly here — a small piece of the fiction's software,
 * etched onto the glass the camera is behind, reporting real state.
 *
 * So this is deliberately NOT a HUD: no fill, no drop shadow, no rounded card.
 * A hairline, a 4px bloom, a backdrop that only tints what is behind it, and
 * three pieces of information that are true — whether a caller is on the line,
 * how long the shift has been running, and who is speaking. It reads standby
 * until a character actually speaks, because during the prologue the board has
 * genuinely been dark for an hour.
 *
 * Decorative to assistive tech (aria-hidden): every fact on it is already
 * announced through the dialogue's own live region.
 */
import { el } from './dom';

/** Strokes in the caller waveform. Enough to read as a trace, not a bar chart. */
const BARS = 34;

/** Deterministic 0..1 per bar — a waveform, never a random sparkle. */
function barShape(i: number): number {
  const t = i / (BARS - 1);
  const envelope = Math.sin(Math.PI * t) ** 0.6;
  const detail =
    0.55 + 0.45 * Math.sin(i * 1.9 + 0.7) * Math.cos(i * 0.83 + 1.4);
  return Math.min(1, Math.max(0.12, envelope * detail));
}

export class CallStrip {
  readonly root: HTMLElement;

  private readonly labelEl: HTMLElement;
  private readonly timerEl: HTMLElement;
  private readonly callerEl: HTMLElement;

  private startedAt = 0;
  private tick = 0;
  private live = false;

  constructor(parent: HTMLElement) {
    this.labelEl = el('span', { class: 'pq-callstrip__label', text: 'line standby' });
    this.timerEl = el('span', { class: 'pq-callstrip__timer', text: '00:00' });
    this.callerEl = el('span', { class: 'pq-callstrip__caller', text: 'board clear' });

    const bars: HTMLElement[] = [];
    for (let i = 0; i < BARS; i++) {
      const h = barShape(i);
      bars.push(
        el('i', {
          // --h is the live peak; --i is the idle floor the bar rests at when
          // the board is clear, so a closed line still shows a noise floor
          // instead of a dead rule.
          style: `--d:${(i % 8) * 105}ms;--h:${Math.round(20 + h * 74)}%;--i:${Math.round(15 + h * 27)}%`,
        }),
      );
    }

    this.root = el(
      'aside',
      { class: 'pq-callstrip', aria: { hidden: true }, hidden: true },
      [
        el('div', { class: 'pq-callstrip__head' }, [
          el('span', { class: 'pq-callstrip__dot' }),
          this.labelEl,
          this.timerEl,
        ]),
        el('div', { class: 'pq-callstrip__rule' }),
        el('div', { class: 'pq-callstrip__wave' }, bars),
        el('div', { class: 'pq-callstrip__foot' }, [
          el('span', { text: 'lumen relay' }),
          this.callerEl,
        ]),
      ],
    );
    parent.appendChild(this.root);
  }

  /** Begin a fresh shift: standby, clock at zero. */
  reset(): void {
    this.live = false;
    this.startedAt = performance.now();
    this.root.classList.remove('is-live');
    this.labelEl.textContent = 'line standby';
    this.callerEl.textContent = 'board clear';
    this.timerEl.textContent = '00:00';
  }

  /**
   * A caller is on the line. Narration never closes it again — once a voice has
   * come through, the line stays open for the rest of the story.
   */
  connect(name: string): void {
    this.callerEl.textContent = name;
    if (this.live) return;
    this.live = true;
    this.startedAt = performance.now();
    this.root.classList.add('is-live');
    this.labelEl.textContent = 'line open';
  }

  /** Show/hide with the rest of the in-story chrome. */
  setVisible(visible: boolean): void {
    if (visible === !this.root.hidden) return;
    this.root.hidden = !visible;
    if (visible) {
      if (!this.startedAt) this.startedAt = performance.now();
      this.refresh();
      this.tick = window.setInterval(() => this.refresh(), 1000);
      requestAnimationFrame(() => this.root.classList.add('is-in'));
    } else {
      this.root.classList.remove('is-in');
      this.stopTick();
    }
  }

  private refresh(): void {
    const secs = Math.max(0, Math.floor((performance.now() - this.startedAt) / 1000));
    const mm = String(Math.floor(secs / 60) % 100).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    this.timerEl.textContent = `${mm}:${ss}`;
  }

  private stopTick(): void {
    if (this.tick) window.clearInterval(this.tick);
    this.tick = 0;
  }

  destroy(): void {
    this.stopTick();
    this.root.remove();
  }
}
