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
          // Authored bokeh: three discrete depth layers of city lights sitting on a
          // horizon that rises out of the bottom edge, so the base of the frame is
          // a distance rather than a void.
          el('div', { class: 'pq-title__lights pq-title__lights--far' }),
          el('div', { class: 'pq-title__lights pq-title__lights--mid' }),
          el('div', { class: 'pq-title__lights pq-title__lights--near' }),
          // The window wall's own bokeh, hand-placed rather than blurred: discs
          // from 4px to 24px so the right third has structure instead of smear.
          el('div', { class: 'pq-title__lights pq-title__lights--city' }),
          el('div', { class: 'pq-title__rain' }),
          // The one sharp plane in the shot: rain actually running on the pane.
          el('div', { class: 'pq-title__glass' }),
          el('div', { class: 'pq-title__lamp' }),
          el('div', { class: 'pq-title__scrim' }),
          // The desk practicals, re-lit ABOVE the scrim so the lamp, the monitor
          // and the mug survive the print-down and the lower-left reads as a room
          // rather than as a black corner.
          el('div', { class: 'pq-title__practicals' }),
          // The dead middle of the frame, given something to be: reflected rain
          // on the glass plus dust drifting through the lamp's throw.
          el('div', { class: 'pq-title__motes' }),
          // Foreground: the near edge of the desk, lit from the practical at left.
          el('div', { class: 'pq-title__sill' }),
          el('div', { class: 'pq-title__vignette' }),
          // Shadow dither. The overlay grain plate above cannot move a near-black
          // value at all (overlay is a no-op on 0), so the long falloffs in the
          // upper-left sky band. This one screens fine noise into the blacks only.
          el('div', { class: 'pq-title__dither' }),
        ]),
        el('div', { class: 'pq-title__inner' }, [
          el('div', { class: 'pq-title__lead' }, [
            el('h1', { class: 'pq-title__word' }, [
              // "Lamplighter", stacked as a compound-word lockup: the roman
              // "Lamp" over the italic accent "lighter". One name, two voices —
              // the same two-tone treatment the previous lockup established.
              el('span', { class: 'pq-title__word-a', text: 'Lamp' }),
              el('span', { class: 'pq-title__word-b', text: 'lighter' }),
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
        // One grain pass over the whole frame — background *and* type — so the
        // photographic plate and the HTML layer share a single emulsion. It also
        // dithers the long dark falloffs that would otherwise band.
        el('div', { class: 'pq-title__grain', aria: { hidden: true } }),
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
    // Empty shelf space is summarized in one quiet ledger row so the rail
    // terminates on the menu baseline instead of repeating disabled chrome.
    const locked = Math.max(0, RAIL_SLOTS - this.stories.length);
    if (locked > 0) this.railEl.appendChild(this.buildLockedSlot(locked));
  }

  /**
   * An empty shelf row. It must read as a *state*, not as a rendering fault: a
   * legible label, a hairline edge and a drawn padlock, rather than a ghost.
   */
  private buildLockedSlot(count: number): HTMLElement {
    return el('div', { class: 'pq-lockslot', aria: { hidden: true } }, [
      el('span', { class: 'pq-lockslot__idx', text: `${count} ${count === 1 ? 'slot' : 'slots'}` }),
      el('span', { class: 'pq-lockslot__state' }, [
        // Drawn from two boxes rather than an icon font, so it stays a hairline
        // at any size and inherits the row's own ink.
        el('span', { class: 'pq-lockslot__lock', aria: { hidden: true } }),
        el('span', { class: 'pq-lockslot__word', text: 'Locked' }),
      ]),
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
      [
        image,
        // The key art ships hotter and more saturated than the menu around it. This
        // pass prints it back down onto the same teal night the backdrop is graded
        // to, so the card belongs to the frame instead of sitting on top of it.
        el('div', { class: 'pq-storycard__grade' }),
        el('div', { class: 'pq-storycard__grain' }),
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
