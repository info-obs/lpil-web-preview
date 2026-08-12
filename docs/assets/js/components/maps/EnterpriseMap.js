/**
 * C-96.20 — Enterprise Mapping Platform v1.0
 *
 * One reusable mapping platform for the entire website.
 * All business logic is in the pipeline (GeoResolver → Aggregator).
 * This file only orchestrates rendering.
 *
 * Prerequisites (resolved before construction):
 *   1. amCharts CDN scripts loaded as static <script> tags
 *   2. await mapBootstrap.init({ dataPath, datasets, themes, background })
 *
 * Configuration schema:
 *   {
 *     container:        '#emap-global',          // required
 *     dataset:          'EXPORTS',               // single dataset (or use datasets[])
 *     datasets:         ['EXPORTS','DISTRIBUTION'], // multi-dataset → filter bar
 *     viewLevel:        { type: 'GLOBAL', value: '001' }, // or { type: 'COUNTRY', value: 'IND' }
 *     aggregation:      { enabled: true, type: 'COUNTRY' }, // COUNTRY | PROVINCE | CITY
 *     showCluster:      true,
 *     interactive:      false,                   // false → overlay blocks all interaction
 *     animationProfile: 'PULSE',                 // PULSE | NONE
 *     themeProfile:     'homepage',
 *   }
 *
 * WordPress readiness:
 *   Supply window.laborateMapDatasets[uid] and window.laborateMapThemes[id]
 *   via wp_localize_script to bypass fetch(). Page HTML stays identical.
 */

import { mapBootstrap } from './MapBootstrap.js';
import MapFactory       from './MapFactory.js';
import RendererAdapter  from './RendererAdapter.js';
import ThemeManager     from './ThemeManager.js';

export default class EnterpriseMap {
  constructor(config) {
    this.config = config;

    const el = typeof config.container === 'string'
      ? document.querySelector(config.container)
      : config.container;

    if (!el) {
      console.error('[EnterpriseMap] Container not found:', config.container);
      return;
    }

    this.container   = el;
    this.wrap        = null;
    this.popupEl     = null;
    this.filterEl    = null;
    this.root        = null;
    this.chart       = null;
    this.series      = null;
    this.activeUid   = null;

    // Config normalisation
    this._viewLevel   = config.viewLevel  || { type: 'GLOBAL', value: '001' };
    this._aggregation = config.aggregation || { enabled: true, type: 'COUNTRY' };
    this._interactive = config.interactive === true;

    // Resolve dataset UIDs
    this._uids = Array.isArray(config.datasets) && config.datasets.length
      ? config.datasets
      : config.dataset
        ? [config.dataset]
        : [];

    if (!this._uids.length) {
      console.error('[EnterpriseMap] No dataset specified in config.');
      return;
    }

    this.activeUid = config.dataset || this._uids[0];

    // Validate critical dataset is ready
    if (!mapBootstrap.isReady(this.activeUid)) {
      console.error(`[EnterpriseMap] Dataset "${this.activeUid}" not ready. Include in mapBootstrap.init() datasets.`);
      this._showError('Map data not available.');
      return;
    }

    // Validate theme
    const themeId = config.themeProfile || 'global';
    this._themeData = mapBootstrap.getTheme(themeId);
    if (!this._themeData) {
      console.error(`[EnterpriseMap] Theme "${themeId}" not ready. Include in mapBootstrap.init() themes.`);
      return;
    }

    // Render synchronously — all async work done before constructor
    this._render();
  }

  /* ── DOM helpers ─────────────────────────────────────────────────────── */

  _wrapContainer() {
    const wrap = document.createElement('div');
    wrap.className = 'emap-wrap';
    this.container.parentNode.insertBefore(wrap, this.container);
    wrap.appendChild(this.container);
    this.wrap = wrap;
  }

  /* ── Render ──────────────────────────────────────────────────────────── */

  _render() {
    this.container.setAttribute('aria-label', 'Interactive map');
    this._wrapContainer();

    // Create amCharts chart
    const mapType = mapBootstrap.mapTypeFor(this._viewLevel);
    const interactionMode = this._interactive ? 'interactive' : 'overview';
    const { root, chart, polygonSeries } = MapFactory.createChart(
      this.container.id, mapType, interactionMode
    );
    this.root  = root;
    this.chart = chart;

    // Apply theme colours to polygons
    ThemeManager.apply(this._themeData, root, chart, polygonSeries);

    // Create marker series (empty — data set below)
    this.series = RendererAdapter.create(root, chart, this._themeData, this.config, {
      onMarkerClick: this._interactive ? (ctx) => this._showPopup(ctx) : null,
    });

    // Load initial markers from cache
    this.series.data.setAll(this._getMarkers(this.activeUid));

    // Interaction-blocking overlay for non-interactive maps
    if (!this._interactive) {
      const overlay = document.createElement('div');
      overlay.className = 'emap-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      this.wrap.appendChild(overlay);
    }

    // Filter bar for multi-dataset maps
    if (this._uids.length > 1) this._renderFilterBar();

    // Popup for interactive maps
    if (this._interactive) this._renderPopup();
  }

  /* ── Data ────────────────────────────────────────────────────────────── */

  _getMarkers(uid) {
    const filterCountry = this._viewLevel.type === 'COUNTRY'
      ? this._viewLevel.value
      : null;

    const aggType = this._aggregation.enabled
      ? (this._aggregation.type || 'COUNTRY')
      : 'CITY';

    return mapBootstrap.aggregate(uid, aggType, filterCountry);
  }

  _updateMarkers(uid) {
    if (!this.series) return;

    if (!mapBootstrap.isReady(uid)) {
      // Dataset still loading from Phase 2 — set markers when ready
      mapBootstrap.onDatasetReady(uid, () => this._updateMarkers(uid));
      return;
    }

    this.series.data.setAll(this._getMarkers(uid));
    this.activeUid = uid;

    // Sync filter button state
    if (this.filterEl) {
      this.filterEl.querySelectorAll('[data-emap-filter]').forEach(btn => {
        const active = btn.dataset.emapFilter === uid;
        btn.classList.toggle('emap-filter-btn--active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    if (this.popupEl) this.popupEl.hidden = true;
  }

  /* ── Filter bar ──────────────────────────────────────────────────────── */

  _renderFilterBar() {
    const bar = document.createElement('div');
    bar.className = 'emap-filters';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Filter map by dataset');

    const labelEl = document.createElement('span');
    labelEl.className   = 'emap-filters-label';
    labelEl.textContent = 'Filter:';
    bar.appendChild(labelEl);

    for (const uid of this._uids) {
      const ds     = mapBootstrap.getDataset(uid);
      const active = uid === this.activeUid;
      const ready  = mapBootstrap.isReady(uid);

      const btn = document.createElement('button');
      btn.type               = 'button';
      btn.className          = 'emap-filter-btn' + (active ? ' emap-filter-btn--active' : '');
      btn.textContent        = ds?.title || uid;
      btn.dataset.emapFilter = uid;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');

      if (!ready) {
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        mapBootstrap.onDatasetReady(uid, () => {
          const loadedDs = mapBootstrap.getDataset(uid);
          if (loadedDs?.title) btn.textContent = loadedDs.title;
          btn.disabled = false;
          btn.removeAttribute('aria-busy');
        });
      }

      bar.appendChild(btn);
    }

    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-emap-filter]');
      if (!btn || btn.disabled) return;
      this._updateMarkers(btn.dataset.emapFilter);
    });

    this.filterEl = bar;
    // Insert BEFORE .emap-wrap so it sits outside the positioned stacking context
    this.wrap.parentNode.insertBefore(bar, this.wrap);
  }

  /* ── Popup ───────────────────────────────────────────────────────────── */

  _renderPopup() {
    const popup = document.createElement('div');
    popup.className = 'emap-popup';
    popup.setAttribute('hidden', '');
    popup.setAttribute('aria-live', 'polite');
    popup.setAttribute('aria-atomic', 'true');
    popup.innerHTML = `
      <div class="emap-popup-inner">
        <div class="emap-popup-content">
          <p class="emap-popup-label" tabindex="-1"></p>
          <span class="emap-popup-type"></span>
          <p class="emap-popup-detail" hidden></p>
        </div>
        <div class="emap-popup-actions">
          <button class="emap-popup-close" type="button" aria-label="Close detail">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                 width="14" height="14" aria-hidden="true" focusable="false">
              <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>`;

    popup.querySelector('.emap-popup-close').addEventListener('click', () => {
      popup.hidden = true;
    });

    this.wrap.appendChild(popup);
    this.popupEl = popup;
  }

  _showPopup(ctx) {
    if (!this.popupEl) return;

    this.popupEl.querySelector('.emap-popup-label').textContent = ctx.label || '';

    // Type line: dataset title or type
    const ds   = mapBootstrap.getDataset(ctx.uid);
    const type = ds?.title || ctx.uid || '';
    this.popupEl.querySelector('.emap-popup-type').textContent = type;

    // Detail line: count summary if aggregated
    const detail = this.popupEl.querySelector('.emap-popup-detail');
    if (ctx.count > 1) {
      detail.textContent = `${ctx.count} locations`;
      detail.hidden      = false;
    } else {
      detail.hidden = true;
    }

    this.popupEl.removeAttribute('hidden');
    this.popupEl.hidden = false;
    this.popupEl.querySelector('.emap-popup-label').focus();
  }

  /* ── Error ───────────────────────────────────────────────────────────── */

  _showError(msg) {
    this.container.innerHTML =
      `<p class="emap-error-text" style="padding:2rem;text-align:center;color:#888">${msg}</p>`;
  }

  /* ── Lifecycle ───────────────────────────────────────────────────────── */

  destroy() {
    if (this.root) {
      this.root.dispose();
      this.root = null;
    }
    if (this.filterEl?.parentNode) {
      this.filterEl.parentNode.removeChild(this.filterEl);
    }
  }
}

// WordPress / global-script compatibility
window.EnterpriseMap = EnterpriseMap;
