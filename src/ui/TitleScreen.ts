/**
 * TitleScreen — cinematic entry over the live Three stage.
 *
 * The composition is now TWO things and nothing else: a full-bleed backdrop
 * plate carrying the right two thirds, and a left type stack (wordmark, tagline,
 * menu). The story card that used to hang in the right column is gone — a card
 * is a *picker*, and a picker on a title composition is chrome sitting on a
 * photograph. Story selection moved behind NEW STORY: one story starts
 * immediately, several open the picker on the shared modal layer, where the same
 * card and rail markup is exactly the right UI.
 *
 * The plate itself is rendered NEAR-CRISP. Every hand-drawn compensation the old
 * ops_room backdrop needed — the power windows, the authored bokeh discs, the
 * floor reflections, the rain rakes, the drawn monitor and practicals — has been
 * deleted, because the dedicated title plate paints all of it, in paint, at the
 * right exposure. What is left is the photographic finish that belongs to the
 * FRAME rather than to any one plate: a directional scrim that buys the type its
 * legibility, a matte-box vignette, film grain, shadow dither, and a slow drift.
 */
import type { StoryManifest } from '../core/types';
import { clear, el, overlayShell, rgbTriplet, smartQuotes } from './dom';

/** Slots the picker's rail always shows — real stories first, the remainder dimmed. */
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
  /** Resolved full-bleed backdrop URL (the story's dedicated title plate). */
  backdropUrl: (storyId: string) => string | undefined;
  /** Push a title-owned overlay onto the shared modal layer (the story picker). */
  openModal: (overlay: HTMLElement, panel: HTMLElement) => void;
  /** Pop the top modal — the picker's close button, backdrop click and Esc. */
  closeModal: () => void;
}

export class TitleScreen {
  readonly root: HTMLElement;
  private readonly railEl: HTMLElement;
  private readonly menuEl: HTMLElement;
  private readonly plateEl: HTMLImageElement;
  private readonly haloEl: HTMLImageElement;
  private readonly picker: ReturnType<typeof overlayShell>;
  private readonly pickerCount: HTMLElement;
  private readonly h: TitleHandlers;
  private stories: StoryManifest[] = [];
  private featured = 0;

  constructor(parent: HTMLElement, modalLayer: HTMLElement, handlers: TitleHandlers) {
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
    // The ONE remaining copy of the plate, and it is not a defocus pass: at 2.5px
    // it is halation — the veiling a bright practical throws into the emulsion
    // around itself — screened back over the window third at a whisper. Anything
    // deeper than this is the "concept painting behind frosted glass" treatment
    // the plate was generated specifically to retire.
    this.haloEl = plate('pq-title__halo');

    this.root = el(
      'div',
      { class: 'pq-title', role: 'region', aria: { label: 'Title screen' }, hidden: true },
      [
        el('div', { class: 'pq-title__bg', aria: { hidden: true } }, [
          this.plateEl,
          this.haloEl,
          el('div', { class: 'pq-title__scrim' }),
          el('div', { class: 'pq-title__vignette' }),
          // Shadow dither. The overlay grain plate above cannot move a near-black
          // value at all (overlay is a no-op on 0), so the long falloffs in the
          // upper-left wall band. This one screens fine noise into the blacks only.
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
        ]),
        // The frame's counterweight. Everything with mass — the wordmark, the
        // menu and the lamp — sits left and centre, and the lower right is the
        // far end of the window wall. One line of the mono micro system is the
        // cheapest honest object that can hang there: it terminates on the same
        // chrome margin every other edge does, and it is the kind of mark a
        // shipped build carries in the corner of its title screen.
        el('div', { class: 'pq-title__stamp', aria: { hidden: true }, text: 'Lamplighter · build 0.1.0' }),
        // One grain pass over the whole frame — background *and* type — so the
        // photographic plate and the HTML layer share a single emulsion. It also
        // dithers the long dark falloffs that would otherwise band.
        el('div', { class: 'pq-title__grain', aria: { hidden: true } }),
      ],
    );
    parent.appendChild(this.root);

    /* ── The story picker ────────────────────────────────────────────────────
       Built on the shared modal shell, so it inherits the glass, the rack
       focus, the focus trap, the backdrop click and Esc for free. The rail and
       the cards are the SAME markup the title used to carry: they were never
       bad UI, they were bad UI *on a title composition*. In a picker they are
       exactly right — cover art is the only thing that distinguishes one story
       from another. */
    this.picker = overlayShell('Choose a story', {
      onClose: () => this.h.closeModal(),
      kicker: 'Library',
    });
    this.picker.overlay.classList.add('pq-modal--picker');
    this.pickerCount = el('span', { class: 'pq-picker__count' });
    this.picker.body.appendChild(
      el('div', { class: 'pq-picker' }, [
        el('div', { class: 'pq-picker__head' }, [
          el('span', { class: 'pq-picker__eyebrow', text: 'Stories' }),
          this.pickerCount,
        ]),
        this.railEl,
      ]),
    );
    modalLayer.appendChild(this.picker.overlay);
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
   * Point the backdrop plates at the story's dedicated title art, falling back
   * through the environment plate to its cover (see AppHost.getBackdropUrl).
   * Without any of them the layered gradient underneath carries the frame.
   */
  private applyBackdrop(): void {
    const story = this.stories[this.featured];
    const url = story ? (this.h.backdropUrl(story.id) ?? this.h.coverUrl(story.id)) : undefined;
    for (const img of [this.plateEl, this.haloEl]) {
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
    const items: HTMLElement[] = [this.menuItem('New Story', () => this.newStory(), true)];
    // A dimmed, unexplained "Continue" reads as broken — it only exists when it works.
    if (this.h.hasContinue()) items.push(this.menuItem('Continue', () => this.h.onContinue()));
    items.push(
      this.menuItem('Load', () => this.h.onLoad()),
      this.menuItem('Settings', () => this.h.onSettings()),
      this.menuItem('About', () => this.h.onAbout()),
    );
    for (const it of items) this.menuEl.appendChild(it);
  }

  /**
   * One story is not a choice, so it is not presented as one: NEW STORY starts
   * it. Several stories IS a choice, and a choice needs the art — the picker.
   */
  private newStory(): void {
    if (this.stories.length > 1) {
      this.renderRail();
      this.h.openModal(this.picker.overlay, this.picker.panel);
      return;
    }
    const s = this.stories[this.featured] ?? this.stories[0];
    if (s) this.h.onStart(s.id);
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
    this.pickerCount.textContent = `${this.stories.length} available`;

    this.stories.forEach((story, i) => {
      this.railEl.appendChild(this.buildCard(story, i));
    });
    // Empty shelf space is summarized in one quiet ledger row so the rail
    // terminates on a designed edge instead of repeating disabled chrome.
    const locked = Math.max(0, RAIL_SLOTS - this.stories.length);
    // The ledger row is a FOOTER of the card above it, not a free-floating bar:
    // the flag lets the rail square off the last card's bottom corners so the
    // two share one frame. A detached micro-bar reads as unfinished layout.
    this.railEl.classList.toggle('has-lock', locked > 0);
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
        // The key art ships hotter and more saturated than the panel around it.
        // This pass prints it back down onto the same teal night the picker is
        // graded to, so the card belongs to the frame instead of sitting on it.
        el('div', { class: 'pq-storycard__grade' }),
        // The thumbnail's focal logic, drawn rather than downsampled: one warm
        // light cluster with crisp practicals inside it, a stated horizon, the
        // reflections that fall from it, and the same rain rake as the backdrop.
        // At 494px a painted skyline resolves to mush unless something in it
        // carries a hard edge.
        el('div', { class: 'pq-storycard__spark' }),
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
          click: () => {
            // Close the picker before the story loads, or the transcript layer
            // inherits an open dialog with nothing behind it.
            this.h.closeModal();
            this.h.onStart(story.id);
          },
          focus: () => this.setFeatured(index),
          mouseenter: () => this.setFeatured(index),
        },
      },
      [
        art,
        el('div', { class: 'pq-storycard__body' }, [
          el('h3', { class: 'pq-storycard__title', text: story.title }),
          story.subtitle ? el('p', { class: 'pq-storycard__sub', text: smartQuotes(story.subtitle) }) : null,
          el('div', { class: 'pq-storycard__foot' }, [
            story.author ? el('span', { class: 'pq-storycard__author', text: story.author }) : null,
            // The one control on the card, and it is a CONTROL, not a link: an
            // underline plus an arrow is default-web vocabulary and reads as an
            // <a> pasted onto a game. It is a quiet bordered rectangle in the
            // same hairline language as the pane's own arris, and it lights up
            // in the room's own cool signal when it is live.
            el('span', { class: 'pq-storycard__cta' }, [
              el('span', { class: 'pq-storycard__ctalabel', text: 'Begin' }),
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
    this.picker.overlay.remove();
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
