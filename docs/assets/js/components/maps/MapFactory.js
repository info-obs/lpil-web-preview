/**
 * MapFactory — constructs amCharts map instances for each supported geography.
 *
 * amCharts globals (am5, am5map, am5themes_Animated, am5geodata_*) are loaded
 * via static <script> tags in each page's HTML — not by this module.
 *
 * Adding a new map type requires adding ONE entry to MAP_TYPES only.
 */

/* global am5, am5map, am5themes_Animated */

const MAP_TYPES = {
  WORLD: {
    geodataGlobal: 'am5geodata_worldLow',
    exclude:       ['AQ'],
    panX:          'rotateX',
    panY:          'translateY',
    minZoom:       0.9,
    maxZoom:       8,
    projection:    () => am5map.geoNaturalEarth1(),
  },
  INDIA: {
    geodataGlobal: 'am5geodata_indiaLow',
    exclude:       [],
    panX:          'translateX',
    panY:          'translateY',
    minZoom:       1,
    maxZoom:       12,
    projection:    () => am5map.geoMercator(),
  },
};

export default class MapFactory {
  static createChart(containerId, mapType, interactionMode) {
    const cfg     = MAP_TYPES[mapType] || MAP_TYPES.WORLD;
    const geodata = window[cfg.geodataGlobal];

    if (!geodata) {
      throw new Error(
        `[MapFactory] "${cfg.geodataGlobal}" not found. ` +
        `Ensure the CDN geodata script for "${mapType}" is loaded before the map init block.`
      );
    }

    const root = am5.Root.new(containerId);
    root.setThemes([am5themes_Animated.new(root)]);

    const interactive = interactionMode === 'interactive';

    const chart = root.container.children.push(
      am5map.MapChart.new(root, {
        projection:   cfg.projection(),
        panX:         interactive ? cfg.panX : 'none',
        panY:         interactive ? cfg.panY : 'none',
        minZoomLevel: cfg.minZoom,
        maxZoomLevel: cfg.maxZoom,
        wheelX:       interactive ? 'zoom' : 'none',
        wheelY:       interactive ? 'zoom' : 'none',
      })
    );

    const polygonSeries = chart.series.push(
      am5map.MapPolygonSeries.new(root, {
        geoJSON: geodata,
        exclude: cfg.exclude,
      })
    );

    if (interactive) {
      chart.set('zoomControl', am5map.ZoomControl.new(root, {}));
    }

    return { root, chart, polygonSeries };
  }
}
