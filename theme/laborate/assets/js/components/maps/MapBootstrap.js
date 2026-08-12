/**
 * MapBootstrap — application-level startup and data registry.
 *
 * Responsibilities:
 *   Phase 1 (critical path — blocks render):
 *     Validate amCharts globals → fetch critical datasets + themes →
 *     validate entries → resolve coordinates → build aggregation caches →
 *     resolve init() promise so EnterpriseMap instances can render.
 *
 *   Phase 2 (background — non-blocking):
 *     Fetch remaining datasets → validate + resolve → pre-build aggregation
 *     caches for all levels → notify waiting filter buttons via callbacks.
 *
 * Three-tier cache:
 *   _rawDatasets      Map<uid, rawJSON>
 *   _resolvedDatasets Map<uid, resolvedEntry[]>
 *   _aggregations     Map<`${uid}:${type}[:${country}]`, marker[]>
 *
 * WordPress readiness:
 *   window.laborateMapDatasets[uid] and window.laborateMapThemes[id] bypass
 *   fetch() in DataLoader — no other code changes required.
 */

import DataLoader  from './DataLoader.js';
import Validator   from './Validator.js';
import GeoResolver from './GeoResolver.js';
import Aggregator  from './Aggregator.js';

const AGGREGATION_LEVELS = ['COUNTRY', 'PROVINCE', 'CITY'];

class MapBootstrap {
  constructor() {
    this._rawDatasets      = new Map();  // uid  → raw JSON
    this._rawThemes        = new Map();  // id   → theme JSON
    this._resolvedDatasets = new Map();  // uid  → resolved entry[]
    this._aggregations     = new Map();  // key  → marker[]
    this._readyCallbacks   = new Map();  // uid  → callback[]
    this._phase1Promise    = null;
    this._phase2Promise    = null;
    this._dataPath         = null;
  }

  /**
   * Initialise the platform.
   *   datasets  — Phase 1: required before render (awaited)
   *   themes    — Phase 1: required before render (awaited)
   *   background — Phase 2: loaded silently after resolve
   */
  async init({ dataPath, datasets = [], themes = [], background = [] }) {
    this._dataPath = dataPath;

    if (!this._phase1Promise) {
      this._phase1Promise = this._phase1(dataPath, datasets, themes);
    }
    await this._phase1Promise;

    if (background.length && !this._phase2Promise) {
      this._phase2Promise = this._phase2(dataPath, background);
    }
  }

  /* ── Phase 1 — critical path ─────────────────────────────────────────── */

  async _phase1(dataPath, datasetUids, themeIds) {
    this._validateLibraries();

    await Promise.all([
      ...datasetUids.map(uid => this._fetchAndProcess(dataPath, uid)),
      ...themeIds.map(id  => this._fetchTheme(dataPath, id)),
    ]);
  }

  /* ── Phase 2 — background ────────────────────────────────────────────── */

  async _phase2(dataPath, datasetUids) {
    for (const uid of datasetUids) {
      try {
        await this._fetchAndProcess(dataPath, uid);
        // Pre-compute common aggregation caches for instant switching
        for (const level of AGGREGATION_LEVELS) {
          this._computeAggregation(uid, level, null);
        }
      } catch (err) {
        console.warn(`[MapBootstrap] Phase 2: failed to load "${uid}":`, err.message);
      }
    }
  }

  /* ── Data processing ─────────────────────────────────────────────────── */

  async _fetchAndProcess(dataPath, uid) {
    if (this._resolvedDatasets.has(uid)) return;

    const raw = await DataLoader.loadDataset(dataPath, uid);
    this._rawDatasets.set(uid, raw);

    const resolved = (raw.locations || [])
      .filter(loc => Validator.isValid(loc))
      .map(loc => {
        const coords = GeoResolver.resolve(loc);
        if (!coords) return null;
        return {
          lat:      coords.lat,
          lng:      coords.lng,
          city:     loc.city     || '',
          province: loc.province || '',
          country:  loc.country  || '',
          region:   loc.region   || '',
          _uid:     uid,
          _type:    raw.type || '',
        };
      })
      .filter(Boolean);

    this._resolvedDatasets.set(uid, resolved);

    // Notify any filter buttons waiting for this dataset
    const cbs = this._readyCallbacks.get(uid) || [];
    cbs.forEach(cb => cb());
    this._readyCallbacks.delete(uid);
  }

  async _fetchTheme(dataPath, id) {
    if (this._rawThemes.has(id)) return;
    const theme = await DataLoader.loadTheme(dataPath, id);
    this._rawThemes.set(id, theme);
  }

  /* ── Aggregation (cached) ────────────────────────────────────────────── */

  /**
   * Return pre-aggregated markers. Computes and caches on first call.
   * @param {string}      uid
   * @param {string}      aggregationType  'COUNTRY' | 'PROVINCE' | 'CITY' | 'GLOBAL'
   * @param {string|null} filterCountry    Alpha-3 code or null
   */
  aggregate(uid, aggregationType, filterCountry = null) {
    const key = filterCountry
      ? `${uid}:${aggregationType}:${filterCountry}`
      : `${uid}:${aggregationType}`;

    if (this._aggregations.has(key)) {
      return this._aggregations.get(key);
    }

    return this._computeAggregation(uid, aggregationType, filterCountry);
  }

  _computeAggregation(uid, aggregationType, filterCountry) {
    const key      = filterCountry ? `${uid}:${aggregationType}:${filterCountry}` : `${uid}:${aggregationType}`;
    const resolved = this._resolvedDatasets.get(uid);
    if (!resolved) return [];

    const result = Aggregator.aggregate(resolved, aggregationType, filterCountry);
    this._aggregations.set(key, result);
    return result;
  }

  /* ── Accessors ───────────────────────────────────────────────────────── */

  isReady(uid)    { return this._resolvedDatasets.has(uid); }
  getDataset(uid) { return this._rawDatasets.get(uid) || null; }
  getTheme(id)    { return this._rawThemes.get(id) || null; }

  /**
   * Fire callback when dataset is ready. If already ready, fires immediately.
   */
  onDatasetReady(uid, callback) {
    if (this.isReady(uid)) { callback(); return; }
    if (!this._readyCallbacks.has(uid)) this._readyCallbacks.set(uid, []);
    this._readyCallbacks.get(uid).push(callback);
  }

  /* ── Map type resolution ─────────────────────────────────────────────── */

  /**
   * Return 'WORLD' | 'INDIA' from a viewLevel config object.
   * Extensible: add entries here to support future country-level maps.
   */
  mapTypeFor(viewLevel) {
    if (viewLevel?.type === 'COUNTRY' && viewLevel?.value === 'IND') return 'INDIA';
    return 'WORLD';
  }

  /* ── Validation ──────────────────────────────────────────────────────── */

  _validateLibraries() {
    const missing = [];
    if (!window.am5)               missing.push('am5 (index.js)');
    if (!window.am5map)            missing.push('am5map (map.js)');
    if (!window.am5themes_Animated) missing.push('am5themes_Animated (themes/Animated.js)');
    if (missing.length) {
      throw new Error(
        `[MapBootstrap] Missing amCharts globals: ${missing.join(', ')}. ` +
        `Load CDN scripts before calling mapBootstrap.init().`
      );
    }
  }
}

export const mapBootstrap = new MapBootstrap();
export default MapBootstrap;
