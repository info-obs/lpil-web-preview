/**
 * AggregationEngine — auto-resolves the correct geographic level for a dataset
 * given the active map type, then returns marker-ready objects with resolved
 * coordinates.
 *
 * View levels:
 *   AUTO    → COUNTRY for WORLD maps; STATE/CITY for INDIA map
 *   COUNTRY → one marker per country (centroid-based)
 *   STATE   → one marker per state within the filtered geography
 *   CITY    → individual location markers
 */

const COUNTRY_CENTROIDS = {
  AF: { lat:  33.93, lng:  67.71 }, AZ: { lat:  40.14, lng:  47.58 },
  BD: { lat:  23.68, lng:  90.35 }, BO: { lat: -16.29, lng: -63.59 },
  BT: { lat:  27.51, lng:  90.43 }, CM: { lat:   3.85, lng:  11.50 },
  CO: { lat:   4.57, lng: -74.30 }, CZ: { lat:  49.82, lng:  15.47 },
  DZ: { lat:  28.03, lng:   1.66 }, DO: { lat:  18.74, lng: -70.16 },
  EC: { lat:  -1.83, lng: -78.18 }, ET: { lat:   9.15, lng:  40.49 },
  GH: { lat:   7.95, lng:  -1.02 }, IN: { lat:  20.59, lng:  78.96 },
  JO: { lat:  30.59, lng:  36.24 }, KE: { lat:  -0.02, lng:  37.91 },
  KG: { lat:  41.20, lng:  74.77 }, KH: { lat:  12.57, lng: 104.99 },
  KW: { lat:  29.31, lng:  47.48 }, KZ: { lat:  48.02, lng:  66.92 },
  LK: { lat:   7.87, lng:  80.77 }, LY: { lat:  26.34, lng:  17.23 },
  MA: { lat:  31.79, lng:  -7.09 }, MM: { lat:  21.92, lng:  95.96 },
  MN: { lat:  46.86, lng: 103.85 }, MV: { lat:   3.20, lng:  73.22 },
  MY: { lat:   3.14, lng: 101.69 }, NG: { lat:   9.08, lng:   8.68 },
  NP: { lat:  28.39, lng:  84.12 }, PE: { lat:  -9.19, lng: -75.02 },
  PH: { lat:  12.88, lng: 121.77 }, PL: { lat:  51.92, lng:  19.15 },
  RO: { lat:  45.94, lng:  24.97 }, SA: { lat:  23.89, lng:  45.08 },
  TJ: { lat:  38.86, lng:  71.28 }, TL: { lat:  -8.87, lng: 125.73 },
  TZ: { lat:  -6.37, lng:  34.89 }, AE: { lat:  24.47, lng:  54.37 },
  UZ: { lat:  41.38, lng:  64.59 }, VN: { lat:  14.06, lng: 108.28 },
  YE: { lat:  15.55, lng:  48.52 }, ZA: { lat: -28.47, lng:  24.68 },
};

const INDIA_STATE_CENTROIDS = {
  'Haryana':          { lat: 29.06, lng: 76.09 },
  'Himachal Pradesh': { lat: 31.10, lng: 77.17 },
  'Delhi':            { lat: 28.70, lng: 77.10 },
  'Uttar Pradesh':    { lat: 26.85, lng: 80.91 },
  'Rajasthan':        { lat: 27.02, lng: 74.22 },
  'Maharashtra':      { lat: 19.75, lng: 75.71 },
  'Gujarat':          { lat: 22.26, lng: 71.19 },
  'Karnataka':        { lat: 15.32, lng: 75.71 },
  'Tamil Nadu':       { lat: 11.13, lng: 78.66 },
  'Punjab':           { lat: 31.15, lng: 75.34 },
  'Uttarakhand':      { lat: 30.07, lng: 79.02 },
};

function getCountryCentroid(countryCode) {
  return COUNTRY_CENTROIDS[countryCode] || null;
}

function getStateCentroid(state) {
  return INDIA_STATE_CENTROIDS[state] || null;
}

function resolveLevel(mapType, viewLevel, locations) {
  if (viewLevel !== 'AUTO') return viewLevel;
  if (mapType === 'INDIA') {
    const hasCityCoords = locations.some(l => l.lat && l.lng && l.city);
    return hasCityCoords ? 'CITY' : 'STATE';
  }
  return 'COUNTRY';
}

export default class AggregationEngine {
  static aggregate(dataset, locationMap, mapType, viewLevel = 'AUTO') {
    const datasetLocations = dataset.locations || [];

    const resolved = datasetLocations.reduce((acc, dloc) => {
      const loc = locationMap.get(dloc.locationId);
      if (!loc) return acc;
      if (mapType === 'INDIA' && loc.countryCode !== 'IN') return acc;
      acc.push({ ...loc, ...dloc, _baseCountry: loc.countryCode, _baseState: loc.state });
      return acc;
    }, []);

    const level = resolveLevel(mapType, viewLevel, resolved);

    if (level === 'COUNTRY') return this._aggregateByCountry(resolved, dataset);
    if (level === 'STATE')   return this._aggregateByState(resolved, dataset);
    return this._asIndividuals(resolved, dataset);
  }

  static _aggregateByCountry(locations, dataset) {
    const groups = {};
    for (const loc of locations) {
      const code = loc._baseCountry;
      if (!groups[code]) groups[code] = { locations: [], country: loc.country, code };
      groups[code].locations.push(loc);
    }

    return Object.values(groups).map(g => {
      const centroid = getCountryCentroid(g.code);
      if (!centroid) return null;

      const primary = g.locations[0];
      const count = g.locations.length;
      const detail = count > 1
        ? `${count} locations across ${g.country}`
        : primary.description || '';

      return {
        lat:           centroid.lat,
        lng:           centroid.lng,
        label:         g.country,
        type:          primary.markerType || dataset.type,
        region:        primary.region || '',
        description:   detail,
        url:           primary.url || '',
        count,
        datasetUid:    dataset.uid,
        datasetTitle:  dataset.title,
        _locations:    g.locations,
      };
    }).filter(Boolean);
  }

  static _aggregateByState(locations, dataset) {
    const groups = {};
    for (const loc of locations) {
      const state = loc._baseState || 'Unknown';
      if (!groups[state]) groups[state] = { locations: [], state };
      groups[state].locations.push(loc);
    }

    return Object.values(groups).map(g => {
      const centroid = getStateCentroid(g.state);
      const fallback = g.locations.find(l => l.lat && l.lng);
      const coords = centroid || (fallback ? { lat: fallback.lat, lng: fallback.lng } : null);
      if (!coords) return null;

      const primary = g.locations[0];
      const count = g.locations.length;
      const detail = count > 1
        ? `${count} facilities in ${g.state}`
        : primary.description || '';

      return {
        lat:           coords.lat,
        lng:           coords.lng,
        label:         g.state,
        type:          primary.markerType || dataset.type,
        region:        'India',
        description:   detail,
        url:           primary.url || '',
        count,
        datasetUid:    dataset.uid,
        datasetTitle:  dataset.title,
        _locations:    g.locations,
      };
    }).filter(Boolean);
  }

  static _asIndividuals(locations, dataset) {
    return locations.map(loc => {
      if (!loc.lat || !loc.lng) return null;
      return {
        lat:          loc.lat,
        lng:          loc.lng,
        label:        loc.city || loc.state || loc.country || loc.label || '',
        type:         loc.markerType || dataset.type,
        region:       loc.region || loc.state || '',
        description:  loc.description || '',
        url:          loc.url || '',
        count:        1,
        datasetUid:   dataset.uid,
        datasetTitle: dataset.title,
        _locations:   [loc],
      };
    }).filter(Boolean);
  }
}
