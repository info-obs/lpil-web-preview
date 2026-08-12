/**
 * ClusterManager — creates an amCharts 5 ClusteredPointSeries.
 *
 * Handles:
 *   - Cluster bullets (grouped circles with count label)
 *   - Individual marker bullets (pulsing dots)
 *   - Click callbacks routed to EnterpriseMap popup handler
 *   - Smooth cluster expand/collapse transitions
 */

function hex(str) {
  /* global am5 */
  return am5.color(parseInt(str.replace('#', ''), 16));
}

export default class ClusterManager {
  static create(root, chart, themeData, config, callbacks = {}) {
    /* global am5map */
    const showTooltips = config.mode !== 'hero';
    const onMarkerClick = callbacks.onMarkerClick || null;

    const series = chart.series.push(
      am5map.ClusteredPointSeries.new(root, {
        latitudeField:  'lat',
        longitudeField: 'lng',
        minDistance:    40,
        clusteredBullet: (bulletRoot) => {
          const container = am5.Container.new(bulletRoot, {
            cursorOverStyle: 'pointer',
          });

          container.children.push(am5.Circle.new(bulletRoot, {
            radius:      22,
            fill:        hex(themeData.clusterFill   || '#0d57a2'),
            stroke:      hex(themeData.clusterStroke || '#ffffff'),
            strokeWidth: 2,
            fillOpacity: 0.92,
          }));

          container.children.push(am5.Label.new(bulletRoot, {
            text:        '{value}',
            fill:        hex(themeData.clusterText || '#ffffff'),
            fontSize:    11,
            fontWeight:  '700',
            centerX:     am5.percent(50),
            centerY:     am5.percent(50),
            populateText: true,
          }));

          container.events.on('click', (e) => {
            series.zoomToCluster(e.target.dataItem);
          });

          return am5.Bullet.new(bulletRoot, { sprite: container });
        },
      })
    );

    const markerRadius = themeData.markerRadius || 5;

    series.bullets.push(function(bulletRoot, _series, dataItem) {
      const ctx = dataItem.dataContext || {};
      const colors = _resolveColors(themeData, ctx.type);

      const container = am5.Container.new(bulletRoot, { layer: 30 });

      const pulse = container.children.push(am5.Circle.new(bulletRoot, {
        radius:        markerRadius,
        fillOpacity:   0,
        strokeOpacity: 0,
        stroke:        hex(colors.pulse),
        strokeWidth:   1.5,
      }));
      pulse.animate({ key: 'radius',        from: markerRadius, to: markerRadius * 4, duration: 2000, loops: Infinity, easing: am5.ease.out(am5.ease.cubic) });
      pulse.animate({ key: 'strokeOpacity', from: 0.6, to: 0, duration: 2000, loops: Infinity });

      const dotOpts = {
        radius:      markerRadius,
        fill:        hex(colors.fill),
        stroke:      hex(themeData.markerStroke || '#ffffff'),
        strokeWidth: 1.5,
      };
      if (showTooltips && ctx.label) {
        dotOpts.tooltipText = `[bold]{label}[/]\n{type}`;
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

function _resolveColors(themeData, markerType) {
  const types = themeData.markerTypes || {};
  if (markerType && types[markerType]) return types[markerType];
  return {
    fill:  themeData.markerFill  || '#001844',
    pulse: themeData.markerPulse || '#0d57a2',
  };
}
