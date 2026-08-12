/**
 * HeroController
 *
 * Responsibilities:
 *  - Detect prefers-reduced-motion and stop the video, reveal fallback image.
 *  - Catch autoplay policy rejections and fall back to the static image so the
 *    hero is never an invisible dark panel.
 *
 * The video element carries the autoplay attribute, which the browser respects
 * automatically. We additionally call play() to obtain a Promise, which lets us
 * detect silently blocked autoplay (common in data-saving or restricted modes).
 *
 * CSS handles reduced-motion display independently (no-JS safety), but this
 * controller also pauses the video so it stops decoding in the background.
 */
export class HeroController {
  constructor() {
    this._hero     = document.querySelector('.hero');
    this._video    = this._hero?.querySelector('.hero-video');
    this._fallback = this._hero?.querySelector('.hero-fallback');
    this._reducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  init() {
    if (!this._hero) return;

    if (this._reducedMotion) {
      // CSS @media (prefers-reduced-motion) already hides the video element and
      // shows the static fallback without animations. Just stop video decoding
      // in the background — do NOT call _showFallback(), which would remove the
      // [hidden] attribute and trigger the kenburns animation via :not([hidden]).
      this._video?.pause();
      return;
    }

    if (this._video) {
      // video.play() returns a Promise even when the autoplay attribute is set.
      // A rejected Promise means the browser blocked autoplay — swap to fallback.
      this._video.play().catch(() => this._showFallback());
    }
  }

  _showFallback() {
    if (this._video) {
      this._video.pause();
      this._video.hidden = true;
    }
    if (this._fallback) {
      // Removing [hidden] triggers .hero-fallback:not([hidden]) in CSS,
      // which sets display:block and starts the kenburns animation.
      // This path is only reached for autoplay-blocked non-reduced-motion users.
      this._fallback.hidden = false;
    }
  }
}
