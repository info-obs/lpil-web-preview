/**
 * BrandDetailController
 * Responsibilities:
 *  - Marketing banner slider in the brand detail hero (C-111)
 *  - Smooth 700ms fade transition with 7s dwell time
 *  - Pauses on hover / focus-within
 *  - After ANY manual interaction (prev, next, dot) the slider permanently
 *    stops auto-advancing — user intent is respected (Apple / Mercedes pattern)
 *  - WCAG AA: aria-live, role="group", keyboard ArrowLeft/ArrowRight
 */
import { $$, $ } from '../utils/dom.js';

export class BrandDetailController {
  init() {
    $$('[data-brand-slider]').forEach((slider) => this._initSlider(slider));
  }

  _initSlider(slider) {
    const slides   = $$('.bde-slide',        slider);
    const dots     = $$('.bde-slider-dot',   slider);
    const prevBtn  = $('[data-slider-prev]',  slider);
    const nextBtn  = $('[data-slider-next]',  slider);
    const liveRgn  = $('[aria-live]',         slider);

    if (!slides.length) return;

    let current        = 0;
    let timer          = null;
    let userTookControl = false;
    const INTERVAL     = 7000;

    const goTo = (index) => {
      slides[current].classList.remove('is-active');
      slides[current].setAttribute('aria-hidden', 'true');
      if (dots[current]) {
        dots[current].classList.remove('is-active');
        dots[current].removeAttribute('aria-current');
      }

      current = ((index % slides.length) + slides.length) % slides.length;

      slides[current].classList.add('is-active');
      slides[current].removeAttribute('aria-hidden');
      if (dots[current]) {
        dots[current].classList.add('is-active');
        dots[current].setAttribute('aria-current', 'true');
      }

      if (liveRgn) liveRgn.textContent = `Slide ${current + 1} of ${slides.length}`;
    };

    const stop = () => clearInterval(timer);

    const start = () => {
      stop(); // always clear first to prevent stacked timers
      if (slides.length < 2 || userTookControl) return;
      timer = setInterval(() => goTo(current + 1), INTERVAL);
    };

    // Manual interactions — permanently stop auto-advance
    prevBtn?.addEventListener('click', () => {
      userTookControl = true;
      stop();
      goTo(current - 1);
    });

    nextBtn?.addEventListener('click', () => {
      userTookControl = true;
      stop();
      goTo(current + 1);
    });

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        userTookControl = true;
        stop();
        goTo(i);
      });
    });

    // Hover / focus — pause while over the slider, resume on leave
    // (resume only if user hasn't manually taken control)
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
    slider.addEventListener('focusin',   stop);
    slider.addEventListener('focusout',  start);

    // Keyboard: arrow navigation also counts as manual control
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        userTookControl = true;
        stop();
        goTo(e.key === 'ArrowLeft' ? current - 1 : current + 1);
      }
    });

    // Set initial ARIA state on non-active slides
    slides.forEach((slide, i) => {
      if (i !== 0) slide.setAttribute('aria-hidden', 'true');
    });

    start();
  }
}
