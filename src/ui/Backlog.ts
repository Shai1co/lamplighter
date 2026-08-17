/**
 * Backlog — scrollable transcript of everything said.
 *
 * Accumulated from `ui:say` (and reset per story). Narration is set in ROMAN
 * serif — a long run of italic paragraphs collapses into a single undifferentiated
 * grey texture and destroys the scannability a transcript exists for — and italic
 * is reserved for stage-direction beats (parentheticals and em-dash asides), so
 * that when it does appear it carries meaning. Spoken lines carry a tracked-out
 * speaker label plus a 2px rail in that speaker's colour; off-script replies get
 * the warm quill accent so the player can retrace where they broke script.
 *
 * The column is the panel's only scroller and is masked at both ends, so text
 * dissolves into the glass instead of being cut off mid-sentence at the border.
 */
import type { ChoiceKind } from '../core/types';
import { clear, el, icon, Icons, overlayShell } from './dom';

export interface BacklogEntry {
  name: string | null;
  color?: string;
  text: string;
  kind?: ChoiceKind;
}

/**
 * A stage-direction beat: a parenthetical, or an aside bracketed by em dashes.
 * These are the only narration lines allowed to be italic.
 */
function isStageDirection(text: string): boolean {
  const t = text.trim();
  return (t.startsWith('(') && t.endsWith(')')) || (t.startsWith('—') && t.endsWith('—'));
}

export class Backlog {
  readonly overlay: HTMLElement;
  readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private readonly scroll: HTMLElement;
  private readonly cue: HTMLElement;
  private entries: BacklogEntry[] = [];

  constructor(parent: HTMLElement, onClose: () => void) {
    const shell = overlayShell('History', { onClose, kicker: 'Transcript' });
    this.overlay = shell.overlay;
    this.panel = shell.panel;
    this.body = shell.body;
    // Off the centre line: a 560px column with symmetric voids either side is
    // the silhouette of an unstyled dialog. Pushed to the golden section the
    // frame becomes a composition and the room keeps half the screen.
    this.overlay.classList.add('pq-modal--offset');
    // The body hands scrolling to the column below, so the panel has exactly one
    // scroller — two nested ones is what clipped the last line at the border.
    this.body.classList.add('pq-modal__body--flush');
    this.scroll = el('div', { class: 'pq-backlog', tabIndex: 0, aria: { label: 'Transcript' } });
    this.scroll.addEventListener('scroll', () => this.syncFades(), { passive: true });
    this.body.appendChild(this.scroll);
    this.cue = icon(Icons.chevron, 'pq-backlog__cue');
    this.panel.appendChild(this.cue);
    parent.appendChild(this.overlay);
  }

  push(entry: BacklogEntry): void {
    this.entries.push(entry);
    if (!this.overlay.hidden) this.appendRow(entry, true);
  }

  reset(): void {
    this.entries = [];
    clear(this.scroll);
    this.syncFades();
  }

  render(): void {
    clear(this.scroll);
    if (this.entries.length === 0) {
      this.scroll.appendChild(
        el('p', { class: 'pq-backlog__empty', text: 'The night is still ahead of you.' }),
      );
      this.syncFades();
      return;
    }
    for (const e of this.entries) this.appendRow(e, false);
    // Open on the newest line. The freshly built column has no measurable height
    // until the next frame, so the scroll (and the fades derived from it) has to
    // be set there or it silently lands at the top.
    requestAnimationFrame(() => {
      this.scroll.scrollTop = this.scroll.scrollHeight;
      this.syncFades();
    });
  }

  /**
   * Retract each end-of-column dissolve when there is nothing beyond it, and
   * park the ▼ affordance with the bottom fade.
   */
  private syncFades(): void {
    const overflow = this.scroll.scrollHeight > this.scroll.clientHeight + 2;
    const top = this.scroll.scrollTop > 6;
    const end =
      !overflow || this.scroll.scrollTop + this.scroll.clientHeight >= this.scroll.scrollHeight - 6;
    this.scroll.dataset.overflow = overflow ? '1' : '0';
    this.scroll.dataset.top = top ? '1' : '0';
    this.scroll.dataset.end = end ? '1' : '0';
    this.cue.dataset.end = end ? '1' : '0';
  }

  private appendRow(e: BacklogEntry, autoscroll: boolean): void {
    const narration = e.name === null;
    const off = e.kind === 'offscript';
    const row = el('div', {
      class:
        'pq-backlog__row' +
        (narration ? ' is-narration' : '') +
        (narration && isStageDirection(e.text) ? ' is-stage' : '') +
        (off ? ' is-offscript' : e.kind ? ' is-reply' : ''),
    });
    // The speaker colour drives both the nameplate and the row's rail, so it is
    // set on the row rather than the label.
    if (!narration) {
      if (e.color) row.style.setProperty('--pq-name', e.color);
      row.appendChild(el('span', { class: 'pq-backlog__name', text: e.name ?? '' }));
    }
    row.appendChild(el('p', { class: 'pq-backlog__line', text: e.text }));
    this.scroll.appendChild(row);
    if (autoscroll) this.scroll.scrollTop = this.scroll.scrollHeight;
    this.syncFades();
  }

  destroy(): void {
    this.overlay.remove();
  }
}
