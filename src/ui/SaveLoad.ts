/**
 * SaveLoad — slot grid with canvas thumbnails.
 *
 * A fixed grid of slots overlaid with whatever `host.listSaves()` reports. In
 * save mode, empty slots invite a write and filled slots offer overwrite/delete;
 * in load mode only filled slots are actionable. Each filled slot shows the
 * stage thumbnail, story title, the moment's label and a friendly timestamp.
 */
import type { AppHost, SaveSlotInfo } from '../core/types';
import { clear, el, formatWhen, Icons, overlayShell } from './dom';

export type SaveLoadMode = 'save' | 'load';
const SLOT_COUNT = 6;

export class SaveLoad {
  readonly overlay: HTMLElement;
  readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private readonly setTitle: (t: string) => void;
  private readonly host: AppHost;
  private readonly onAfterAction: () => void;
  private mode: SaveLoadMode = 'save';

  constructor(parent: HTMLElement, host: AppHost, onClose: () => void, onAfterAction: () => void) {
    this.host = host;
    this.onAfterAction = onAfterAction;
    const shell = overlayShell('Save', { wide: true, onClose, kicker: 'Slots' });
    this.overlay = shell.overlay;
    this.panel = shell.panel;
    this.body = shell.body;
    this.setTitle = shell.setTitle;
    parent.appendChild(this.overlay);
  }

  open(mode: SaveLoadMode): void {
    this.mode = mode;
    this.setTitle(mode === 'save' ? 'Save' : 'Load');
    this.render();
  }

  private render(): void {
    clear(this.body);
    const saves = new Map<number, SaveSlotInfo>();
    for (const s of this.host.listSaves()) saves.set(s.slot, s);

    const grid = el('div', { class: 'pq-slots' });
    for (let i = 1; i <= SLOT_COUNT; i++) {
      grid.appendChild(this.buildSlot(i, saves.get(i)));
    }
    this.body.appendChild(grid);
  }

  private buildSlot(slot: number, info: SaveSlotInfo | undefined): HTMLElement {
    const filled = !!info;
    const loadDisabled = this.mode === 'load' && !filled;

    const thumb = el('div', { class: 'pq-slot__thumb', aria: { hidden: true } });
    if (info?.thumbnail) {
      thumb.appendChild(
        el('img', { attrs: { src: info.thumbnail, alt: '' }, class: 'pq-slot__img' }),
      );
    } else {
      thumb.classList.add('is-empty');
      thumb.appendChild(el('span', { class: 'pq-slot__ph', text: filled ? '' : 'empty' }));
    }

    const meta = el('div', { class: 'pq-slot__meta' }, [
      el('span', { class: 'pq-slot__idx', text: `Slot ${slot}`, aria: { hidden: true } }),
      el('span', {
        class: 'pq-slot__story',
        text: info ? info.storyTitle : this.mode === 'save' ? 'Save here' : 'Empty',
      }),
      el('span', { class: 'pq-slot__label', text: info?.label ?? '' }),
      el('span', { class: 'pq-slot__when', text: info ? formatWhen(info.savedAt) : '' }),
    ]);

    const card = el(
      'button',
      {
        class: 'pq-slot' + (filled ? ' is-filled' : ' is-empty'),
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
