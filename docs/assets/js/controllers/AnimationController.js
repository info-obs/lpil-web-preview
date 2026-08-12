/**
 * AnimationController
 * Responsibilities:
 *  - IntersectionObserver for .reveal and .reveal-scale elements
 *  - Stagger support via [data-stagger] attribute on a parent
 *
 * data-stagger usage:
 *   <div data-stagger="80">   ← 80ms between child reveals
 *     <div class="reveal">…</div>
 *     <div class="reveal">…</div>
 *   </div>
 */
import { $$  } from '../utils/dom.js';
import { prefersReducedMotion } from '../utils/animate.js';

export class AnimationController {
  init() {
    if (prefersReducedMotion()) {
      // Skip transitions — make everything immediately visible
      $$('.reveal, .reveal-scale').forEach((el) => el.classList.add('in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          this._reveal(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -40px 0px' }
    );

    $$('.reveal, .reveal-scale').forEach((el) => observer.observe(el));

    // Stagger groups: observe the container, animate children on entry
    $$('[data-stagger]').forEach((group) => {
      const staggerObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            staggerObserver.unobserve(entry.target);
            this._staggerChildren(entry.target);
          });
        },
        { threshold: 0.1 }
      );
      staggerObserver.observe(group);
    });
  }

  _reveal(el) {
    el.classList.add('in');
  }

  _staggerChildren(group) {
    const delay = parseInt(group.dataset.stagger ?? '60', 10);
    const children = [...group.querySelectorAll('.reveal, .reveal-scale')];
    children.forEach((child, i) => {
      setTimeout(() => child.classList.add('in'), i * delay);
    });
  }
}
