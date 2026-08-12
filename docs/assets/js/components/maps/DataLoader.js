/**
 * DataLoader — fetches dataset and theme JSON from the data layer.
 *
 * WordPress swap point: set window.laborateMapDatasets[uid] and
 * window.laborateMapThemes[id] via wp_localize_script to bypass fetch() calls.
 * No other module changes required.
 *
 * Caching and deduplication is handled by MapBootstrap. DataLoader is stateless.
 */
export default class DataLoader {
  static async loadDataset(dataPath, uid) {
    if (window.laborateMapDatasets?.[uid]) return window.laborateMapDatasets[uid];
    const slug = uid.toLowerCase().replace(/_/g, '-');
    const res  = await fetch(`${dataPath}/datasets/${slug}.json`);
    if (!res.ok) throw new Error(`[DataLoader] dataset "${uid}" fetch failed (${res.status})`);
    return res.json();
  }

  static async loadTheme(dataPath, id) {
    if (window.laborateMapThemes?.[id]) return window.laborateMapThemes[id];
    const res = await fetch(`${dataPath}/themes/${id}.json`);
    if (!res.ok) throw new Error(`[DataLoader] theme "${id}" fetch failed (${res.status})`);
    return res.json();
  }
}
