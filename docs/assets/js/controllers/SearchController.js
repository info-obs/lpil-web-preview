/**
 * SearchController
 * Responsibilities:
 *  - Opens/closes the .search-overlay on nav search icon click
 *  - Focuses the search input on open
 *  - Clears input and closes on Escape
 *  - Scaffold for live product search (will call REST API in WordPress)
 */
import { $ } from '../utils/dom.js';

export class SearchController {
  constructor() {
    this.overlay = $('.search-overlay');
    this.panel   = $('.search-panel');
    this.input   = this.overlay?.querySelector('.input');
    this.trigger = $('.nav-search');
    this.clear   = this.overlay?.querySelector('.search-clear');
  }

  init() {
    if (!this.overlay) return;

    this.trigger?.addEventListener('click', () => this._open());

    // Close on overlay backdrop click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this._close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._close();
    });

    this.input?.addEventListener('input', () => {
      this.overlay?.classList.toggle('has-value', !!this.input.value);
    });

    this.clear?.addEventListener('click', () => {
      if (this.input) this.input.value = '';
      this.overlay?.classList.remove('has-value');
      this.input?.focus();
    });
  }

  _open() {
    this.overlay?.classList.add('open');
    this.input?.focus();
  }

  _close() {
    this.overlay?.classList.remove('open');
    if (this.input) this.input.value = '';
    this.overlay?.classList.remove('has-value');
  }
}
