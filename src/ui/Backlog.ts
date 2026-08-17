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
 * The column is the panel's only scroller, and the pane it sits in has a DRAWN
 * bottom edge rather than a dissolve into the crop: equal insets top and
 * bottom, an 80px content fade, a footer rail carrying the log's extent (entry
 * count and shift span, both derived from the record's own length), and a
 * closing hairline. A drawn 2px track with a drawn thumb — not a UA scrollbar —
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
 * Longest head dissolve the column will ever draw, in px.
 *
 * The ramp always TERMINATES on an entry boundary (see `syncHeadFade`); this
 * caps how far back from that boundary it is allowed to START, so a scroll
 * position that happens to sit 300px above the next entry does not dissolve a
 * third of the panel. About three lines of the reading serif.
 */
const HEAD_FADE_MAX = 58;

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
  private readonly count: HTMLElement;
  private readonly span: HTMLElement;
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
    // ── The panel's bottom edge ────────────────────────────────────────────
    // A footer rail rather than a dissolve into the crop: how many entries the
    // log holds, and the span of shift it covers. Both are UI metadata derived
    // from the record's own length — nothing here reads or prints story text —
    // and between them they give the column a reason to stop where it stops.
    this.count = el('span', { class: 'pq-backlog__count' });
    this.span = el('span', { class: 'pq-backlog__span' });
    this.panel.appendChild(
      el('footer', { class: 'pq-backlog__foot', aria: { hidden: true } }, [this.count, this.span]),
    );
    // Weather on the far plane. A dedicated plate because it needs its own mask
    // (the window wall only) and its own blend (screen), and because the
    // overlay's blur layers are backdrop roots that would swallow it. Inserted
    // ahead of the panel so it sits behind the glass, above the rack focus.
    this.overlay.insertBefore(
      el('div', { class: 'pq-modal__rain', aria: { hidden: true } }),
      this.panel,
    );
    this.syncFoot();
    parent.appendChild(this.overlay);
  }

  /** Entry count and shift span on the footer rail — the log's own extent. */
  private syncFoot(): void {
    const n = this.entries.length;
    this.count.textContent = n === 1 ? '1 entry' : `${n} entries`;
    this.span.textContent = n === 0 ? '—' : `${stampFor(0)}–${stampFor(n - 1)}`;
  }

  push(entry: BacklogEntry): void {
    this.entries.push(entry);
    this.syncFoot();
    if (!this.overlay.hidden) this.appendRow(entry, this.entries.length - 1, true);
  }

  reset(): void {
    this.entries = [];
    clear(this.scroll);
    this.syncFoot();
    this.syncFades();
  }

  render(): void {
    clear(this.scroll);
    this.syncFoot();
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
    this.scroll.dataset.empty = this.entries.length === 0 ? '1' : '0';
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
    this.syncHeadFade(top);
    // Thumb geometry as fractions of the track: length is the visible share of
    // the column, offset is how far through the remainder we have travelled.
    const view = this.scroll.clientHeight;
    const total = Math.max(this.scroll.scrollHeight, 1);
    // Capped at 86% of the track. A column that only just overflows produces a
    // thumb the full length of its own track, and a thumb that exactly covers
    // its track is indistinguishable from a stray 2px rule down the panel —
    // which is precisely how the previous build's scrollbar read. Holding back
    // a seventh guarantees visible track at one end or the other in every
    // state, so the mark is always legibly a thumb IN something.
    const share = Math.min(0.86, view / total);
    const travel = total > view ? this.scroll.scrollTop / (total - view) : 0;
    this.thumb.style.height = `${(share * 100).toFixed(2)}%`;
    this.thumb.style.top = `${(travel * (1 - share) * 100).toFixed(2)}%`;
  }

  /**
   * Snap the head dissolve to an entry boundary.
   *
   * A fixed-length top fade lands wherever the scroll happens to be, which is
   * how the captured frame ended up printing the transcript's first entry cut
   * through the middle of its own first line: half a sentence at 55% sitting
   * directly above a second line at 100%. At that scale the eye does not read
   * "this is dissolving", it reads "this is broken" — and a scroll region that
   * amputates a line is exactly the undesigned-web-modal tell the rest of this
   * panel exists to avoid.
   *
   * So the ramp's END is pinned to the top of the first entry that is fully in
   * view, and its START is at most {@link HEAD_FADE_MAX} above that. Whatever
   * is dissolved is therefore always the WHOLE of the entry scrolling out, and
   * the first entry the reader can actually read begins at full value on its
   * own cap line. When an entry boundary happens to sit exactly at the top of
   * the viewport the ramp collapses to nothing, which is correct: there is
   * nothing half-shown to dissolve.
   */
  private syncHeadFade(scrolled: boolean): void {
    const s = this.scroll.style;
    if (!scrolled) {
      s.setProperty('--fade-start', '0px');
      s.setProperty('--fade-top', '0px');
      return;
    }
    const y = this.scroll.scrollTop;
    let boundary = 0;
    for (const node of Array.from(this.scroll.children)) {
      const offset = (node as HTMLElement).offsetTop - y;
      if (offset >= 0) {
        boundary = offset;
        break;
      }
    }
    const len = Math.min(boundary, HEAD_FADE_MAX);
    s.setProperty('--fade-start', `${(boundary - len).toFixed(1)}px`);
    s.setProperty('--fade-top', `${boundary.toFixed(1)}px`);
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
