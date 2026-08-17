/**
 * ChoiceMenu — centered neutral choices (`>?` options) for non-proxy stories.
 *
 * Restrained, filmic list: hairline glass rows with a numbered hotkey, hover/focus
 * lift and a soft key-color edge. Distinct from the ProxyPanel so the Eliza proxy
 * mechanic stays visually special.
 */
import type { ResolvedChoice } from '../core/types';
import { clear, el } from './dom';
import type { SelectHandler } from './ProxyPanel';

export class ChoiceMenu {
  readonly root: HTMLElement;
  private readonly listEl: HTMLElement;
  private rows: HTMLElement[] = [];

  constructor(parent: HTMLElement) {
    this.listEl = el('div', { class: 'pq-choices__list', role: 'list' });
    this.root = el(
      'section',
      {
        class: 'pq-choices',
        role: 'group',
        aria: { label: 'Choices' },
        hidden: true,
      },
      [this.listEl],
    );
    parent.appendChild(this.root);
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }

  show(options: ResolvedChoice[], onSelect: SelectHandler): HTMLElement[] {
    clear(this.listEl);
    this.rows = options.map((opt, i) => {
      const row = el(
        'button',
        {
          class: 'pq-choice',
          type: 'button',
          role: 'listitem',
          style: `--pq-i:${i}`,
          aria: { keyshortcuts: String(i + 1) },
          on: { click: () => onSelect(i) },
        },
        [
          el('span', { class: 'pq-choice__num', text: i + 1, aria: { hidden: true } }),
          el('span', { class: 'pq-choice__text', text: opt.text }),
        ],
      );
      this.listEl.appendChild(row);
      return row;
    });

    this.root.hidden = false;
    requestAnimationFrame(() => this.root.classList.add('is-in'));
    return this.rows;
  }

  hide(): void {
    this.root.hidden = true;
    this.root.classList.remove('is-in');
    clear(this.listEl);
    this.rows = [];
  }

  destroy(): void {
    this.root.remove();
  }
}
