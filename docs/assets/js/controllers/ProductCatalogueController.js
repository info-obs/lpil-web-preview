/**
 * ProductCatalogueController — PRODUCT-001-P2
 *
 * Handles the interactive layer of the Product Catalogue discovery page.
 * No live filtering is implemented — all filter interactions are visual-only
 * in the static HTML phase. Full AJAX filtering is deferred to WPF-010.
 *
 * Responsibilities:
 *  1. Sticky search bar (IntersectionObserver on hero)
 *  2. View toggle: card ↔ list (data-view attribute on .pcat-grid)
 *  3. Filter group accordions (expand/collapse)
 *  4. Mobile filter drawer (open/close/focus-trap)
 *  5. Search field clear button
 *  6. Active filter chips from URL params (read-only in static phase)
 *  7. Alphabet filter single-select
 *  8. Quick filter toggle state
 */

class ProductCatalogueController {
  constructor() {
    this.hero       = document.querySelector('.pcat-hero');
    this.search     = document.getElementById('pcatSearch');
    this.grid       = document.getElementById('pcatGrid');
    this.sidebar    = document.getElementById('pcatSidebar');
    this.drawer     = document.getElementById('pcatDrawer');
    this.chips      = document.getElementById('pcatChips');
    this.filterBtn  = document.getElementById('pcatFilterBtn');
    this.drawerClose = document.getElementById('pcatDrawerClose');
    this.drawerOverlay = this.drawer?.querySelector('.pcat-drawer-overlay');
    this.viewBtns   = document.querySelectorAll('[data-view-btn]');
    this.sortSelect = document.getElementById('pcatSort');
    this.searchInput = document.getElementById('pcatSearchInput');
    this.clearBtn   = document.getElementById('pcatClearSearch');
    this.filterToggles = document.querySelectorAll('.pcat-filter-toggle');
    this.quickBtns  = document.querySelectorAll('.pcat-quick-btn');
    this.alphaBtns  = document.querySelectorAll('.pcat-alpha-btn');
    this.clearAllBtns = document.querySelectorAll('.pcat-clear-all, .pcat-chip-clear-all');

    this._previousFocus = null;

    this.init();
  }

  init() {
    this.initStickySearch();
    this.initViewToggle();
    this.initFilterGroups();
    this.initDrawer();
    this.initSearch();
    this.initFilterCheckboxes();
    this.initQuickFilters();
    this.initAlphaFilter();
    this.initClearAll();
    this.initURLParams();
  }

  /* -------------------------------------------------------------------------
     1. Sticky Search Bar
     Adds .pcat-search--stuck when the hero section leaves the viewport.
  ------------------------------------------------------------------------- */
  initStickySearch() {
    if (!this.hero || !this.search) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        this.search.classList.toggle('pcat-search--stuck', !entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    );

    obs.observe(this.hero);
  }

  /* -------------------------------------------------------------------------
     2. View Toggle (Card ↔ List)
  ------------------------------------------------------------------------- */
  initViewToggle() {
    this.viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.viewBtn;
        if (!view || !this.grid) return;

        this.viewBtns.forEach(b => {
          b.classList.toggle('pcat-view-btn--active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });

        this.grid.setAttribute('data-view', view);
        sessionStorage.setItem('pcat-view', view);
      });
    });

    // Restore saved view preference
    const saved = sessionStorage.getItem('pcat-view');
    if (saved && this.grid) {
      this.grid.setAttribute('data-view', saved);
      this.viewBtns.forEach(b => {
        const isActive = b.dataset.viewBtn === saved;
        b.classList.toggle('pcat-view-btn--active', isActive);
        b.setAttribute('aria-pressed', String(isActive));
      });
    }
  }

  /* -------------------------------------------------------------------------
     3. Filter Group Accordions
  ------------------------------------------------------------------------- */
  initFilterGroups() {
    this.filterToggles.forEach(toggle => {
      const group = toggle.closest('.pcat-filter-group');
      if (!group) return;

      toggle.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!isOpen));
        group.classList.toggle('pcat-filter-group--open', !isOpen);
      });
    });
  }

  /* -------------------------------------------------------------------------
     4. Mobile Filter Drawer
  ------------------------------------------------------------------------- */
  initDrawer() {
    if (!this.drawer) return;

    const open = () => {
      this._previousFocus = document.activeElement;
      this.drawer.classList.add('pcat-drawer--open');
      this.drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      this.drawerClose?.focus();
    };

    const close = () => {
      this.drawer.classList.remove('pcat-drawer--open');
      this.drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      this._previousFocus?.focus();
    };

    this.filterBtn?.addEventListener('click', open);
    this.drawerClose?.addEventListener('click', close);
    this.drawerOverlay?.addEventListener('click', close);

    this.drawer.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });

    // "Show Results" button in drawer footer closes drawer
    this.drawer.querySelector('[data-drawer-confirm]')?.addEventListener('click', close);
  }

  /* -------------------------------------------------------------------------
     5. Search Input Clear Button
  ------------------------------------------------------------------------- */
  initSearch() {
    if (!this.searchInput) return;

    const updateClear = () => {
      const hasValue = this.searchInput.value.length > 0;
      this.clearBtn?.classList.toggle('pcat-clear-btn--visible', hasValue);
    };

    this.searchInput.addEventListener('input', () => {
      updateClear();
      this._syncURL();
    });

    this.clearBtn?.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchInput.focus();
      updateClear();
      this._syncURL();
    });
  }

  /* -------------------------------------------------------------------------
     6. Filter Checkbox URL Sync
  ------------------------------------------------------------------------- */
  initFilterCheckboxes() {
    document.querySelectorAll('.pcat-option input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => this._syncURL());
    });
  }

  /* -------------------------------------------------------------------------
     7. Quick Filter Toggle Buttons
  ------------------------------------------------------------------------- */
  initQuickFilters() {
    this.quickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const isActive = btn.classList.contains('pcat-quick-btn--active');
        btn.classList.toggle('pcat-quick-btn--active', !isActive);
        btn.setAttribute('aria-pressed', String(!isActive));
        this._syncURL();
      });
    });
  }

  /* -------------------------------------------------------------------------
     7. A-Z Alphabet Filter (single-select)
  ------------------------------------------------------------------------- */
  initAlphaFilter() {
    this.alphaBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const isActive = btn.classList.contains('pcat-alpha-btn--active');

        // Deactivate all
        this.alphaBtns.forEach(b => {
          b.classList.remove('pcat-alpha-btn--active');
          b.setAttribute('aria-pressed', 'false');
        });

        if (!isActive) {
          btn.classList.add('pcat-alpha-btn--active');
          btn.setAttribute('aria-pressed', 'true');
        }
        this._syncURL();
      });
    });
  }

  /* -------------------------------------------------------------------------
     8. Clear All Filters
  ------------------------------------------------------------------------- */
  initClearAll() {
    this.clearAllBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Uncheck all filter checkboxes
        document.querySelectorAll('.pcat-option input[type="checkbox"]').forEach(cb => {
          cb.checked = false;
        });

        // Remove active state from all quick filter buttons
        this.quickBtns.forEach(b => {
          b.classList.remove('pcat-quick-btn--active');
          b.setAttribute('aria-pressed', 'false');
        });

        // Remove active alpha selection
        this.alphaBtns.forEach(b => {
          b.classList.remove('pcat-alpha-btn--active');
          b.setAttribute('aria-pressed', 'false');
        });

        // Remove all chips
        if (this.chips) {
          this.chips.querySelectorAll('.pcat-chip').forEach(c => c.remove());
        }

        // Remove has-active class from groups
        document.querySelectorAll('.pcat-filter-group--has-active').forEach(g => {
          g.classList.remove('pcat-filter-group--has-active');
        });

        // Clear search if applicable
        if (this.searchInput) {
          this.searchInput.value = '';
          this.clearBtn?.classList.remove('pcat-clear-btn--visible');
        }

        // Clear URL params — navigate to clean catalogue URL
        history.replaceState(null, '', window.location.pathname);
      });
    });
  }

  /* -------------------------------------------------------------------------
     URL Synchronisation — writes current filter state to browser address bar
     Uses replaceState so filter toggles don't pollute browser history.
  ------------------------------------------------------------------------- */
  _syncURL() {
    const params = new URLSearchParams();

    // Search query
    const q = this.searchInput?.value.trim();
    if (q) params.set('q', q);

    // Checked filter checkboxes
    document.querySelectorAll('.pcat-option input[type="checkbox"]:checked').forEach(cb => {
      const key = cb.dataset.filterKey;
      const val = cb.value;
      if (key && val) params.append(key, val);
    });

    // Active alpha filter
    const activeAlpha = document.querySelector('.pcat-alpha-btn--active');
    if (activeAlpha?.dataset.alpha) params.set('alpha', activeAlpha.dataset.alpha);

    const qs = params.toString();
    history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }

  /* -------------------------------------------------------------------------
     9. URL Parameter Bootstrap
     Reads current URL query params and activates matching filters / chips
     on page load. Supports: q, brand, therapy, division, dosage, market
  ------------------------------------------------------------------------- */
  initURLParams() {
    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;

    params.forEach((value, key) => {
      // Populate search field
      if (key === 'q' && this.searchInput) {
        this.searchInput.value = decodeURIComponent(value);
        this.clearBtn?.classList.add('pcat-clear-btn--visible');
        return;
      }

      // Restore alpha filter button
      if (key === 'alpha') {
        const alphaBtn = document.querySelector(`.pcat-alpha-btn[data-alpha="${value}"]`);
        if (alphaBtn) {
          alphaBtn.classList.add('pcat-alpha-btn--active');
          alphaBtn.setAttribute('aria-pressed', 'true');
        }
        return;
      }

      // Mark matching checkboxes as checked and open their group
      const checkbox = document.querySelector(
        `input[type="checkbox"][data-filter-key="${key}"][value="${value}"]`
      );
      if (checkbox) {
        checkbox.checked = true;
        const group = checkbox.closest('.pcat-filter-group');
        if (group) {
          group.classList.add('pcat-filter-group--open', 'pcat-filter-group--has-active');
          const toggle = group.querySelector('.pcat-filter-toggle');
          toggle?.setAttribute('aria-expanded', 'true');
        }
      }

      // Render chip
      this.appendChip(key, value);
    });
  }

  appendChip(key, value) {
    if (!this.chips) return;

    const label = this.formatChipLabel(key, value);
    const chip = document.createElement('span');
    chip.className = 'pcat-chip';
    chip.dataset.filterKey = key;
    chip.dataset.filterValue = value;
    chip.innerHTML = `${label}<button type="button" class="pcat-chip-remove" aria-label="Remove filter: ${label}">&times;</button>`;

    chip.querySelector('.pcat-chip-remove')?.addEventListener('click', () => {
      chip.remove();
      const checkbox = document.querySelector(
        `input[type="checkbox"][data-filter-key="${key}"][value="${value}"]`
      );
      if (checkbox) {
        checkbox.checked = false;
        const group = checkbox.closest('.pcat-filter-group');
        const remaining = group?.querySelectorAll('input:checked');
        if (remaining?.length === 0) {
          group.classList.remove('pcat-filter-group--has-active');
        }
      }
    });

    this.chips.insertBefore(chip, this.chips.querySelector('.pcat-chip-clear-all'));
  }

  formatChipLabel(key, value) {
    const labels = { brand: 'Brand', therapy: 'Therapy', division: 'Division', dosage: 'Dosage', market: 'Market' };
    const prefix = labels[key];
    const display = value.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return prefix ? `${prefix}: ${display}` : display;
  }
}

export default ProductCatalogueController;
