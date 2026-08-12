/**
 * ManufacturingController.js
 *
 * Manages C-67 Facility Gallery behaviour on the plant detail page:
 *  - Category filtering: show/hide .c67-gallery-item by [data-category]
 *  - Lightbox: open on item click, prev/next navigation, ESC/overlay-click to close
 *  - Focus trap while lightbox is open (WCAG 2.1 SC 2.1.2)
 *  - Respects prefers-reduced-motion via CSS; JS animation classes are not added
 *
 * HTML contract (plant-detail.html):
 *   #galleryFilters           — group of .c67-filter-btn[data-filter]
 *   #facilityGallery          — .c67-gallery containing .c67-gallery-item[data-category][data-src][data-caption]
 *   #galleryLightbox          — .c67-lightbox[hidden] dialog container
 *   #lbImg, #lbCaption        — <img> and <p> inside lightbox
 *   #lbClose, #lbPrev, #lbNext — lightbox control buttons
 */
export class ManufacturingController {
  /** @type {HTMLElement|null} */ #gallery   = null;
  /** @type {HTMLElement[]}     */ #items     = [];
  /** @type {HTMLElement[]}     */ #visible   = [];
  /** @type {number}            */ #current   = 0;
  /** @type {HTMLElement|null} */ #lightbox  = null;
  /** @type {HTMLImageElement|null} */ #lbImg = null;
  /** @type {HTMLElement|null} */ #lbCaption = null;

  init() {
    this.#gallery   = document.getElementById('facilityGallery');
    this.#lightbox  = document.getElementById('galleryLightbox');

    if (!this.#gallery || !this.#lightbox) return;

    this.#items    = Array.from(this.#gallery.querySelectorAll('.c67-gallery-item'));
    this.#lbImg    = document.getElementById('lbImg');
    this.#lbCaption = document.getElementById('lbCaption');

    this.#initFilters();
    this.#initLightbox();
  }

  // ── FILTERS ──────────────────────────────────────────────────────────────

  #initFilters() {
    const filterGroup = document.getElementById('galleryFilters');
    if (!filterGroup) return;

    filterGroup.querySelectorAll('.c67-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.filter;

        filterGroup.querySelectorAll('.c67-filter-btn').forEach(b => {
          b.classList.remove('c67-filter-btn--active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('c67-filter-btn--active');
        btn.setAttribute('aria-pressed', 'true');

        this.#applyFilter(cat);
      });
    });

    this.#applyFilter('all');
  }

  #applyFilter(category) {
    this.#visible = [];

    this.#items.forEach(item => {
      const match = category === 'all' || item.dataset.category === category;
      item.hidden = !match;
      if (match) this.#visible.push(item);
    });
  }

  // ── LIGHTBOX ─────────────────────────────────────────────────────────────

  #initLightbox() {
    this.#items.forEach((item, idx) => {
      item.addEventListener('click', () => this.#open(idx));
    });

    document.getElementById('lbClose')?.addEventListener('click', () => this.#close());
    document.getElementById('lbPrev')?.addEventListener('click', () => this.#step(-1));
    document.getElementById('lbNext')?.addEventListener('click', () => this.#step(1));

    this.#lightbox.addEventListener('click', e => {
      if (e.target === this.#lightbox) this.#close();
    });

    document.addEventListener('keydown', e => {
      if (this.#lightbox.hidden) return;
      switch (e.key) {
        case 'Escape': this.#close(); break;
        case 'ArrowLeft':  this.#step(-1); break;
        case 'ArrowRight': this.#step(1);  break;
        case 'Tab': this.#trapFocus(e); break;
      }
    });
  }

  #open(itemIdx) {
    const item    = this.#items[itemIdx];
    this.#current = this.#visible.indexOf(item);
    if (this.#current === -1) this.#current = 0;

    this.#render(item);
    this.#lightbox.removeAttribute('hidden');
    this.#lightbox.removeAttribute('aria-hidden');

    document.body.style.overflow = 'hidden';
    document.getElementById('lbClose')?.focus();
  }

  #close() {
    this.#lightbox.hidden = true;
    this.#lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    const activeIdx = this.#items.indexOf(this.#visible[this.#current]);
    if (activeIdx > -1) this.#items[activeIdx].focus();
  }

  #step(dir) {
    if (this.#visible.length < 2) return;
    this.#current = (this.#current + dir + this.#visible.length) % this.#visible.length;
    this.#render(this.#visible[this.#current]);
  }

  #render(item) {
    if (!this.#lbImg || !this.#lbCaption) return;
    this.#lbImg.src     = item.dataset.src || '';
    this.#lbImg.alt     = item.querySelector('img')?.alt || '';
    this.#lbCaption.textContent = item.dataset.caption || '';

    const prev = document.getElementById('lbPrev');
    const next = document.getElementById('lbNext');
    if (prev) prev.hidden = this.#visible.length < 2;
    if (next) next.hidden = this.#visible.length < 2;
  }

  #trapFocus(e) {
    const focusable = Array.from(
      this.#lightbox.querySelectorAll('button:not([hidden]):not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

// Self-initialise when loaded as a standalone page-level module
const ctrl = new ManufacturingController();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ctrl.init());
} else {
  ctrl.init();
}
