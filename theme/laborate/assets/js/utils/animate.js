/**
 * Animation utilities used by counter and animation controllers.
 */

/** Cubic ease-out easing curve */
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Animate a number from 0 to `target` over `duration` ms.
 * Calls `onUpdate(currentValue)` each frame.
 * @param {number}   target
 * @param {number}   duration
 * @param {Function} onUpdate
 * @param {Function} [onComplete]
 */
export function countUp(target, duration, onUpdate, onComplete) {
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.round(easeOutCubic(progress) * target);
    onUpdate(value);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(tick);
}

/**
 * Returns true if the user has requested reduced motion.
 * All animations should respect this preference.
 */
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
