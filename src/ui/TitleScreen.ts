/**
 * TitleScreen — cinematic entry over the live Three stage.
 *
 * A darkened scrim (never opaque — the animated canvas breathes behind it), the
 * wordmark in Fraunces with refined tracking, a tagline, a restrained primary
 * menu, and a rail of story cards. Each card is a 16:9 art frame: the story's own
 * cover key art when it exists, otherwise a gradient built from its palette —
 * either way under the same grain / scrim / emblem overlays.
 */
import type { StoryManifest } from '../core/types';
import { clear, el, Icons, rgbTriplet } from './dom';

export interface TitleHandlers {
  onStart: (storyId: string) => void;
  onContinue: () => void;
  onLoad: () => void;
  onSettings: () => void;
  onAbout: () => void;
  hasContinue: () => boolean;
  /** Resolved cover-art URL for a story, or undefined ⇒ themed gradient. */
  coverUrl: (storyId: string) => string | undefined;
}

export class TitleScreen {
  readonly root: HTMLElement;
  private readonly railEl: HTMLElement;
  private readonly menuEl: HTMLElement;
  private readonly h: TitleHandlers;
  private stories: StoryManifest[] = [];
  private featured = 0;

  constructor(parent: HTMLElement, handlers: TitleHandlers) {
    this.h = handlers;
    this.railEl = el('div', { class: 'pq-rail', role: 'list', aria: { label: 'Stories' } });
    this.menuEl = el('nav', { class: 'pq-title__menu', aria: { label: 'Main menu' } });

    this.root = el(
      'div',
      { class: 'pq-title', role: 'region', aria: { label: 'Title screen' }, hidden: true },
      [
        el('div', { class: 'pq-title__scrim', aria: { hidden: true } }),
        el('div', { class: 'pq-title__vignette', aria: { hidden: true } }),
        el('div', { class: 'pq-title__inner' }, [
          el('div', { class: 'pq-title__lead' }, [
            el('div', { class: 'pq-title__over', text: 'Picture Quest' }),
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
        el('div', { class: 'pq-title__foot', text: 'Built with Three.js · original work in the spirit of Eliza' }),
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
    this.root.hidden = false;
    this.root.classList.remove('is-in');
    void this.root.offsetWidth;
    this.root.classList.add('is-in');
  }

  hide(): void {
    this.root.classList.remove('is-in');
    this.root.hidden = true;
  }

  /** Re-evaluate the Continue button's enabled state. */
  refresh(): void {
    if (!this.root.hidden) this.renderMenu();
  }

  private renderMenu(): void {
    clear(this.menuEl);
    const canContinue = this.h.hasContinue();
    const items: HTMLElement[] = [
      this.menuItem('New Story', Icons.play, () => {
        const s = this.stories[this.featured];
        if (s) this.h.onStart(s.id);
      }, true),
      this.menuItem('Continue', Icons.chevron, () => this.h.onContinue(), false, !canContinue),
      this.menuItem('Load', Icons.load, () => this.h.onLoad()),
      this.menuItem('Settings', Icons.settings, () => this.h.onSettings()),
      this.menuItem('About', Icons.info, () => this.h.onAbout()),
    ];
    for (const it of items) this.menuEl.appendChild(it);
  }

  private menuItem(
    label: string,
    ic: string,
    onClick: () => void,
    primary = false,
    disabled = false,
  ): HTMLElement {
    return el('button', {
      class: 'pq-menuitem' + (primary ? ' is-primary' : ''),
      type: 'button',
      disabled,
      on: { click: onClick },
    }, [
      el('span', { class: 'pq-menuitem__ic', html: ic, aria: { hidden: true } }),
      el('span', { class: 'pq-menuitem__label', text: label }),
    ]);
  }

  private renderRail(): void {
    clear(this.railEl);
    const countEl = this.root.querySelector<HTMLElement>('.pq-title__count');
    if (countEl) countEl.textContent = `${this.stories.length} available`;

    this.stories.forEach((story, i) => {
      this.railEl.appendChild(this.buildCard(story, i));
    });
  }

  private buildCard(story: StoryManifest, index: number): HTMLElement {
    const t = story.theme;
    const cover = this.h.coverUrl(story.id);
    // Real key art when it exists; the themed gradient underneath is the fallback.
    // A load failure drops the <img> so the gradient shows through untouched.
    const image = cover
      ? el('img', {
          class: 'pq-storycard__img',
          attrs: { src: cover, alt: '', decoding: 'async', loading: 'lazy' },
          on: { error: (e: Event) => (e.currentTarget as HTMLElement).remove() },
        })
      : null;
    const art = el(
      'div',
      { class: 'pq-storycard__art' + (cover ? ' has-cover' : ''), aria: { hidden: true } },
      [
        image,
        el('div', { class: 'pq-storycard__grain' }),
        el('div', { class: 'pq-storycard__emblem', html: Icons.spark }),
        el('div', { class: 'pq-storycard__glow' }),
      ],
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
              el('span', { text: 'Begin' }),
              el('span', { class: 'pq-storycard__arrow', html: Icons.chevron, aria: { hidden: true } }),
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
