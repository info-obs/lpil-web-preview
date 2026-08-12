/**
 * LegalPageController
 *
 * Manages the Legal Documentation Framework page (C-122).
 * Responsibilities:
 *   1. Tracks the active H2 section via IntersectionObserver
 *      and updates TOC link active states.
 *   2. Provides mobile TOC accordion toggle (expand / collapse).
 *   3. Closes mobile TOC on Escape key.
 *
 * No third-party dependencies. No cookie consent logic.
 * Future COOKIE module wires consent separately.
 */
class LegalPageController {
  #sections = [];
  #tocLinks = [];
  #observer = null;
  #tocToggle = null;
  #tocNav = null;
  #isOpen = false;

  init() {
    const toc = document.querySelector('.lgf-toc');
    if (!toc) return;

    this.#tocToggle = document.getElementById('lgf-toc-toggle');
    this.#tocNav = document.getElementById('lgf-toc-nav');
    this.#tocLinks = [...document.querySelectorAll('.lgf-toc-link')];

    this.#sections = this.#tocLinks
      .map(link => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    this.#bindMobileToggle();
    this.#setupObserver();
  }

  #bindMobileToggle() {
    this.#tocToggle?.addEventListener('click', () => {
      this.#isOpen = !this.#isOpen;
      this.#tocToggle.setAttribute('aria-expanded', String(this.#isOpen));
      this.#tocNav?.classList.toggle('is-open', this.#isOpen);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.#isOpen) {
        this.#isOpen = false;
        this.#tocToggle?.setAttribute('aria-expanded', 'false');
        this.#tocNav?.classList.remove('is-open');
        this.#tocToggle?.focus();
      }
    });
  }

  #setActive(id) {
    this.#tocLinks.forEach(link => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', active);
      if (active) {
        link.setAttribute('aria-current', 'location');
        /* Scroll active link into view within the TOC sidebar */
        link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  #setupObserver() {
    /* rootMargin: top offset accounts for sticky navbar (~80px) + buffer.
       The -60% bottom threshold means a section is only "active"
       while it occupies the upper 40% of the viewport — prevents
       the last section from activating before the user reaches it. */
    this.#observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.#setActive(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    );

    this.#sections.forEach(section => this.#observer.observe(section));
  }

  destroy() {
    this.#observer?.disconnect();
  }
}

const controller = new LegalPageController();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => controller.init());
} else {
  controller.init();
}

export default controller;
