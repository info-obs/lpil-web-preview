/**
 * Marquee module — duplicates track content so the loop is seamless.
 *
 * Usage:
 *   <div class="marquee">
 *     <div class="marquee-track anim-slide"><!-- items --></div>
 *   </div>
 *
 * The track must be styled with `animation: slide Xs linear infinite`.
 * This module clones the inner content so the loop has no gap.
 */
export function initMarquee() {
  const tracks = document.querySelectorAll('.marquee-track');
  tracks.forEach((track) => {
    const clone = track.innerHTML;
    track.innerHTML = clone + clone;
  });
}
