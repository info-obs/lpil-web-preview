/**
 * Counter module — animates [data-count] elements when they scroll into view.
 * Relies on IntersectionObserver; respects prefers-reduced-motion.
 *
 * Usage:
 *   <span class="stat-num" data-count="240" data-suffix="+">0</span>
 */
import { countUp, prefersReducedMotion } from '../utils/animate.js';

export function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        runCounter(entry.target);
      });
    },
    { threshold: 0.4 }
  );

  els.forEach((el) => observer.observe(el));
}

function runCounter(el) {
  const targetText = el.dataset.count;
  const suffix = el.dataset.suffix ?? '';
  const duration = prefersReducedMotion() ? 0 : 1600;

  // Check if target is not a number but a text
  if (isNaN(targetText)) {
    // Treat as simple text
    el.textContent = targetText + suffix;
    return;
  }

  // Otherwise, set number and run animation
  const target = parseInt(targetText, 10);

  if (duration === 0) {
    el.textContent = target + suffix;
    return;
  }

  countUp(target, duration, (value) => {
    el.textContent = value + suffix;
  });
}
