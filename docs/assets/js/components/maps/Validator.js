/**
 * Validator — filters dataset location entries before coordinate resolution.
 *
 * An entry is valid if it contains at least one piece of usable geographic
 * information: explicit coordinates, a province code, a country code, or a
 * region code. Entries that fail validation are silently ignored.
 */
export default class Validator {
  static isValid(loc) {
    if (!loc || typeof loc !== 'object') return false;

    // Explicit coordinates (non-empty, non-zero)
    const lat = parseFloat(loc.lat);
    const lng = parseFloat(loc.lng);
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) return true;

    // At least one geographic code present
    if (loc.province && String(loc.province).trim()) return true;
    if (loc.country  && String(loc.country).trim())  return true;
    if (loc.region   && String(loc.region).trim())   return true;

    return false;
  }
}
