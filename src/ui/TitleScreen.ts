/**
 * TitleScreen — cinematic entry over the live Three stage.
 *
 * The menu sits over a *place*, never over a hex value: the featured story's own
 * key art runs full-bleed at roughly −2EV, doubled by a heavily defocused copy of
 * itself screened back over the top so every practical blooms into city bokeh.
 * Over that: rain on the glass, one warm motivated light from the right third, a
 * directional scrim that buys the type its legibility, film grain and a soft
 * vignette. Both plates drift on long, offset cycles for real parallax.
 *
 * The chrome itself is deliberately bare — no boxes, no icon set, no rounded
 * rects. One serif family in letterspaced caps for the menu, the mono reserved
 * for data eyebrows, and a single story card carrying the art.
 */
import type { StoryManifest } from '../core/types';
import { clear, el, rgbTriplet } from './dom';

/** Slots the rail always shows — real stories first, the remainder dimmed. */
const RAIL_SLOTS = 3;

export interface TitleHandlers {
  onStart: (storyId: string) => void;
  onContinue: () => void;
  onLoad: () => void;
  onSettings: () => void;
  onAbout: () => void;
  hasContinue: () => boolean;
  /** Resolved cover-art URL for a story, or undefined ⇒ themed gradient. */
  coverUrl: (storyId: string) => string | undefined;
  /** Resolved full-bleed backdrop URL (the story's first environment plate). */
  backdropUrl: (storyId: string) => string | undefined;
}

export class TitleScreen {
  readonly root: HTMLElement;
  private readonly railEl: HTMLElement;
  private readonly menuEl: HTMLElement;
  private readonly plateEl: HTMLImageElement;
  private readonly bokehEl: HTMLImageElement;
  private readonly h: TitleHandlers;
  private stories: StoryManifest[] = [];
  private featured = 0;

  constructor(parent: HTMLElement, handlers: TitleHandlers) {
    this.h = handlers;
    this.railEl = el('div', { class: 'pq-rail', role: 'list', aria: { label: 'Stories' } });
    this.menuEl = el('nav', { class: 'pq-title__menu', aria: { label: 'Main menu' } });

    const plate = (cls: string): HTMLImageElement =>
      el('img', {
        class: cls,
        attrs: { alt: '', decoding: 'async' },
        on: { error: (e: Event) => ((e.currentTarget as HTMLElement).hidden = true) },
      });
    this.plateEl = plate('pq-title__plate');
    this.bokehEl = plate('pq-title__bokeh');

    this.root = el(
      'div',
      { class: 'pq-title', role: 'region', aria: { label: 'Title screen' }, hidden: true },
      [
        el('div', { class: 'pq-title__bg', aria: { hidden: true } }, [
          this.plateEl,
          this.bokehEl,
          el('div', { class: 'pq-title__rain' }),
          el('div', { class: 'pq-title__lamp' }),
          el('div', { class: 'pq-title__scrim' }),
          el('div', { class: 'pq-title__grain' }),
          el('div', { class: 'pq-title__vignette' }),
        ]),
        el('div', { class: 'pq-title__inner' }, [
          el('div', { class: 'pq-title__lead' }, [
            el('h1', { class: 'pq-title__word' }, [
              el('span', { class: 'pq-title__word-a', text: 'Picture' }),
              el('span', { class: 'pq-title__word-b', text: 'Quest' }),
            ]),
            el('p', {
              class: 'pq-title__tag',
              text: 'A cinematic narrative quest — you are the voice between the machine and the night.',
            }),
            this.menuEl,
          ]),
          el('div', { class: 'pq-title__stories' }, [
            el('div', { class: 'pq-title__storieshead' }, [
              el('span', { class: 'pq-title__eyebrow', text: 'Choose a story' }),
              el('span', { class: 'pq-title__count' }),
            ]),
            this.railEl,
          ]),
        ]),
      ],
    );
    parent.appendChild(this.root);
  }

  isVisible(): boolean {
    return !this.root.hidden;
  }

  show(stories: StoryManifest[]): void {
    this.stories = stories;
    this.featured = 0;
    this.renderMenu();
    this.renderRail();
    this.applyBackdrop();
    this.root.hidden = false;
    this.root.classList.remove('is-in');
    void this.root.offsetWidth;
    this.root.classList.add('is-in');
  }

  hide(): void {
    this.root.classList.remove('is-in');
    this.root.hidden = true;
  }

  /** Re-evaluate the Continue entry's presence. */
  refresh(): void {
    if (!this.root.hidden) this.renderMenu();
  }

  /**
   * Point both backdrop plates at the featured story's environment art, falling
   * back to its cover. Without either, the layered gradient underneath carries
   * the frame on its own.
   */
  private applyBackdrop(): void {
    const story = this.stories[this.featured];
    const url = story ? (this.h.backdropUrl(story.id) ?? this.h.coverUrl(story.id)) : undefined;
    for (const img of [this.plateEl, this.bokehEl]) {
      if (url) {
        if (img.getAttribute('src') !== url) img.setAttribute('src', url);
        img.hidden = false;
      } else {
        img.removeAttribute('src');
        img.hidden = true;
      }
    }
    this.root.classList.toggle('has-art', !!url);
  }

  private renderMenu(): void {
    clear(this.menuEl);
    const items: HTMLElement[] = [this.menuItem('New Story', () => {
      const s = this.stories[this.featured];
      if (s) this.h.onStart(s.id);
    }, true)];
    // A dimmed, unexplained "Continue" reads as broken — it only exists when it works.
    if (this.h.hasContinue()) items.push(this.menuItem('Continue', () => this.h.onContinue()));
    items.push(
      this.menuItem('Load', () => this.h.onLoad()),
      this.menuItem('Settings', () => this.h.onSettings()),
      this.menuItem('About', () => this.h.onAbout()),
    );
    for (const it of items) this.menuEl.appendChild(it);
  }

  private menuItem(label: string, onClick: () => void, primary = false): HTMLElement {
    return el(
      'button',
      {
        class: 'pq-menuitem' + (primary ? ' is-primary' : ''),
        type: 'button',
        on: { click: onClick },
      },
      [el('span', { class: 'pq-menuitem__label', text: label })],
    );
  }

  private renderRail(): void {
    clear(this.railEl);
    const countEl = this.root.querySelector<HTMLElement>('.pq-title__count');
    if (countEl) countEl.textContent = `${this.stories.length} available`;

    this.stories.forEach((story, i) => {
      this.railEl.appendChild(this.buildCard(story, i));
    });
    // Empty shelf space, stated rather than implied — the rail keeps its mass.
    for (let i = this.stories.length; i < RAIL_SLOTS; i++) {
      this.railEl.appendChild(this.buildLockedSlot(i + 1));
    }
  }

  private buildLockedSlot(index: number): HTMLElement {
    return el('div', { class: 'pq-lockslot', aria: { hidden: true } }, [
      el('span', { class: 'pq-lockslot__idx', text: `Slot ${String(index).padStart(2, '0')}` }),
      el('span', { class: 'pq-lockslot__state', text: 'Locked' }),
    ]);
  }

  private buildCard(story: StoryManifest, index: number): HTMLElement {
    const t = story.theme;
    const cover = this.h.coverUrl(story.id);
    // Real key art when it exists; the themed gradient underneath is the fallback.
    // A load failure drops the <img> so the gradient shows through untouched.
    const image = cover
      ? el('img', {
          class: 'pq-storycard__img',
          attrs: { src: cover, alt: '', decoding: 'async' },
          on: { error: (e: Event) => (e.currentTarget as HTMLElement).remove() },
        })
      : null;
    const art = el(
      'div',
      { class: 'pq-storycard__art' + (cover ? ' has-cover' : ''), aria: { hidden: true } },
      [image, el('div', { class: 'pq-storycard__grain' }), el('div', { class: 'pq-storycard__glow' })],
    );

    const card = el(
      'button',
      {
        class: 'pq-storycard' + (index === this.featured ? ' is-featured' : ''),
        type: 'button',
        role: 'listitem',
        style: styleVars(t.key, t.accent, t.paper, t.ink),
        aria: { label: `Start ${story.title}${story.subtitle ? ' — ' + story.subtitle : ''}` },
        on: {
          click: () => this.h.onStart(story.id),
          focus: () => this.setFeatured(index),
          mouseenter: () => this.setFeatured(index),
        },
      },
      [
        art,
        el('div', { class: 'pq-storycard__body' }, [
          el('h3', { class: 'pq-storycard__title', text: story.title }),
          story.subtitle ? el('p', { class: 'pq-storycard__sub', text: story.subtitle }) : null,
          el('div', { class: 'pq-storycard__foot' }, [
            story.author ? el('span', { class: 'pq-storycard__author', text: story.author }) : null,
            el('span', { class: 'pq-storycard__cta' }, [
              el('span', { class: 'pq-storycard__ctalabel', text: 'Begin' }),
              // A typographic arrow, not an icon set: it sits on the label's own
              // baseline and inherits its tracking.
              el('span', { class: 'pq-storycard__arrow', text: '→', aria: { hidden: true } }),
            ]),
          ]),
        ]),
      ],
    );
    return card;
  }

  private setFeatured(index: number): void {
    if (this.featured === index) return;
    this.featured = index;
    const cards = this.railEl.querySelectorAll<HTMLElement>('.pq-storycard');
    cards.forEach((c, i) => c.classList.toggle('is-featured', i === index));
    this.applyBackdrop();
  }

  /** Focus the first actionable control (for when the title is shown). */
  focusFirst(): void {
    const first = this.menuEl.querySelector<HTMLElement>('button:not([disabled])');
    first?.focus();
  }

  destroy(): void {
    this.root.remove();
  }
}

function styleVars(key: string, accent: string, paper: string, ink: string): string {
  const k = rgbTriplet(key) ?? '125 180 200';
  const a = rgbTriplet(accent) ?? '224 164 107';
  const p = rgbTriplet(paper) ?? '13 20 24';
  const n = rgbTriplet(ink) ?? '232 238 242';
  return `--k:${k};--a:${a};--p:${p};--n:${n}`;
}
