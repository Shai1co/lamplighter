/**
 * Backlog — scrollable transcript of everything said.
 *
 * Accumulated from `ui:say` (and reset per story). Narration is set in ROMAN
 * serif — a long run of italic paragraphs collapses into a single undifferentiated
 * grey texture and destroys the scannability a transcript exists for — and italic
 * is reserved for stage-direction beats (parentheticals and em-dash asides), so
 * that when it does appear it carries meaning.
 *
 * The rail is binary and means exactly one thing — attribution. A spoken line
 * carries a tracked-out speaker label plus a 2px rail struck in the DESK
 * PRACTICAL's amber (--pq-rail-lamp), not in the speaker's own colour: a
 * character whose declared colour is a near-neutral put a grey tick down the
 * column, the one mark in the panel belonging to no light in the room.
 * Per-speaker identity still lives in the nameplate. Narration carries no rail
 * at all, only the indent and a lighter ink. Off-script replies keep the warm
 * quill accent so the player can retrace where they broke script.
 *
 * Each entry also prints a shift stamp on a fixed right-hand tab stop, and a
 * named voice gets 8px of extra air above it, so the column chunks into events
 * and scans as a log rather than as an essay.
 *
 * The column is the panel's only scroller. It reserves a full panel-dissolve of
 * bottom padding so its last line always sits ABOVE the ramp rather than being
 * guillotined at the pane's edge, and a drawn 2px rail (not a UA scrollbar)
 * carries the position.
 */
import type { ChoiceKind } from '../core/types';
import { clear, el, icon, Icons, overlayShell, smartQuotes } from './dom';

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

/**
 * Where the shift clock starts, in minutes past midnight — 03:11, the hour the
 * script itself puts on the board. Every entry is stamped one minute later, so
 * the right-hand column of the transcript reads as a monotonic log of a night
 * rather than as a decorated list. Nothing here touches story text: the stamp
 * is UI metadata derived from an entry's ordinal, exactly as a real transcript
 * viewer would derive it from a record's index.
 */
const SHIFT_BASE_MIN = 3 * 60 + 11;

/** `03:11` for entry 0, `03:12` for entry 1, wrapping at midnight. */
function stampFor(index: number): string {
  const m = (SHIFT_BASE_MIN + index) % (24 * 60);
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export class Backlog {
  readonly overlay: HTMLElement;
  readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private readonly scroll: HTMLElement;
  private readonly cue: HTMLElement;
  private readonly rail: HTMLElement;
  private readonly thumb: HTMLElement;
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
    // Drawn scroll rail. It lives in the body rather than the panel so its
    // track spans exactly the scrolling region — a rail that started under the
    // masthead would be measuring the wrong thing.
    this.thumb = el('div', { class: 'pq-backlog__thumb' });
    this.rail = el('div', { class: 'pq-backlog__rail', aria: { hidden: true } }, [this.thumb]);
    this.body.appendChild(this.rail);
    this.cue = icon(Icons.chevron, 'pq-backlog__cue');
    this.panel.appendChild(this.cue);
    parent.appendChild(this.overlay);
  }

  push(entry: BacklogEntry): void {
    this.entries.push(entry);
    if (!this.overlay.hidden) this.appendRow(entry, this.entries.length - 1, true);
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
    this.entries.forEach((e, i) => this.appendRow(e, i, false));
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
    // A column that fits has no scroll region, so it gets no terminator at all;
    // one that scrolls keeps the mark until its end (see CSS) so both ends of
    // the region read as designed.
    this.cue.dataset.overflow = overflow ? '1' : '0';
    this.rail.dataset.overflow = overflow ? '1' : '0';
    // Thumb geometry as fractions of the track: length is the visible share of
    // the column, offset is how far through the remainder we have travelled.
    const view = this.scroll.clientHeight;
    const total = Math.max(this.scroll.scrollHeight, 1);
    const share = Math.min(1, view / total);
    const travel = total > view ? this.scroll.scrollTop / (total - view) : 0;
    this.thumb.style.height = `${(share * 100).toFixed(2)}%`;
    this.thumb.style.top = `${(travel * (1 - share) * 100).toFixed(2)}%`;
  }

  private appendRow(e: BacklogEntry, index: number, autoscroll: boolean): void {
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
    // The shift stamp, on every entry — it is the right-hand tab stop that makes
    // the column scan as a log instead of as a wall of paragraphs.
    row.appendChild(el('span', { class: 'pq-backlog__time', text: stampFor(index) }));
    row.appendChild(el('p', { class: 'pq-backlog__line', text: smartQuotes(e.text) }));
    this.scroll.appendChild(row);
    if (autoscroll) this.scroll.scrollTop = this.scroll.scrollHeight;
    this.syncFades();
  }

  destroy(): void {
    this.overlay.remove();
  }
}
