/**
 * ChapterCard — full-bleed typographic interstitial with a light-bleed reveal.
 *
 * A hush between scenes: a thin rule, a small overline, the chapter title in
 * Fraunces at display size, an optional subtitle, all rising through a warm
 * light-bleed wash. Dismissed by the next advance.
 */
import { el } from './dom';

export class ChapterCard {
  readonly root: HTMLElement;
  private readonly overline: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly subEl: HTMLElement;
  private count = 0;

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
        ]),
      ],
    );
    parent.appendChild(this.root);
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }

  show(title: string, subtitle?: string): void {
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
