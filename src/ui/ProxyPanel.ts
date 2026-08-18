/**
 * ProxyPanel — the heart of the Eliza-like mechanic ("Lumen").
 *
 * A diegetic glass assistant that surfaces the AI's *suggested* lines and the
 * player's *off-script* option as distinct affordances. Suggested lines read as
 * cool, technical, softly glowing "Proxy Response" tiles (JetBrains Mono system
 * voice, numbered hotkeys, faint scanline). The off-script line is a warmer,
 * hand-authored "say your own words" affordance. A faux telemetry strip
 * (vocal-signal waveform + affect meters) sells it as a product in the world.
 */
import type { ResolvedChoice } from '../core/types';
import { el, clear, Icons, smartQuotes } from './dom';

export type SelectHandler = (index: number) => void;

export class ProxyPanel {
  readonly root: HTMLElement;
  private readonly listEl: HTMLElement;
  private readonly offEl: HTMLElement;
  private readonly labelEl: HTMLElement;
  private tiles: HTMLElement[] = [];

  constructor(parent: HTMLElement) {
    this.listEl = el('div', { class: 'pq-proxy__list', role: 'list' });
    this.offEl = el('div', { class: 'pq-proxy__off' });
    this.labelEl = el('div', { class: 'pq-proxy__label', text: 'PROXY RESPONSE' });

    this.root = el(
      'section',
      {
        class: 'pq-proxy',
        role: 'group',
        aria: { label: 'Lumen — suggested responses' },
        hidden: true,
      },
      [
        el('div', { class: 'pq-proxy__glow', aria: { hidden: true } }),
        // The pane's front surface: its inner hairline and the window's rain
        // caught on the glass. Purely optical, never in the a11y tree.
        el('div', { class: 'pq-proxy__glass', aria: { hidden: true } }),
        el('header', { class: 'pq-proxy__head' }, [
          el('div', { class: 'pq-proxy__brand' }, [
            el('span', { class: 'pq-proxy__mark', html: Icons.spark }),
            el('span', { class: 'pq-proxy__name', text: 'LUMEN' }),
            el('span', { class: 'pq-proxy__tag', text: 'PROXY' }),
          ]),
          el('div', { class: 'pq-proxy__status' }, [
            el('span', { class: 'pq-proxy__dot', aria: { hidden: true } }),
            el('span', { text: 'channel open' }),
          ]),
        ]),
        // FOUR ROWS OF ONE GRID, never two columns.
        //
        // The vocal trace used to sit in its own left-hand cell with its caption
        // under it and the three meters stacked in a cell beside it. Both halves
        // right-aligned their numbers into a box of the same width and the CSS
        // called that a shared decimal column — which it was not: two right
        // alignments 256px apart are two alignments, and a reader sees four
        // figures of which two line up.
        //
        // VOCAL is simply the first instrument on the panel now, and its waveform
        // is its track. Every row is label | track | readout in the same grid, so
        // the decimal column is structural: no rename, no reflow and no viewport
        // can pull the four figures off one vertical. Every trace still terminates
        // in its own readout — AFFECT is a signed deflection about a midpoint
        // (hence the sign and the centred bar); the other two are plain 0–1
        // levels, so bar and number always agree.
        el('div', { class: 'pq-proxy__telemetry', aria: { hidden: true } }, [
          el('div', { class: 'pq-meter pq-meter--vocal' }, [
            el('span', { class: 'pq-meter__label', text: 'VOCAL' }),
            // 28 → 40 bars. The trace now spans the full track column (≈228px at
            // the shared rail) instead of half the pane, and at 28 the bars came
            // out ~6px wide against a 5px minimum height — i.e. wider than they
            // were tall, so the pill radius rounded them off and the "waveform"
            // printed as a row of dots. 40 puts them back under 4px: a trace made
            // of strokes, which is what a vocal trace is.
            el('div', { class: 'pq-proxy__wave' }, buildWave(40)),
            el('span', { class: 'pq-meter__val', text: '0.2' }),
          ]),
          meter('AFFECT', 0.6, '+0.1'),
          meter('RECEPTIVITY', 0.8, '0.8'),
          meter('COHERENCE', 0.5, '0.5'),
        ]),
        this.labelEl,
        this.listEl,
        this.offEl,
      ],
    );
    parent.appendChild(this.root);
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }

  /**
   * Render suggested + off-script options.
   * @returns interactive tile elements aligned to `options` index order.
   */
  show(options: ResolvedChoice[], onSelect: SelectHandler): HTMLElement[] {
    clear(this.listEl);
    clear(this.offEl);
    this.tiles = new Array(options.length);

    options.forEach((opt, i) => {
      if (opt.kind === 'offscript') {
        const tile = this.buildOffscript(opt, i, onSelect);
        this.tiles[i] = tile;
        this.offEl.appendChild(tile);
      } else {
        const tile = this.buildSuggested(opt, i, onSelect);
        this.tiles[i] = tile;
        this.listEl.appendChild(tile);
      }
    });
    // A menu that mixes a plain `>?` branch into a proxy menu is legal PQScript
    // (the starter template ships one), so the label has to tell the truth about
    // what is under it: "PROXY RESPONSE" only when every listed line actually
    // came from the panel.
    const allSuggested = options.every((o) => o.kind === 'suggested' || o.kind === 'offscript');
    this.labelEl.textContent = allSuggested ? 'PROXY RESPONSE' : 'RESPONSE';

    // A previous selection leaves `is-choosing` on the panel (it drives the
    // lift-out fade, opacity 0) — hide() keeps it so the fade can finish, but a
    // fresh show() MUST shed it or the new menu renders fully transparent and
    // unclickable: the runtime waits on a choice no mouse can reach. (Hotkeys
    // still worked, which is exactly why automated playthroughs missed it.)
    this.root.classList.remove('is-choosing');
    this.root.hidden = false;
    // Stagger the tiles in.
    requestAnimationFrame(() => this.root.classList.add('is-in'));
    return this.tiles;
  }

  /**
   * A listed response tile.
   *
   * Two kinds land here: the panel's own `suggested` lines, and plain `neutral`
   * (`>?`) branches when an author mixes one into a proxy menu. They share the
   * tile chrome — `pq-tile--suggested` carries the baseline alignment and the
   * hover/focus treatment, and a plain branch is still a row in this list — but
   * ONLY a real suggestion wears the "suggested" cue. The cue is the panel
   * claiming authorship of the line, and a neutral branch is not Lumen's line to
   * claim; `pq-tile--neutral` is there for anyone who later wants to draw the
   * distinction harder.
   */
  private buildSuggested(opt: ResolvedChoice, index: number, onSelect: SelectHandler): HTMLElement {
    const suggested = opt.kind === 'suggested';
    const tile = el(
      'button',
      {
        class: 'pq-tile pq-tile--suggested' + (suggested ? '' : ' pq-tile--neutral'),
        type: 'button',
        role: 'listitem',
        style: `--pq-i:${index}`,
        aria: { keyshortcuts: String(index + 1) },
        on: { click: () => onSelect(index) },
      },
      [
        el('span', { class: 'pq-tile__num', text: index + 1, aria: { hidden: true } }),
        el('span', { class: 'pq-tile__scan', aria: { hidden: true } }),
        el('span', { class: 'pq-tile__text', text: smartQuotes(opt.text) }),
        suggested ? el('span', { class: 'pq-tile__cue', text: 'suggested', aria: { hidden: true } }) : null,
      ],
    );
    return tile;
  }

  private buildOffscript(opt: ResolvedChoice, index: number, onSelect: SelectHandler): HTMLElement {
    return el(
      'button',
      {
        class: 'pq-tile pq-tile--offscript',
        type: 'button',
        style: `--pq-i:${index}`,
        aria: { keyshortcuts: String(index + 1) },
        on: { click: () => onSelect(index) },
      },
      [
        el('span', { class: 'pq-tile__quill', html: Icons.quill, aria: { hidden: true } }),
        el('span', { class: 'pq-tile__off' }, [
          el('span', { class: 'pq-tile__offlabel', text: 'say your own words' }),
          el('span', { class: 'pq-tile__text', text: smartQuotes(opt.text) }),
        ]),
        el('span', { class: 'pq-tile__num pq-tile__num--off', text: index + 1, aria: { hidden: true } }),
      ],
    );
  }

  hide(): void {
    this.root.hidden = true;
    this.root.classList.remove('is-in', 'is-choosing');
    clear(this.listEl);
    clear(this.offEl);
    this.tiles = [];
  }

  destroy(): void {
    this.root.remove();
  }
}

function meter(label: string, value: number, readout: string): HTMLElement {
  return el('div', { class: 'pq-meter' }, [
    el('span', { class: 'pq-meter__label', text: label }),
    el('span', { class: 'pq-meter__track' }, [
      el('span', { class: 'pq-meter__fill', style: `--v:${Math.round(value * 100)}%` }),
    ]),
    el('span', { class: 'pq-meter__val', text: readout }),
  ]);
}

function buildWave(bars: number): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (let i = 0; i < bars; i++) {
    const t = i / Math.max(1, bars - 1);
    const envelope = Math.sin(Math.PI * t) ** 0.72;
    const syllable = 0.28 + 0.72 * Math.abs(Math.sin(i * 0.71 + 0.42));
    const grain = 0.52 + 0.48 * Math.abs(Math.sin(i * 2.17 + 1.3) * Math.cos(i * 1.09 + 0.6));
    const amplitude = Math.min(1, Math.max(0.08, envelope * syllable * grain));
    out.push(el('span', {
      class: 'pq-wave__bar',
      style:
        `--d:${(i % 7) * 90 + (i % 3) * 41}ms;` +
        `--h:${Math.round(24 + amplitude * 72)}%;--i:${Math.round(10 + amplitude * 24)}%`,
    }));
  }
  return out;
}
