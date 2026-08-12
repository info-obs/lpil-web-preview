/**
 * RendererAdapter — the only file that knows about amCharts 5.
 *
 * Converts generic marker objects from Aggregator into amCharts series.
 * All amCharts-specific logic lives here; no other module imports am5.
 *
 * Animation profiles (all defined centrally in ANIMATION_PROFILES):
 *   PULSE  — slow expanding ring, wide spread    (default)
 *   RIPPLE — faster ring, moderate spread
 *   GLOW   — slow soft expansion, sinusoidal ease
 *   BOUNCE — quick ring with back-ease overshoot
 *   NONE   — static dot, no animation
 *
 * Marker geometry (all defined centrally in MARKER_DEFAULTS):
 *   Themes control ONLY colours. Sizing, spacing, and animation timing
 *   are owned by this module and apply identically to every map instance.
 */

/* global am5, am5map */

/* ── Centralised animation profiles ─────────────────────────────────────── */

const ANIMATION_PROFILES = {
  PULSE: {
    duration:    2000,
    radiusTo:    4,
    opacityFrom: 0.6,
    easing:      () => am5.ease.out(am5.ease.cubic),
  },
  RIPPLE: {
    duration:    1400,
    radiusTo:    3,
    opacityFrom: 0.5,
    easing:      () => am5.ease.out(am5.ease.quadratic),
  },
  GLOW: {
    duration:    1800,
    radiusTo:    2.5,
    opacityFrom: 0.7,
    easing:      () => am5.ease.inOut(am5.ease.sinusoid),
  },
  BOUNCE: {
    duration:    900,
    radiusTo:    3,
    opacityFrom: 0.65,
    easing:      () => am5.ease.out(am5.ease.back),
  },
  NONE: null,
};

/* ── Centralised marker & cluster geometry ───────────────────────────────── */

const MARKER_DEFAULTS = {
  radius:             5,
  strokeWidth:        1.5,
  clusterRadius:      22,
  clusterStrokeWidth: 2,
  clusterFillOpacity: 0.92,
  clusterMinDistance: 40,
  clusterFontSize:    11,
  clusterFontWeight:  '700',
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function hex(str) {
  return am5.color(parseInt(str.replace('#', ''), 16));
}

function resolveColors(themeData, uid) {
  const dc = themeData.datasetColors || {};
  if (uid && dc[uid]) return dc[uid];
  return {
    fill:  themeData.markerFill  || '#001844',
    pulse: themeData.markerPulse || '#0d57a2',
  };
}

/* ── RendererAdapter ─────────────────────────────────────────────────────── */

export default class RendererAdapter {
  /**
   * Create an amCharts series configured for the given options.
   * Does NOT set data — caller calls series.data.setAll(markers) after.
   *
   * @param {am5.Root}        root
   * @param {am5map.MapChart} chart
   * @param {object}          themeData  — parsed theme JSON (colours only)
   * @param {object}          config     — EnterpriseMap config
   * @param {object}          callbacks  — { onMarkerClick }
   * @returns amCharts series instance
   */
  static create(root, chart, themeData, config, callbacks = {}) {
    const showTooltips  = config.interactive !== false;
    const onMarkerClick = config.interactive ? (callbacks.onMarkerClick || null) : null;
    const animProfile   = config.animationProfile || 'PULSE';
    const useCluster    = config.showCluster !== false;

    return useCluster
      ? this._clustered(root, chart, themeData, animProfile, showTooltips, onMarkerClick)
      : this._simple(root, chart, themeData, animProfile, showTooltips, onMarkerClick);
  }

  /* ── Clustered series ───────────────────────────────────────────────────── */

  static _clustered(root, chart, themeData, animProfile, showTooltips, onMarkerClick) {
    const series = chart.series.push(
      am5map.ClusteredPointSeries.new(root, {
        latitudeField:  'lat',
        longitudeField: 'lng',
        minDistance:    MARKER_DEFAULTS.clusterMinDistance,
        clusteredBullet: (bulletRoot) => {
          const container = am5.Container.new(bulletRoot, {
            cursorOverStyle: 'pointer',
          });

          container.children.push(am5.Circle.new(bulletRoot, {
            radius:      MARKER_DEFAULTS.clusterRadius,
            fill:        hex(themeData.clusterFill   || '#0d57a2'),
            stroke:      hex(themeData.clusterStroke || '#ffffff'),
            strokeWidth: MARKER_DEFAULTS.clusterStrokeWidth,
            fillOpacity: MARKER_DEFAULTS.clusterFillOpacity,
          }));

          container.children.push(am5.Label.new(bulletRoot, {
            text:         '{value}',
            fill:         hex(themeData.clusterText || '#ffffff'),
            fontSize:     MARKER_DEFAULTS.clusterFontSize,
            fontWeight:   MARKER_DEFAULTS.clusterFontWeight,
            centerX:      am5.percent(50),
            centerY:      am5.percent(50),
            populateText: true,
          }));

          container.events.on('click', (e) => {
            series.zoomToCluster(e.target.dataItem);
          });

          return am5.Bullet.new(bulletRoot, { sprite: container });
        },
      })
    );

    series.bullets.push((bulletRoot, _s, dataItem) => {
      return this._bullet(bulletRoot, themeData, animProfile, showTooltips, onMarkerClick, dataItem);
    });

    return series;
  }

  /* ── Simple (non-clustered) series ─────────────────────────────────────── */

  static _simple(root, chart, themeData, animProfile, showTooltips, onMarkerClick) {
    const series = chart.series.push(
      am5map.MapPointSeries.new(root, {
        latitudeField:  'lat',
        longitudeField: 'lng',
      })
    );

    series.bullets.push((bulletRoot, _s, dataItem) => {
      return this._bullet(bulletRoot, themeData, animProfile, showTooltips, onMarkerClick, dataItem);
    });

    return series;
  }

  /* ── Individual bullet ──────────────────────────────────────────────────── */

  static _bullet(bulletRoot, themeData, animProfile, showTooltips, onMarkerClick, dataItem) {
    const ctx    = dataItem?.dataContext || {};
    const colors = resolveColors(themeData, ctx.uid);
    const r      = MARKER_DEFAULTS.radius;

    const container = am5.Container.new(bulletRoot, { layer: 30 });

    // Animation ring — driven entirely by ANIMATION_PROFILES
    const profile = ANIMATION_PROFILES[animProfile] ?? ANIMATION_PROFILES.PULSE;
    if (profile) {
      const pulse = container.children.push(am5.Circle.new(bulletRoot, {
        radius:        r,
        fillOpacity:   0,
        strokeOpacity: 0,
        stroke:        hex(colors.pulse),
        strokeWidth:   MARKER_DEFAULTS.strokeWidth,
      }));
      pulse.animate({
        key: 'radius', from: r, to: r * profile.radiusTo,
        duration: profile.duration, loops: Infinity, easing: profile.easing(),
      });
      pulse.animate({
        key: 'strokeOpacity', from: profile.opacityFrom, to: 0,
        duration: profile.duration, loops: Infinity,
      });
    }

    const dotOpts = {
      radius:      r,
      fill:        hex(colors.fill),
      stroke:      hex(themeData.markerStroke || '#ffffff'),
      strokeWidth: MARKER_DEFAULTS.strokeWidth,
    };

    if (showTooltips && ctx.label) {
      dotOpts.tooltipText = '[bold]{label}[/]';
    }

    if (onMarkerClick) {
      dotOpts.cursorOverStyle = 'pointer';
    }

    const dot = container.children.push(am5.Circle.new(bulletRoot, dotOpts));

    if (onMarkerClick) {
      dot.events.on('click', () => onMarkerClick(ctx));
    }

    return am5.Bullet.new(bulletRoot, { sprite: container });
  }
}
