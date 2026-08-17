/**
 * Settings — sliders and toggles bound to the live host settings.
 *
 * Every edit composes a full next-Settings object and commits it (host.applySettings
 * + local UI reflect) so the app updates instantly. Fullscreen is toggled here on
 * the user's gesture. All controls are keyboard-operable with custom focus states.
 */
import type { AppHost, Settings } from '../core/types';
import { DEFAULT_SETTINGS } from '../core/types';
import { clear, el, overlayShell } from './dom';

export class SettingsPanel {
  readonly overlay: HTMLElement;
  readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private readonly host: AppHost;
  private readonly commit: (next: Settings) => void;
  private current: Settings;

  constructor(parent: HTMLElement, host: AppHost, onClose: () => void, commit: (next: Settings) => void) {
    this.host = host;
    this.commit = commit;
    this.current = { ...host.getSettings() };
    const shell = overlayShell('Settings', { onClose, kicker: 'Preferences' });
    this.overlay = shell.overlay;
    this.panel = shell.panel;
    this.body = shell.body;
    parent.appendChild(this.overlay);
  }

  open(): void {
    this.current = { ...this.host.getSettings() };
    this.render();
  }

  /** Reflect externally-changed settings while open. */
  sync(settings: Settings): void {
    this.current = { ...settings };
    if (!this.overlay.hidden) this.render();
  }

  private change(patch: Partial<Settings>): void {
    this.current = { ...this.current, ...patch };
    this.commit(this.current);
  }

  private render(): void {
    clear(this.body);
    const s = this.current;

    const group = (title: string, rows: HTMLElement[]): HTMLElement =>
      el('section', { class: 'pq-set__group' }, [
        el('h3', { class: 'pq-set__grouptitle', text: title }),
        el('div', { class: 'pq-set__rows' }, rows),
      ]);

    this.body.appendChild(
      el('div', { class: 'pq-set' }, [
        group('Text', [
          this.slider('Text speed', s.textSpeed, 0, 100, 5, (v) => this.change({ textSpeed: v }), (v) =>
            v <= 0 ? 'Instant' : `${v} cps`,
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
        el('div', { class: 'pq-set__foot' }, [
          el('button', {
            class: 'pq-btn pq-btn--ghost',
            type: 'button',
            text: 'Reset to defaults',
            on: {
              click: () => {
                this.current = { ...DEFAULT_SETTINGS };
                this.commit(this.current);
                this.render();
              },
            },
          }),
        ]),
      ]),
    );
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

  private slider(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onInput: (v: number) => void,
    fmt: (v: number) => string,
  ): HTMLElement {
    const val = el('span', { class: 'pq-field__val', text: fmt(value) });
    const input = el('input', {
      class: 'pq-range',
      type: 'range',
      aria: { label },
      attrs: { min, max, step, value },
      on: {
        input: (e: Event) => {
          const v = Number((e.target as HTMLInputElement).value);
          val.textContent = fmt(v);
          (e.target as HTMLInputElement).style.setProperty('--pq-fill', `${((v - min) / (max - min)) * 100}%`);
          onInput(v);
        },
      },
    }) as HTMLInputElement;
    input.style.setProperty('--pq-fill', `${((value - min) / (max - min)) * 100}%`);

    return el('div', { class: 'pq-field pq-field--slider' }, [
      el('div', { class: 'pq-field__head' }, [
        el('label', { class: 'pq-field__label', text: label }),
        val,
      ]),
      input,
    ]);
  }

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

  destroy(): void {
    this.overlay.remove();
  }
}

function pct(v: number): number {
  return Math.round(v * 100);
}
function fmtPct(v: number): string {
  return `${v}%`;
}
