/**
 * Backlog — scrollable transcript of everything said.
 *
 * Accumulated from `ui:say` (and reset per story). Narration is set in italic
 * serif; spoken lines carry a colored, tracked-out speaker label. Off-script
 * replies (when known) get a warm quill marker so the player can retrace where
 * they broke script.
 */
import type { ChoiceKind } from '../core/types';
import { clear, el, overlayShell } from './dom';

export interface BacklogEntry {
  name: string | null;
  color?: string;
  text: string;
  kind?: ChoiceKind;
}

export class Backlog {
  readonly overlay: HTMLElement;
  readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private readonly scroll: HTMLElement;
  private entries: BacklogEntry[] = [];

  constructor(parent: HTMLElement, onClose: () => void) {
    const shell = overlayShell('History', { onClose, kicker: 'Transcript' });
    this.overlay = shell.overlay;
    this.panel = shell.panel;
    this.body = shell.body;
    this.scroll = el('div', { class: 'pq-backlog', tabIndex: 0, aria: { label: 'Transcript' } });
    this.body.appendChild(this.scroll);
    parent.appendChild(this.overlay);
  }

  push(entry: BacklogEntry): void {
    this.entries.push(entry);
    if (!this.overlay.hidden) this.appendRow(entry, true);
  }

  reset(): void {
    this.entries = [];
    clear(this.scroll);
  }

  render(): void {
    clear(this.scroll);
    if (this.entries.length === 0) {
      this.scroll.appendChild(
        el('p', { class: 'pq-backlog__empty', text: 'The night is still ahead of you.' }),
      );
      return;
    }
    for (const e of this.entries) this.appendRow(e, false);
    this.scroll.scrollTop = this.scroll.scrollHeight;
  }

  private appendRow(e: BacklogEntry, autoscroll: boolean): void {
    const narration = e.name === null;
    const off = e.kind === 'offscript';
    const row = el('div', {
      class:
        'pq-backlog__row' +
        (narration ? ' is-narration' : '') +
        (off ? ' is-offscript' : e.kind ? ' is-reply' : ''),
    });
    if (!narration) {
      const label = el('span', { class: 'pq-backlog__name', text: e.name ?? '' });
      if (e.color) label.style.setProperty('--pq-name', e.color);
      row.appendChild(label);
    }
    row.appendChild(el('p', { class: 'pq-backlog__line', text: e.text }));
    this.scroll.appendChild(row);
    if (autoscroll) this.scroll.scrollTop = this.scroll.scrollHeight;
  }

  destroy(): void {
    this.overlay.remove();
  }
}
