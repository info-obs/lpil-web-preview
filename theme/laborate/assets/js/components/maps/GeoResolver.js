/**
 * GeoResolver — resolves geographic coordinates from dataset location fields.
 *
 * Resolution priority (first match wins):
 *   1. Explicit lat + lng (non-empty, non-zero)
 *   2. Province centroid (ISO 3166-2, e.g. "IN-HR")
 *   3. Country centroid (ISO 3166-1 Alpha-3, e.g. "IND")
 *   4. Region centroid  (UN M49, e.g. "142")
 *
 * All centroids are geographic centroids, not capitals.
 * Returns null if no coordinate can be resolved — caller should ignore entry.
 */

/* ── Country centroids (ISO 3166-1 Alpha-3) ───────────────────────────────── */
const COUNTRY_CENTROIDS = {
  ARE: { lat:  24.47, lng:  54.37 },  // United Arab Emirates
  AZE: { lat:  40.14, lng:  47.58 },  // Azerbaijan
  BGD: { lat:  23.68, lng:  90.35 },  // Bangladesh
  BOL: { lat: -16.29, lng: -63.59 },  // Bolivia
  BTN: { lat:  27.51, lng:  90.43 },  // Bhutan
  CMR: { lat:   3.85, lng:  11.50 },  // Cameroon
  COL: { lat:   4.57, lng: -74.30 },  // Colombia
  CZE: { lat:  49.82, lng:  15.47 },  // Czech Republic
  DZA: { lat:  28.03, lng:   1.66 },  // Algeria
  DOM: { lat:  18.74, lng: -70.16 },  // Dominican Republic
  ECU: { lat:  -1.83, lng: -78.18 },  // Ecuador
  ETH: { lat:   9.15, lng:  40.49 },  // Ethiopia
  GHA: { lat:   7.95, lng:  -1.02 },  // Ghana
  IND: { lat:  20.59, lng:  78.96 },  // India
  JOR: { lat:  30.59, lng:  36.24 },  // Jordan
  KAZ: { lat:  48.02, lng:  66.92 },  // Kazakhstan
  KEN: { lat:  -0.02, lng:  37.91 },  // Kenya
  KGZ: { lat:  41.20, lng:  74.77 },  // Kyrgyzstan
  KHM: { lat:  12.57, lng: 104.99 },  // Cambodia
  KWT: { lat:  29.31, lng:  47.48 },  // Kuwait
  LBY: { lat:  26.34, lng:  17.23 },  // Libya
  LKA: { lat:   7.87, lng:  80.77 },  // Sri Lanka
  MAR: { lat:  31.79, lng:  -7.09 },  // Morocco
  MDV: { lat:   3.20, lng:  73.22 },  // Maldives
  MMR: { lat:  21.92, lng:  95.96 },  // Myanmar
  MNG: { lat:  46.86, lng: 103.85 },  // Mongolia
  MYS: { lat:   3.14, lng: 101.69 },  // Malaysia
  NGA: { lat:   9.08, lng:   8.68 },  // Nigeria
  NPL: { lat:  28.39, lng:  84.12 },  // Nepal
  PER: { lat:  -9.19, lng: -75.02 },  // Peru
  PHL: { lat:  12.88, lng: 121.77 },  // Philippines
  POL: { lat:  51.92, lng:  19.15 },  // Poland
  ROU: { lat:  45.94, lng:  24.97 },  // Romania
  SAU: { lat:  23.89, lng:  45.08 },  // Saudi Arabia
  TJK: { lat:  38.86, lng:  71.28 },  // Tajikistan
  TLS: { lat:  -8.87, lng: 125.73 },  // Timor-Leste
  TZA: { lat:  -6.37, lng:  34.89 },  // Tanzania
  UZB: { lat:  41.38, lng:  64.59 },  // Uzbekistan
  VNM: { lat:  14.06, lng: 108.28 },  // Vietnam
  YEM: { lat:  15.55, lng:  48.52 },  // Yemen
  ZAF: { lat: -28.47, lng:  24.68 },  // South Africa
};

/* ── Province centroids (ISO 3166-2) ─────────────────────────────────────── */
const PROVINCE_CENTROIDS = {
  'IN-HR': { lat: 29.06, lng: 76.09 },  // Haryana
  'IN-HP': { lat: 31.10, lng: 77.17 },  // Himachal Pradesh
  'IN-PB': { lat: 31.15, lng: 75.34 },  // Punjab
  'IN-DL': { lat: 28.70, lng: 77.10 },  // Delhi
  'IN-UT': { lat: 30.07, lng: 79.02 },  // Uttarakhand
  'IN-RJ': { lat: 27.02, lng: 74.22 },  // Rajasthan
  'IN-MH': { lat: 19.75, lng: 75.71 },  // Maharashtra
  'IN-GJ': { lat: 22.26, lng: 71.19 },  // Gujarat
  'IN-KA': { lat: 15.32, lng: 75.71 },  // Karnataka
  'IN-TN': { lat: 11.13, lng: 78.66 },  // Tamil Nadu
};

/* ── Region centroids (UN M49) ───────────────────────────────────────────── */
const REGION_CENTROIDS = {
  '001': { lat:   0.0,  lng:   0.0  },  // World
  '002': { lat:   2.0,  lng:  21.8  },  // Africa
  '005': { lat: -14.3,  lng: -51.9  },  // South America
  '009': { lat: -22.7,  lng: 140.0  },  // Oceania
  '011': { lat:   7.3,  lng:  -3.0  },  // West Africa
  '014': { lat:  -2.0,  lng:  35.0  },  // East Africa
  '015': { lat:  25.0,  lng:  20.0  },  // North Africa
  '019': { lat:   8.8,  lng: -80.8  },  // Americas
  '021': { lat:  50.0,  lng: -90.0  },  // North America
  '034': { lat:  20.0,  lng:  78.0  },  // South Asia
  '035': { lat:  13.0,  lng: 105.0  },  // South-Eastern Asia
  '142': { lat:  34.0,  lng: 100.6  },  // Asia
  '143': { lat:  44.0,  lng:  68.0  },  // Central Asia
  '145': { lat:  29.0,  lng:  40.0  },  // Western Asia
  '150': { lat:  54.5,  lng:  15.3  },  // Europe
};

/* ── Human-readable names ─────────────────────────────────────────────────── */
export const COUNTRY_NAMES = {
  ARE: 'United Arab Emirates', AZE: 'Azerbaijan',     BGD: 'Bangladesh',
  BOL: 'Bolivia',              BTN: 'Bhutan',         CMR: 'Cameroon',
  COL: 'Colombia',             CZE: 'Czech Republic', DZA: 'Algeria',
  DOM: 'Dominican Republic',   ECU: 'Ecuador',        ETH: 'Ethiopia',
  GHA: 'Ghana',                IND: 'India',          JOR: 'Jordan',
  KAZ: 'Kazakhstan',           KEN: 'Kenya',          KGZ: 'Kyrgyzstan',
  KHM: 'Cambodia',             KWT: 'Kuwait',         LBY: 'Libya',
  LKA: 'Sri Lanka',            MAR: 'Morocco',        MDV: 'Maldives',
  MMR: 'Myanmar',              MNG: 'Mongolia',       MYS: 'Malaysia',
  NGA: 'Nigeria',              NPL: 'Nepal',          PER: 'Peru',
  PHL: 'Philippines',          POL: 'Poland',         ROU: 'Romania',
  SAU: 'Saudi Arabia',         TJK: 'Tajikistan',     TLS: 'Timor-Leste',
  TZA: 'Tanzania',             UZB: 'Uzbekistan',     VNM: 'Vietnam',
  YEM: 'Yemen',                ZAF: 'South Africa',
};

export const PROVINCE_NAMES = {
  'IN-HR': 'Haryana',           'IN-HP': 'Himachal Pradesh',
  'IN-PB': 'Punjab',            'IN-DL': 'Delhi',
  'IN-UT': 'Uttarakhand',       'IN-RJ': 'Rajasthan',
  'IN-MH': 'Maharashtra',       'IN-GJ': 'Gujarat',
  'IN-KA': 'Karnataka',         'IN-TN': 'Tamil Nadu',
};

/* ── API ─────────────────────────────────────────────────────────────────── */
export default class GeoResolver {
  /**
   * Resolve coordinates for a single location entry.
   * Returns {lat, lng} or null if unresolvable.
   */
  static resolve(loc) {
    // 1. Explicit coordinates
    const lat = parseFloat(loc.lat);
    const lng = parseFloat(loc.lng);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      return { lat, lng };
    }

    // 2. Province centroid
    if (loc.province && PROVINCE_CENTROIDS[loc.province]) {
      return PROVINCE_CENTROIDS[loc.province];
    }

    // 3. Country centroid
    if (loc.country && COUNTRY_CENTROIDS[loc.country]) {
      return COUNTRY_CENTROIDS[loc.country];
    }

    // 4. Region centroid
    if (loc.region && REGION_CENTROIDS[loc.region]) {
      return REGION_CENTROIDS[loc.region];
    }

    return null;
  }

  /** Direct centroid lookup by Alpha-3 country code. */
  static countryCoords(alpha3) {
    return COUNTRY_CENTROIDS[alpha3] || null;
  }

  /** Direct centroid lookup by ISO 3166-2 province code. */
  static provinceCoords(iso3166_2) {
    return PROVINCE_CENTROIDS[iso3166_2] || null;
  }

  /** Human-readable name for a country (Alpha-3) or province (ISO 3166-2). */
  static label(code) {
    return COUNTRY_NAMES[code] || PROVINCE_NAMES[code] || code;
  }
}
