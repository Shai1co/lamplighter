/**
 * ChapterCard — full-bleed typographic interstitial with a light-bleed reveal.
 *
 * A hush between scenes: a small tracked overline, a 24px hairline, the chapter
 * title in Fraunces at display size, an optional subtitle, and exactly ONE
 * continue chevron — all rising through a warm light-bleed wash. While the card
 * is up it owns the frame (UILayer parks the dialogue bar and the wait ellipsis
 * behind `.pq.is-chapter`), so the shot never carries a second, unexplained
 * affordance. Dismissed by the next advance.
 */
import { el } from './dom';

export class ChapterCard {
  readonly root: HTMLElement;
  private readonly overline: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly subEl: HTMLElement;
  private count = 0;
  /**
   * "Holding the frame", which is NOT the same as "still in the DOM": the root
   * lingers for the length of its fade-out. UILayer drives `.pq.is-chapter` off
   * this, so the dialogue bar starts coming back the instant the card is
   * dismissed rather than a full transition later.
   */
  private open = false;

  constructor(parent: HTMLElement) {
    this.overline = el('div', { class: 'pq-chapter__over', aria: { hidden: true } });
    this.titleEl = el('h2', { class: 'pq-chapter__title' });
    this.subEl = el('p', { class: 'pq-chapter__sub' });

    this.root = el(
      'div',
      {
        class: 'pq-chapter',
        role: 'group',
        aria: { label: 'Chapter', live: 'polite' },
        hidden: true,
      },
      [
        el('div', { class: 'pq-chapter__bleed', aria: { hidden: true } }),
        el('div', { class: 'pq-chapter__inner' }, [
          this.overline,
          el('div', { class: 'pq-chapter__rule', aria: { hidden: true } }),
          this.titleEl,
          this.subEl,
          el('div', { class: 'pq-chapter__more', aria: { hidden: true } }, [
            el('i'),
            el('i'),
          ]),
        ]),
      ],
    );
    parent.appendChild(this.root);
  }

  isOpen(): boolean {
    return this.open;
  }

  show(title: string, subtitle?: string): void {
    this.open = true;
    this.count += 1;
    this.overline.textContent = `Chapter ${roman(this.count)}`;
    this.titleEl.textContent = title;
    this.subEl.textContent = subtitle ?? '';
    this.subEl.hidden = !subtitle;

    this.root.hidden = false;
    this.root.classList.remove('is-in');
    // Force reflow so the entrance transition always plays.
    void this.root.offsetWidth;
    this.root.classList.add('is-in');
  }

  hide(): void {
    if (this.root.hidden) return;
    this.open = false;
    this.root.classList.remove('is-in');
    this.root.classList.add('is-out');
    const done = (): void => {
      this.root.hidden = true;
      this.root.classList.remove('is-out');
      this.root.removeEventListener('transitionend', onEnd);
    };
    const onEnd = (e: TransitionEvent): void => {
      if (e.target === this.root && e.propertyName === 'opacity') done();
    };
    this.root.addEventListener('transitionend', onEnd);
    // Fallback in case transitionend doesn't fire (reduced motion / display none).
    window.setTimeout(done, 640);
  }

  /** Reset chapter numbering when a new story begins. */
  reset(): void {
    this.count = 0;
  }

  destroy(): void {
    this.root.remove();
  }
}

function roman(n: number): string {
  const table: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let out = '';
  let v = n;
  for (const [val, sym] of table) {
    while (v >= val) {
      out += sym;
      v -= val;
    }
  }
  return out || 'I';
}
