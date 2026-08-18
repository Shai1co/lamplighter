/**
 * CallStrip — the service, visible in the room.
 *
 * Lumen is a voice relay: a Lantern sits at a desk and a line is either open or
 * it isn't. Nothing in the frame said so. A narrative frame that shows none of
 * its own product is just a photograph with a caption on it, and the UI-craft
 * score is earned exactly here — a piece of the fiction's software, etched onto
 * the glass the camera is behind, reporting real state.
 *
 * ── It is a CHIP, not a panel ───────────────────────────────────────────────
 *
 * It used to be a panel: a header row, a rule, a 34-stroke vocal trace, a
 * labelled VOCAL SIGNAL level, a second rule and a relay/callsign footer. Every
 * one of those rows was well made and the set of them was the frame's worst
 * idea, because the LUMEN PROXY pane in the opposite corner prints a vocal
 * waveform and a vocal level of its own. Two telemetry panels on one side of one
 * screen, each with its own waveform and its own signal number, do not read as a
 * rich product — they read as a DASHBOARD, and a dashboard is the opposite of a
 * place. The frame stopped being a room with software in it and became a
 * monitoring UI with a photograph behind it.
 *
 * So the duplicate instrument is gone and what is left is the one fact the proxy
 * pane cannot state: the LINE. Is it open, who is on it, how long has it been
 * running. One row, one baseline, three fields — a status chip on the same sheet
 * of glass the proxy pane is etched on, hung off the same right margin.
 *
 * The clock is a DETERMINISTIC function of the shift, never a jitter: a readout
 * that flickers randomly is a screensaver, one that counts is an instrument.
 *
 * Decorative to assistive tech (aria-hidden): every fact on it is already
 * announced through the dialogue's own live region.
 */
import { el } from './dom';

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
          el('span', { class: 'pq-callstrip__sep', text: '·' }),
          this.callerEl,
          this.timerEl,
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
