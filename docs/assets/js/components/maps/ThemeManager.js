/**
 * ThemeManager — applies JSON theme values to amCharts series instances.
 *
 * Called once after MapFactory creates the chart and polygon series.
 * Re-called if the active theme changes at runtime.
 */

function hex(str) {
  /* global am5 */
  return am5.color(parseInt(str.replace('#', ''), 16));
}

export default class ThemeManager {
  static apply(themeData, root, chart, polygonSeries) {
    if (!themeData) return;

    chart.set('background', am5.Rectangle.new(root, {
      fill:        hex(themeData.water || '#d5e7f7'),
      fillOpacity: 1,
    }));

    polygonSeries.mapPolygons.template.setAll({
      fill:        hex(themeData.land        || '#ecf1f8'),
      stroke:      hex(themeData.border      || '#ffffff'),
      strokeWidth: themeData.borderWidth     ?? 0.6,
      interactive: false,
    });

    if (themeData.landHover) {
      polygonSeries.mapPolygons.template.states.create('hover', {
        fill: hex(themeData.landHover),
      });
    }
  }

  static markerColor(themeData, markerType) {
    const types = themeData.markerTypes || {};
    if (types[markerType]) return types[markerType];
    return {
      fill:  themeData.markerFill  || '#001844',
      pulse: themeData.markerPulse || '#0d57a2',
    };
  }
}
