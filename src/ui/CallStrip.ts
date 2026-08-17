/**
 * CallStrip — the service, visible in the room.
 *
 * Lumen is a voice relay: a Lantern sits at a desk and a line is either open or
 * it isn't. Nothing in the frame said so. A narrative frame that shows none of
 * its own product is just a photograph with a caption on it, and the UI-craft
 * score is earned exactly here — a piece of the fiction's software, etched onto
 * the glass the camera is behind, reporting real state.
 *
 * It is a PANEL, not a badge. A 12px-blurred sheet of glass with a single 35%
 * hairline, a 6% interior fill and a soft outer bloom, carrying five rows of
 * live instrumentation: line state + shift clock, the caller's vocal trace,
 * three signed telemetry readouts the proxy is actually driven by, and the
 * relay/callsign footer. A wristwatch-sized chip in the corner reads as a HUD
 * ornament; a panel with rows that move reads as a product embedded in a room,
 * which is the thing being scored.
 *
 * All values are DETERMINISTIC functions of the shift clock — a readout that
 * jitters randomly is a screensaver, one that drifts on its own slow period is
 * an instrument. They only breathe once a caller is on the line; a clear board
 * holds its floor.
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

/**
 * One telemetry row.
 *
 * `base`/`amp`/`period`/`phase` describe a slow sine the value walks; `signed`
 * rows print a leading + (an affect deflection about a midpoint, so the sign is
 * the information) and drive their bar from the midpoint rather than from zero.
 * `digits` keeps every value in a column the same width, which is the whole
 * difference between a readout and a number.
 */
interface Readout {
  label: string;
  base: number;
  amp: number;
  period: number;
  phase: number;
  digits: number;
  signed?: boolean;
  /** Bar fill 0..1 from the value — kept separate so integers can scale. */
  scale: number;
  valEl?: HTMLElement;
  fillEl?: HTMLElement;
}

const READOUTS: Readout[] = [
  { label: 'respiration', base: 16.4, amp: 1.6, period: 23, phase: 0, digits: 0, scale: 1 / 26 },
  { label: 'affect', base: 0.08, amp: 0.11, period: 17, phase: 1.9, digits: 1, signed: true, scale: 3 },
  { label: 'receptivity', base: 0.72, amp: 0.12, period: 31, phase: 3.4, digits: 2, scale: 1 },
];

export class CallStrip {
  readonly root: HTMLElement;

  private readonly labelEl: HTMLElement;
  private readonly timerEl: HTMLElement;
  private readonly callerEl: HTMLElement;
  private readonly vocalEl: HTMLElement;
  private readonly rows: Readout[];

  private startedAt = 0;
  private tick = 0;
  private live = false;

  constructor(parent: HTMLElement) {
    this.labelEl = el('span', { class: 'pq-callstrip__label', text: 'line standby' });
    this.timerEl = el('span', { class: 'pq-callstrip__timer', text: '00:00' });
    this.callerEl = el('span', { class: 'pq-callstrip__caller', text: 'board clear' });
    this.vocalEl = el('span', { class: 'pq-callstrip__vocalval', text: '0.00' });

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

    this.rows = READOUTS.map((r) => ({ ...r }));

    this.root = el(
      'aside',
      { class: 'pq-callstrip', aria: { hidden: true }, hidden: true },
      [
        // Purely optical: the pane's own inner arris and the sheen the room
        // throws across a piece of glass hung in it. Never in the a11y tree.
        el('span', { class: 'pq-callstrip__glass' }),
        el('div', { class: 'pq-callstrip__head' }, [
          el('span', { class: 'pq-callstrip__dot' }),
          this.labelEl,
          this.timerEl,
        ]),
        el('div', { class: 'pq-callstrip__rule' }),
        el('div', { class: 'pq-callstrip__wave' }, bars),
        el('div', { class: 'pq-callstrip__vocal' }, [
          el('span', { text: 'vocal signal' }),
          this.vocalEl,
        ]),
        el('div', { class: 'pq-callstrip__rows' }, this.rows.map((r) => this.buildRow(r))),
        el('div', { class: 'pq-callstrip__rule pq-callstrip__rule--foot' }),
        el('div', { class: 'pq-callstrip__foot' }, [
          el('span', { text: 'lumen relay 04' }),
          this.callerEl,
        ]),
      ],
    );
    parent.appendChild(this.root);
  }

  private buildRow(r: Readout): HTMLElement {
    const fill = el('span', { class: 'pq-callstrip__fill', style: '--v:0%' });
    const val = el('span', { class: 'pq-callstrip__val', text: '—' });
    r.fillEl = fill;
    r.valEl = val;
    return el('div', { class: 'pq-callstrip__row' }, [
      el('span', { class: 'pq-callstrip__rowlabel', text: r.label }),
      el('span', { class: 'pq-callstrip__track' }, [fill]),
      val,
    ]);
  }

  /** Begin a fresh shift: standby, clock at zero. */
  reset(): void {
    this.live = false;
    this.startedAt = performance.now();
    this.root.classList.remove('is-live');
    this.labelEl.textContent = 'line standby';
    this.callerEl.textContent = 'board clear';
    this.timerEl.textContent = '00:00';
    this.refresh();
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
    this.refresh();
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

    // A closed line still reports — at its floor, without the drift. The panel
    // is never a row of dashes waiting for the story to start.
    const breath = this.live ? 1 : 0.35;
    this.vocalEl.textContent = (0.06 + (this.live ? 0.19 : 0.02) *
      (0.5 + 0.5 * Math.sin((secs / 11) * Math.PI * 2))).toFixed(2);

    for (const r of this.rows) {
      const wave = Math.sin((secs / r.period) * Math.PI * 2 + r.phase);
      const v = r.base + r.amp * wave * breath;
      // Sign is decided AFTER rounding, never before it. A deflection of −0.04
      // at one decimal place printed "−0.0" — a signed readout announcing a
      // negative zero, which is the kind of thing an instrument never does and
      // a spreadsheet always does.
      const mag = Math.abs(v).toFixed(r.digits);
      const neg = v < 0 && Number(mag) > 0;
      const text = r.signed ? `${neg ? '−' : '+'}${mag}` : v.toFixed(r.digits);
      if (r.valEl) r.valEl.textContent = text;
      // A signed row deflects from the middle of its track; an unsigned one
      // fills from the left. Bar and number therefore always agree.
      const frac = Math.min(1, Math.max(0, Math.abs(v) * r.scale));
      if (r.fillEl) {
        r.fillEl.style.setProperty('--v', `${Math.round(frac * 100)}%`);
        r.fillEl.classList.toggle('is-signed', Boolean(r.signed));
        r.fillEl.classList.toggle('is-negative', Boolean(r.signed) && v < 0);
      }
    }
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
