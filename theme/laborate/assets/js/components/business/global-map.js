/**
 * C-96.16 — Interactive Global Presence Map
 *
 * Reusable amCharts 5 world map for the Business / Global domain.
 *
 * Data-source agnostic:
 *   - Reads from `data-map-src` attribute on the container element (JSON endpoint).
 *   - If `window.laborateGlobalPresence` is set (via wp_localize_script), that
 *     takes priority — no fetch needed. WordPress integration is zero-touch.
 *
 * WordPress usage:
 *   wp_localize_script('laborate-global-map', 'laborateGlobalPresence', $data);
 */

const CDN = 'https://cdn.amcharts.com/lib/5/';
const SCRIPTS = [
  CDN + 'index.js',
  CDN + 'map.js',
  CDN + 'geodata/worldLow.js',
  CDN + 'themes/Animated.js',
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error(`Script load failed: ${src}`));
    document.head.appendChild(el);
  });
}

async function loadAmCharts() {
  for (const src of SCRIPTS) await loadScript(src);
}

class GlobalPresenceMap {
  constructor(container, filterEl, popupEl) {
    this.container = container;
    this.filterEl  = filterEl;
    this.popupEl   = popupEl;
    this.root         = null;
    this.pointSeries  = null;
    this.allData      = [];
  }

  async init() {
    try {
      await loadAmCharts();
      this.allData = await this._fetchData();
      this._hideLoader();
      this._render();
      this._bindFilters();
      this._bindPopupClose();
    } catch (err) {
      console.warn('[GlobalPresenceMap]', err.message);
      this._showError();
    }
  }

  async _fetchData() {
    if (window.laborateGlobalPresence) return window.laborateGlobalPresence;
    const url = this.container.dataset.mapSrc;
    if (!url) throw new Error('No data-map-src attribute on container.');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
    return res.json();
  }

  _hideLoader() {
    const el = this.container.querySelector('.glo-ammap-loader');
    if (el) el.hidden = true;
  }

  _showError() {
    const el = this.container.querySelector('.glo-ammap-loader');
    if (el) {
      el.hidden = false;
      el.innerHTML = '<p class="glo-ammap-error-text">Map could not be loaded. Please refresh the page.</p>';
    }
  }

  _render() {
    /* global am5, am5map, am5geodata_worldLow, am5themes_Animated */
    const root = am5.Root.new(this.container.id);
    root.setThemes([am5themes_Animated.new(root)]);
    this.root = root;

    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        projection:   am5map.geoNaturalEarth1(),
        panX:         'rotateX',
        panY:         'translateY',
        minZoomLevel: 0.9,
        maxZoomLevel: 8,
        wheelY:       'zoom',
      })
    );

    // Ocean fill
    chart.set('background', am5.Rectangle.new(root, {
      fill: am5.color(0xd5e7f7),
      fillOpacity: 1,
    }));

    // Land polygons
    const polygons = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: am5geodata_worldLow,
        exclude: ['AQ'],
      })
    );
    polygons.mapPolygons.template.setAll({
      fill:        am5.color(0xecf1f8),
      stroke:      am5.color(0xffffff),
      strokeWidth: 0.6,
      interactive: false,
    });

    // Marker series
    this.pointSeries = chart.series.push(
      am5map.MapPointSeries.new(root, {
        latitudeField:  'lat',
        longitudeField: 'lng',
      })
    );

    const self = this;
    this.pointSeries.bullets.push(function(bulletRoot, _series, dataItem) {
      const container = am5.Container.new(bulletRoot, { layer: 30 });

      // Pulsing ring
      const pulse = container.children.push(am5.Circle.new(bulletRoot, {
        radius:       6,
        fillOpacity:  0,
        strokeOpacity: 0,
        stroke:       am5.color(0x0d57a2),
        strokeWidth:  1.5,
      }));
      pulse.animate({ key: 'radius',        from: 6, to: 22, duration: 2000, loops: Infinity, easing: am5.ease.out(am5.ease.cubic) });
      pulse.animate({ key: 'strokeOpacity', from: 0.6, to: 0, duration: 2000, loops: Infinity });

      // Core dot
      const dot = container.children.push(am5.Circle.new(bulletRoot, {
        radius:          5,
        fill:            am5.color(0x001844),
        stroke:          am5.color(0xffffff),
        strokeWidth:     1.5,
        cursorOverStyle: 'pointer',
        tooltipText:     '{title}',
      }));

      dot.events.on('click', function() {
        if (dataItem && dataItem.dataContext) self._showPopup(dataItem.dataContext);
      });

      return am5.Bullet.new(bulletRoot, { sprite: container });
    });

    // Zoom controls
    chart.set('zoomControl', am5map.ZoomControl.new(root, {}));

    this._updateMarkers(this.allData);
  }

  _updateMarkers(data) {
    if (this.pointSeries) this.pointSeries.data.setAll(data);
  }

  _showPopup(ctx) {
    if (!this.popupEl) return;

    const q = (sel) => this.popupEl.querySelector(sel);

    q('[data-popup-country]').textContent = ctx.title || ctx.country || '';

    const cat = q('[data-popup-category]');
    cat.textContent = ctx.category || '';

    const desc = q('[data-popup-description]');
    desc.textContent = ctx.description || '';
    desc.hidden = !ctx.description;

    const link = q('[data-popup-link]');
    if (ctx.url) {
      link.href    = ctx.url;
      link.hidden  = false;
    } else {
      link.hidden = true;
    }

    this.popupEl.hidden = false;
    this.popupEl.removeAttribute('hidden');
    const focusTarget = q('[data-popup-country]');
    if (focusTarget) focusTarget.focus();
  }

  _bindFilters() {
    if (!this.filterEl) return;
    this.filterEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      const filter = btn.dataset.filter;
      this.filterEl.querySelectorAll('[data-filter]').forEach((b) => {
        const active = b === btn;
        b.classList.toggle('glo-ammap-filter-btn--active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      const filtered = filter === 'all'
        ? this.allData
        : this.allData.filter((d) => d.category === filter);
      this._updateMarkers(filtered);
    });
  }

  _bindPopupClose() {
    if (!this.popupEl) return;
    const btn = this.popupEl.querySelector('.glo-ammap-popup-close');
    if (btn) btn.addEventListener('click', () => { this.popupEl.hidden = true; });
  }

  destroy() {
    if (this.root) { this.root.dispose(); this.root = null; }
  }
}

// ── Self-initialise when container is present ────────────────────────────────

const container = document.getElementById('glo-ammap');
if (container) {
  const filterEl = document.getElementById('glo-ammap-filters');
  const popupEl  = document.getElementById('glo-ammap-popup');
  const map      = new GlobalPresenceMap(container, filterEl, popupEl);

  // Lazy-init: start loading amCharts only when map scrolls into view
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      map.init();
    },
    { rootMargin: '200px 0px' }
  );
  observer.observe(container);
}
