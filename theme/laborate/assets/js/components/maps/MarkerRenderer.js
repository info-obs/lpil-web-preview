/**
 * MarkerRenderer — creates a non-clustered MapPointSeries.
 *
 * Used when clustering is disabled (e.g. hero mode with very few markers).
 * For most map instances the platform uses ClusterManager instead.
 */

function hex(str) {
  /* global am5 */
  return am5.color(parseInt(str.replace('#', ''), 16));
}

export default class MarkerRenderer {
  static create(root, chart, themeData, config, callbacks = {}) {
    /* global am5map */
    const series = chart.series.push(
      am5map.MapPointSeries.new(root, {
        latitudeField:  'lat',
        longitudeField: 'lng',
      })
    );

    const showTooltips = config.mode !== 'hero';
    const onMarkerClick = callbacks.onMarkerClick || null;

    series.bullets.push(function(bulletRoot, _series, dataItem) {
      const ctx = dataItem.dataContext || {};
      const colors = ThemeManager_markerColor(themeData, ctx.type);

      const container = am5.Container.new(bulletRoot, { layer: 30 });

      const pulse = container.children.push(am5.Circle.new(bulletRoot, {
        radius:        themeData.markerRadius || 5,
        fillOpacity:   0,
        strokeOpacity: 0,
        stroke:        hex(colors.pulse),
        strokeWidth:   1.5,
      }));
      pulse.animate({ key: 'radius',        from: themeData.markerRadius || 5, to: 20, duration: 2000, loops: Infinity, easing: am5.ease.out(am5.ease.cubic) });
      pulse.animate({ key: 'strokeOpacity', from: 0.6, to: 0, duration: 2000, loops: Infinity });

      const dotOpts = {
        radius:      themeData.markerRadius || 5,
        fill:        hex(colors.fill),
        stroke:      hex(themeData.markerStroke || '#ffffff'),
        strokeWidth: 1.5,
      };
      if (showTooltips && ctx.label) {
        dotOpts.tooltipText = ctx.label;
      }
      if (onMarkerClick) {
        dotOpts.cursorOverStyle = 'pointer';
      }

      const dot = container.children.push(am5.Circle.new(bulletRoot, dotOpts));

      if (onMarkerClick) {
        dot.events.on('click', () => onMarkerClick(ctx));
      }

      return am5.Bullet.new(bulletRoot, { sprite: container });
    });

    return series;
  }
}

function ThemeManager_markerColor(themeData, markerType) {
  const types = themeData.markerTypes || {};
  if (markerType && types[markerType]) return types[markerType];
  return {
    fill:  themeData.markerFill  || '#001844',
    pulse: themeData.markerPulse || '#0d57a2',
  };
}
