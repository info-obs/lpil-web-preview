/**
 * Aggregator — groups resolved location entries into map markers.
 *
 * Receives entries that have already been validated and coordinate-resolved.
 * Returns marker objects ready for the RendererAdapter.
 *
 * Aggregation levels:
 *   GLOBAL   — one marker per continent/region (use for summary views)
 *   COUNTRY  — one marker per country at its centroid
 *   PROVINCE — one marker per province at its centroid
 *   CITY     — individual point per entry
 *
 * Marker object shape:
 *   { lat, lng, label, count, country, province, city, region, uid, _source[] }
 */

import GeoResolver, { COUNTRY_NAMES, PROVINCE_NAMES } from './GeoResolver.js';

export default class Aggregator {
  /**
   * @param {object[]} resolvedLocations  — entries from MapBootstrap resolved cache
   * @param {string}   aggregationType   — 'GLOBAL' | 'COUNTRY' | 'PROVINCE' | 'CITY'
   * @param {string|null} filterCountry  — Alpha-3 code to restrict entries (e.g. 'IND')
   * @returns {object[]} marker objects
   */
  static aggregate(resolvedLocations, aggregationType, filterCountry = null) {
    let locs = resolvedLocations;

    if (filterCountry) {
      locs = locs.filter(l => l.country === filterCountry);
    }

    switch (aggregationType) {
      case 'PROVINCE': return this._byProvince(locs);
      case 'CITY':     return this._asPoints(locs);
      case 'GLOBAL':   // fall through — global view uses country-level markers
      case 'COUNTRY':
      default:         return this._byCountry(locs);
    }
  }

  /* ── Aggregation methods ─────────────────────────────────────────────── */

  static _byCountry(locs) {
    const groups = new Map();

    for (const loc of locs) {
      if (!loc.country) continue;
      if (!groups.has(loc.country)) {
        groups.set(loc.country, { locs: [] });
      }
      groups.get(loc.country).locs.push(loc);
    }

    const markers = [];
    for (const [country, group] of groups) {
      const coords = GeoResolver.countryCoords(country);
      if (!coords) continue;

      markers.push({
        lat:      coords.lat,
        lng:      coords.lng,
        label:    COUNTRY_NAMES[country] || country,
        count:    group.locs.length,
        country,
        province: '',
        city:     '',
        region:   group.locs[0]?.region || '',
        uid:      group.locs[0]?._uid   || '',
        _source:  group.locs,
      });
    }

    return markers;
  }

  static _byProvince(locs) {
    const groups = new Map();

    for (const loc of locs) {
      const key = loc.province || loc.country || '_unknown';
      if (!groups.has(key)) {
        groups.set(key, { locs: [], province: loc.province, country: loc.country });
      }
      groups.get(key).locs.push(loc);
    }

    const markers = [];
    for (const [key, group] of groups) {
      let coords = null;
      let label  = key;

      if (group.province) {
        coords = GeoResolver.provinceCoords(group.province);
        label  = PROVINCE_NAMES[group.province] || group.province;
      }
      if (!coords && group.country) {
        coords = GeoResolver.countryCoords(group.country);
        label  = COUNTRY_NAMES[group.country] || group.country;
      }

      // Fall back to first entry's resolved coordinates
      if (!coords && group.locs[0]) {
        const first = group.locs[0];
        coords = { lat: first.lat, lng: first.lng };
      }

      if (!coords) continue;

      markers.push({
        lat:      coords.lat,
        lng:      coords.lng,
        label,
        count:    group.locs.length,
        country:  group.country || '',
        province: group.province || '',
        city:     '',
        region:   group.locs[0]?.region || '',
        uid:      group.locs[0]?._uid   || '',
        _source:  group.locs,
      });
    }

    return markers;
  }

  static _asPoints(locs) {
    return locs
      .filter(loc => loc.lat !== undefined && loc.lng !== undefined)
      .map(loc => ({
        lat:      loc.lat,
        lng:      loc.lng,
        label:    loc.city || PROVINCE_NAMES[loc.province] || COUNTRY_NAMES[loc.country] || loc.province || loc.country || '',
        count:    1,
        country:  loc.country  || '',
        province: loc.province || '',
        city:     loc.city     || '',
        region:   loc.region   || '',
        uid:      loc._uid     || '',
        _source:  [loc],
      }));
  }
}
