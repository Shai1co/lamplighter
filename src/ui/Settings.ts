/**
 * Settings — sliders and toggles bound to the live host settings.
 *
 * Every edit composes a full next-Settings object and commits it (host.applySettings
 * + local UI reflect) so the app updates instantly. Fullscreen is toggled here on
 * the user's gesture. All controls are keyboard-operable with custom focus states.
 *
 * The column is the panel's only scroller and is masked at its ends, so a row that
 * runs past the glass dissolves into it instead of being guillotined mid-control —
 * a half-cut toggle at a panel border is the single loudest "unfinished web modal"
 * tell there is.
 *
 * Below the column sits a FOOT RAIL, outside the scroller and outside the mask: it
 * carries the ▼ affordance and the reset action. The ▼ used to float over the
 * column's last row, which put a glyph directly on top of body copy that was itself
 * being cropped by the panel edge — two crimes in one 30px square. A rail also
 * shortens the column by the height of the reset row, which is what lets the whole
 * of Settings sit inside the glass without scrolling at 1080p.
 */
import type { AppHost, Settings } from '../core/types';
import { DEFAULT_SETTINGS } from '../core/types';
import { clear, el, icon, Icons, overlayShell } from './dom';

/** A parsed readout: figures and an optional tracked unit suffix. */
interface Readout {
  n: string;
  unit?: string;
}

export class SettingsPanel {
  readonly overlay: HTMLElement;
  readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private readonly scroll: HTMLElement;
  private readonly cue: HTMLElement;
  private readonly host: AppHost;
  private readonly commit: (next: Settings) => void;
  private current: Settings;
  /** True while this panel's own edit is round-tripping through the host. */
  private selfEdit = false;
  /** Arms the staggered entrance exactly once per open. */
  private entering = false;
  private enterTimer = 0;

  constructor(parent: HTMLElement, host: AppHost, onClose: () => void, commit: (next: Settings) => void) {
    this.host = host;
    this.commit = commit;
    this.current = { ...host.getSettings() };
    const shell = overlayShell('Settings', { onClose, kicker: 'Preferences' });
    this.overlay = shell.overlay;
    this.panel = shell.panel;
    this.body = shell.body;
    // Scoped type hierarchy (display-optical title, tracked accent eyebrow) lives
    // on the panel so the shared modal shell stays untouched for other screens.
    this.panel.classList.add('pq-modal__panel--set');
    // Loosens the shell's frame gutter for THIS overlay only: Settings carries more
    // rows than any other modal and the 76px gutter was capping the glass ~90px
    // short of what the content needs.
    this.overlay.classList.add('pq-modal--set');
    // Hand scrolling to the column below: exactly ONE scroller in the panel, and
    // it is the one carrying the dissolve.
    this.body.classList.add('pq-modal__body--flush');
    this.scroll = el('div', { class: 'pq-set' });
    this.scroll.addEventListener('scroll', () => this.syncFades(), { passive: true });
    this.body.appendChild(this.scroll);
    // Foot rail — below the column and below its dissolve, so the ▼ can never
    // land on type. Reset lives here too rather than as a row inside the scroller.
    this.cue = icon(Icons.chevron, 'pq-set__cue');
    this.panel.appendChild(
      el('div', { class: 'pq-set__rail' }, [
        this.cue,
        el('button', {
          class: 'pq-set__reset',
          type: 'button',
          text: 'Reset to defaults',
          on: { click: () => this.resetDefaults() },
        }),
      ]),
    );
    parent.appendChild(this.overlay);
  }

  open(): void {
    this.current = { ...this.host.getSettings() };
    this.entering = true;
    this.render();
    window.clearTimeout(this.enterTimer);
    this.enterTimer = window.setTimeout(() => {
      this.entering = false;
    }, 1200);
  }

  /** Reflect externally-changed settings while open. */
  sync(settings: Settings): void {
    this.current = { ...settings };
    // Our own commit has already been reflected in the live DOM. Re-rendering here
    // would tear the control out from under the pointer mid-drag (and re-fire the
    // entrance stagger on every single slider tick).
    if (this.selfEdit) return;
    if (!this.overlay.hidden) this.render();
  }

  private change(patch: Partial<Settings>): void {
    this.current = { ...this.current, ...patch };
    this.selfEdit = true;
    try {
      this.commit(this.current);
    } finally {
      this.selfEdit = false;
    }
  }

  private render(): void {
    clear(this.scroll);
    this.scroll.classList.toggle('is-entering', this.entering);
    const s = this.current;

    const group = (title: string, rows: HTMLElement[]): HTMLElement =>
      el('section', { class: 'pq-set__group' }, [
        el('h3', { class: 'pq-set__grouptitle', text: title }),
        el('div', { class: 'pq-set__rows' }, rows),
      ]);

    for (const node of [
      group('Text', [
        this.slider('Text speed', s.textSpeed, 0, 100, 5, (v) => this.change({ textSpeed: v }), (v) =>
          v <= 0 ? { n: 'Instant' } : { n: String(v), unit: 'cps' },
        ),
        this.toggle('Auto-advance', s.autoAdvance, (v) => this.change({ autoAdvance: v }),
          'Advance dialogue automatically once a line finishes.'),
      ]),
      group('Audio', [
        this.slider('Master volume', pct(s.masterVolume), 0, 100, 1, (v) =>
          this.change({ masterVolume: v / 100 }), fmtPct),
        this.slider('Music', pct(s.musicVolume), 0, 100, 1, (v) =>
          this.change({ musicVolume: v / 100 }), fmtPct),
        this.slider('Effects', pct(s.sfxVolume), 0, 100, 1, (v) =>
          this.change({ sfxVolume: v / 100 }), fmtPct),
      ]),
      group('Visuals', [
        this.toggle('Cinematic', s.cinematic, (v) => this.change({ cinematic: v }),
          'Bloom, depth of field and per-story color grade.'),
        this.slider('Film grain', pct(s.grain), 0, 100, 1, (v) =>
          this.change({ grain: v / 100 }), fmtPct),
        this.toggle('Reduced motion', s.reducedMotion, (v) => this.change({ reducedMotion: v }),
          'Calms camera drift, shake and heavy motion.'),
        this.toggle('Fullscreen', s.fullscreen, (v) => this.onFullscreen(v)),
      ]),
    ]) {
      this.scroll.appendChild(node);
    }

    // A freshly built column has no measurable height until the next frame, so the
    // dissolve lengths have to be derived there or they read as "nothing overflows".
    this.syncFades();
    requestAnimationFrame(() => this.syncFades());
  }

  /**
   * Retract each end-of-column dissolve when there is nothing beyond it.
   *
   * The overflow threshold is deliberately slack (8px, not 1): the column is tuned
   * to fit inside the glass at 1080p, and a sub-pixel layout rounding must not arm
   * a 48px dissolve over content that is in fact entirely visible — that reads as
   * the panel cropping a row it isn't cropping.
   */
  private syncFades(): void {
    const overflow = this.scroll.scrollHeight > this.scroll.clientHeight + 8;
    const end =
      !overflow || this.scroll.scrollTop + this.scroll.clientHeight >= this.scroll.scrollHeight - 6;
    this.scroll.dataset.overflow = overflow ? '1' : '0';
    this.scroll.dataset.top = this.scroll.scrollTop > 6 ? '1' : '0';
    this.scroll.dataset.end = end ? '1' : '0';
    this.cue.dataset.end = end ? '1' : '0';
  }

  private onFullscreen(want: boolean): void {
    try {
      if (want && !document.fullscreenElement) {
        void document.documentElement.requestFullscreen?.();
      } else if (!want && document.fullscreenElement) {
        void document.exitFullscreen?.();
      }
    } catch {
      /* fullscreen may be blocked; commit intent regardless */
    }
    this.change({ fullscreen: want });
  }

  /**
   * Slider — a drawn instrument, not a styled `<input type=range>`.
   *
   * The rail beneath carries the whole picture: a 2px hairline for the unspent
   * run and an accent-lit filled run with its own bloom. The default-value tick
   * that used to hang under the rail is GONE: at 1× it rendered as a 1px stub
   * dangling off the bottom of the thumb, which reads as a rendering artifact
   * rather than as a graduation, and every capture had one under every slider.
   * The input itself is transparent except for its thumb.
   */
  private slider(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onInput: (v: number) => void,
    fmt: (v: number) => Readout,
  ): HTMLElement {
    const at = (v: number): string => `${((v - min) / (max - min)) * 100}%`;
    const val = readout(fmt(value));
    const fill = el('span', { class: 'pq-range__fill', aria: { hidden: true } });
    const rail = el('span', { class: 'pq-range__rail', aria: { hidden: true } }, [fill]);

    const input = el('input', {
      class: 'pq-range',
      type: 'range',
      aria: { label },
      attrs: { min, max, step, value },
      on: {
        input: (e: Event) => {
          const v = Number((e.target as HTMLInputElement).value);
          fillReadout(val, fmt(v));
          wrap.style.setProperty('--pq-fill', at(v));
          onInput(v);
        },
      },
    }) as HTMLInputElement;

    const wrap = el('div', { class: 'pq-range-wrap' }, [rail, input]);
    wrap.style.setProperty('--pq-fill', at(value));

    return el('div', { class: 'pq-field pq-field--slider' }, [
      el('div', { class: 'pq-field__head' }, [
        el('label', { class: 'pq-field__label', text: label }),
        val,
      ]),
      wrap,
    ]);
  }

  /**
   * Toggle — a hairline pill. Off is a drawn outline with a dim dot; on fills with
   * the key colour and lights a soft halo, with the dot punched out of it in the
   * panel's own paper so the on-state reads as a switch rather than a teal blob.
   */
  private toggle(
    label: string,
    value: boolean,
    onChange: (v: boolean) => void,
    hint?: string,
  ): HTMLElement {
    const knob = el('span', { class: 'pq-switch__knob', aria: { hidden: true } });
    const btn = el('button', {
      class: 'pq-switch' + (value ? ' is-on' : ''),
      type: 'button',
      role: 'switch',
      aria: { checked: value ? 'true' : 'false', label },
      on: {
        click: () => {
          const next = !btn.classList.contains('is-on');
          btn.classList.toggle('is-on', next);
          btn.setAttribute('aria-checked', next ? 'true' : 'false');
          onChange(next);
        },
      },
    }, [knob]);

    return el('div', { class: 'pq-field pq-field--toggle' }, [
      el('div', { class: 'pq-field__copy' }, [
        el('span', { class: 'pq-field__label', text: label }),
        hint ? el('span', { class: 'pq-field__hint', text: hint }) : null,
      ]),
      btn,
    ]);
  }

  private resetDefaults(): void {
    this.current = { ...DEFAULT_SETTINGS };
    this.selfEdit = true;
    try {
      this.commit(this.current);
    } finally {
      this.selfEdit = false;
    }
    this.render();
  }

  destroy(): void {
    window.clearTimeout(this.enterTimer);
    this.overlay.remove();
  }
}

function pct(v: number): number {
  return Math.round(v * 100);
}
function fmtPct(v: number): Readout {
  return { n: String(v), unit: '%' };
}

/**
 * One readout style for every value in the panel: tabular figures carrying the
 * number, a tracked small-caps span carrying the unit. Split into two spans so
 * "45 cps" and "90%" set their figures at the same weight and colour and their
 * units at the same (quieter) one — three values that each invented their own
 * typography is what made the column read as a form rather than an instrument.
 */
function readout(r: Readout): HTMLElement {
  const node = el('span', { class: 'pq-field__val' });
  fillReadout(node, r);
  return node;
}

function fillReadout(node: HTMLElement, r: Readout): void {
  clear(node);
  node.appendChild(el('span', { class: 'pq-field__num', text: r.n }));
  if (r.unit) {
    node.appendChild(
      el('span', {
        class: r.unit === '%' ? 'pq-field__unit pq-field__unit--tight' : 'pq-field__unit',
        text: r.unit,
      }),
    );
  }
}
