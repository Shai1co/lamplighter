/**
 * SaveLoad — slot grid with canvas thumbnails.
 *
 * A fixed grid of slots overlaid with whatever `host.listSaves()` reports. In
 * save mode, empty slots invite a write and filled slots offer overwrite/delete;
 * in load mode only filled slots are actionable.
 *
 * Empty and filled slots share ONE record structure — story line, chapter line,
 * timestamp — with em-dashes standing in for the fields a blank slot has not
 * filled yet. Six repetitions of a chirpy "Save here" read as untemplated dummy
 * copy in a captured frame; a redacted record reads as a save system.
 */
import type { AppHost, SaveSlotInfo } from '../core/types';
import { clear, el, formatWhen, Icons, overlayShell } from './dom';

export type SaveLoadMode = 'save' | 'load';
const SLOT_COUNT = 6;
/** The blank field mark. One glyph, used everywhere a record has no value. */
const BLANK = '—';

/** Hairline plus — the write affordance on an empty plate. Thinner stroke than
 *  the icon set so it sits at watermark weight rather than reading as a button. */
const PLUS_GLYPH =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.15"' +
  ' stroke-linecap="round" aria-hidden="true"><path d="M12 5.6v12.8"/><path d="M5.6 12h12.8"/></svg>';

export class SaveLoad {
  readonly overlay: HTMLElement;
  readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private readonly setTitle: (t: string) => void;
  private readonly host: AppHost;
  private readonly onAfterAction: () => void;
  /** Input-hint rail pinned to the panel's bottom edge. */
  private readonly hintAction: HTMLElement;
  private readonly count: HTMLElement;
  private mode: SaveLoadMode = 'save';

  constructor(parent: HTMLElement, host: AppHost, onClose: () => void, onAfterAction: () => void) {
    this.host = host;
    this.onAfterAction = onAfterAction;
    const shell = overlayShell('Save', { wide: true, onClose, kicker: 'Slots' });
    this.overlay = shell.overlay;
    this.panel = shell.panel;
    this.body = shell.body;
    this.setTitle = shell.setTitle;
    // Tightens the header-to-grid gap; the etched rule under the title already
    // does the separating, so a full 22px of air under it just floats the grid.
    this.body.classList.add('pq-modal__body--slots');

    this.hintAction = SaveLoad.hintLabel('Save');
    this.count = el('span', { class: 'pq-modal__count' });
    this.panel.appendChild(
      el('div', { class: 'pq-modal__foot' }, [
        el('div', { class: 'pq-hints' }, [
          SaveLoad.hint('Tab', SaveLoad.hintLabel('Slot')),
          SaveLoad.hint('Enter', this.hintAction),
          SaveLoad.hint('Esc', SaveLoad.hintLabel('Back')),
        ]),
        this.count,
      ]),
    );

    parent.appendChild(this.overlay);
  }

  /** `[Key] Label` — bracketed mono, the same tracked face as the SLOTS eyebrow. */
  private static hint(key: string, label: HTMLElement): HTMLElement {
    return el('span', { class: 'pq-hint' }, [
      el('span', { class: 'pq-hint__k', text: key, aria: { hidden: true } }),
      label,
    ]);
  }

  private static hintLabel(text: string): HTMLElement {
    return el('span', { class: 'pq-hint__l', text });
  }

  open(mode: SaveLoadMode): void {
    this.mode = mode;
    this.setTitle(mode === 'save' ? 'Save' : 'Load');
    this.hintAction.textContent = mode === 'save' ? 'Save' : 'Load';
    this.render();
  }

  private render(): void {
    clear(this.body);
    const saves = new Map<number, SaveSlotInfo>();
    for (const s of this.host.listSaves()) saves.set(s.slot, s);

    // The slot a bare Enter would act on: the first writable blank when saving,
    // the first written slot when loading. Marked so the still frame carries a
    // live selection instead of six identical resting cards.
    let cursor = 0;
    for (let i = 1; i <= SLOT_COUNT; i++) {
      if (this.mode === 'save' ? !saves.has(i) : saves.has(i)) {
        cursor = i;
        break;
      }
    }

    const grid = el('div', { class: 'pq-slots' });
    for (let i = 1; i <= SLOT_COUNT; i++) {
      grid.appendChild(this.buildSlot(i, saves.get(i), i === cursor));
    }
    this.body.appendChild(grid);
    this.count.textContent = `${saves.size} / ${SLOT_COUNT} used`;
  }

  private buildSlot(slot: number, info: SaveSlotInfo | undefined, cursor: boolean): HTMLElement {
    const filled = !!info;
    const loadDisabled = this.mode === 'load' && !filled;

    const thumb = el('div', { class: 'pq-slot__thumb', aria: { hidden: true } });
    if (info?.thumbnail) {
      thumb.appendChild(
        el('img', { attrs: { src: info.thumbnail, alt: '' }, class: 'pq-slot__img' }),
      );
    } else {
      // Blank plate: a lit-centre vignette (CSS), the story sigil at watermark
      // strength behind it, and the affordance stack on top.
      thumb.classList.add('is-empty');
      thumb.appendChild(
        el('span', { class: 'pq-slot__mark', html: Icons.spark, aria: { hidden: true } }),
      );
      thumb.appendChild(
        el('span', { class: 'pq-slot__ph' }, [
          // No write affordance on a slot you cannot write to.
          this.mode === 'save'
            ? el('span', { class: 'pq-slot__plus', html: PLUS_GLYPH, aria: { hidden: true } })
            : null,
          el('span', { class: 'pq-slot__phtext', text: 'Empty' }),
        ]),
      );
    }

    // One record shape in every state: index + timestamp on the ledger line, the
    // story on the serif line, the chapter captioned beneath. An unwritten slot
    // is the same record with em-dashes in the value positions — never a sixth
    // repetition of a chirpy "Save here", which reads as untemplated dummy copy.
    const meta = el('div', { class: 'pq-slot__meta' }, [
      el('div', { class: 'pq-slot__row' }, [
        el('span', { class: 'pq-slot__idx', text: `Slot ${slot}`, aria: { hidden: true } }),
        el('span', { class: 'pq-slot__when', text: (info && formatWhen(info.savedAt)) || BLANK }),
      ]),
      el('span', {
        class: filled ? 'pq-slot__story' : 'pq-slot__story is-blank',
        text: info ? info.storyTitle : BLANK,
      }),
      el('span', { class: 'pq-slot__field' }, [
        el('span', { class: 'pq-slot__cap', text: 'Chapter', aria: { hidden: true } }),
        el('span', { class: 'pq-slot__label', text: info?.label || BLANK }),
      ]),
    ]);

    const card = el(
      'button',
      {
        class:
          'pq-slot' + (filled ? ' is-filled' : ' is-empty') + (cursor && !loadDisabled ? ' is-cursor' : ''),
        type: 'button',
        disabled: loadDisabled,
        aria: {
          label:
            (this.mode === 'save' ? 'Save to slot ' : 'Load slot ') +
            slot +
            (info ? `, ${info.storyTitle}, ${info.label}` : ', empty'),
        },
        on: { click: () => this.onSlotAction(slot, filled) },
      },
      [thumb, meta],
    );

    const wrap = el('div', { class: 'pq-slot__wrap' }, [card]);
    if (filled) {
      wrap.appendChild(
        el('button', {
          class: 'pq-iconbtn pq-slot__del',
          type: 'button',
          html: Icons.trash,
          title: 'Delete save',
          aria: { label: `Delete slot ${slot}` },
          on: {
            click: (e: Event) => {
              e.stopPropagation();
              this.host.deleteSlot(slot);
              this.render();
            },
          },
        }),
      );
    }
    return wrap;
  }

  private onSlotAction(slot: number, filled: boolean): void {
    if (this.mode === 'save') {
      this.host.saveToSlot(slot);
      this.render();
    } else if (filled) {
      this.host.loadFromSlot(slot);
      this.onAfterAction();
    }
  }

  destroy(): void {
    this.overlay.remove();
  }
}
