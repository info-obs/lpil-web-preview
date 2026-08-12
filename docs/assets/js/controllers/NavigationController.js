/**
 * NavigationController
 *
 * Responsibilities:
 *  - Scroll-progress bar (width driven by scroll %)
 *  - Header scroll state (.scrolled toggle on transparent-nav pages)
 *  - Mobile drawer open / close
 *  - Body scroll lock with iOS-compatible position:fixed approach
 *  - Scroll-position restoration on drawer close
 *  - Focus trap inside open drawer (Tab / Shift+Tab cycle)
 *  - ARIA state management (aria-expanded, aria-label, aria-hidden)
 *  - Hamburger → X morph via .open class
 *  - Backdrop click-to-close
 *  - In-drawer close button (#navClose)
 *  - Mobile sub-nav accordion (expand/collapse with .expanded + aria-hidden)
 *  - Search routing: all pages → navigate to search.html (SEARCH-001-P1)
 *  - prefers-reduced-motion awareness
 *
 * Configuration:
 *  - Transparent nav: header must carry data-nav-transparent attribute.
 *    Absent = always solid (internal pages). No JS needed for that state.
 */
import { $ } from '../utils/dom.js';

export class NavigationController {
  constructor() {
    this.header    = $('#header');
    this.hamburger = $('#hamburger');
    this.navLinks  = $('#navLinks');
    this.navClose  = $('#navClose');
    this.backdrop  = $('#navBackdrop');
    this.progress  = $('#progress');

    /** True when data-nav-transparent is on the header (homepage / hero pages). */
    this.isTransparent = this.header?.hasAttribute('data-nav-transparent') ?? false;

    this.isOpen    = false;
    this._savedScrollY = 0;
    this._reducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  init() {
    if (!this.header) return;

    // Evaluate scroll state on load (page may have been reloaded mid-scroll)
    this._onScroll();
    window.addEventListener('scroll', () => this._onScroll(), { passive: true });

    // Hamburger toggles the drawer
    this.hamburger?.addEventListener('click', () => this._toggleDrawer());

    // In-drawer close button closes the drawer
    this.navClose?.addEventListener('click', () => this._closeDrawer());

    // Backdrop click closes the drawer
    this.backdrop?.addEventListener('click', () => this._closeDrawer());

    // Primary nav link clicks close the drawer (mobile UX; desktop: drawer is not open)
    // Sub-nav toggle clicks are handled separately — do not close drawer.
    this.navLinks?.addEventListener('click', (e) => {
      if (e.target.closest('a') && !e.target.closest('.nav-meta .logo')) {
        this._closeDrawer();
      }
    });

    // Sub-nav accordion: toggle buttons expand/collapse sub-menus
    this.navLinks?.querySelectorAll('.nav-sub-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parent = btn.closest('.has-children');
        if (parent) this._toggleSubNav(parent, btn);
      });
    });

    // Initialise ARIA state on all sub-nav lists
    this.navLinks?.querySelectorAll('.nav-sub').forEach(sub => {
      sub.setAttribute('aria-hidden', 'true');
      sub.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', '-1'));
    });

    // Keyboard: Escape closes; Tab is trapped while drawer is open
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this._closeDrawer();
        return;
      }
      if (e.key === 'Tab' && this.isOpen) {
        this._trapFocus(e);
      }
    });

    // Search icon routing
    const searchLink = this.header.querySelector('[data-nav-search]');
    if (searchLink) {
      searchLink.addEventListener('click', (e) => this._handleSearch(e));
    }
  }

  // ─── Scroll ──────────────────────────────────────────────────────────────

  _onScroll() {
    // Header transparency toggle — only on pages with data-nav-transparent.
    // Internal pages are always solid via CSS; no class toggle needed.
    if (this.isTransparent) {
      this.header.classList.toggle('scrolled', window.scrollY > 200);
    }

    // Progress bar — updated on all pages regardless of nav type
    if (this.progress) {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      this.progress.style.width = `${pct}%`;
      this.progress.setAttribute('aria-valuenow', Math.round(pct));
    }
  }

  // ─── Drawer ──────────────────────────────────────────────────────────────

  _toggleDrawer() {
    this.isOpen ? this._closeDrawer() : this._openDrawer();
  }

  _openDrawer() {
    this.isOpen = true;

    // Cross-browser scroll lock.
    // position:fixed + top offset is required for iOS Safari, where
    // overflow:hidden alone does not prevent body scroll.
    this._savedScrollY = window.scrollY;
    document.body.style.top       = `-${this._savedScrollY}px`;
    document.body.style.position  = 'fixed';
    document.body.style.width     = '100%';
    document.body.style.overflowY = 'scroll'; // prevent layout shift on scrollbar loss

    // Visual classes
    this.navLinks?.classList.add('open');
    this.backdrop?.classList.add('open');
    this.hamburger?.classList.add('open');  // triggers CSS → X morph

    // ARIA
    this.hamburger?.setAttribute('aria-expanded', 'true');
    this.hamburger?.setAttribute('aria-label', 'Close menu');
    this.backdrop?.setAttribute('aria-hidden', 'false');

    // Move focus to the in-drawer close button once panel slides into view.
    // Delay respects the slide transition; collapses to 0 for reduced motion.
    const firstFocusable = this.navClose ?? this.navLinks?.querySelector('a');
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), this._reducedMotion ? 0 : 50);
    }
  }

  _closeDrawer() {
    if (!this.isOpen) return;
    this.isOpen = false;

    // Collapse all expanded sub-navs when the drawer closes
    this.navLinks?.querySelectorAll('.has-children.expanded').forEach(parent => {
      this._collapseSubNav(parent, parent.querySelector('.nav-sub-toggle'));
    });

    // Restore scroll position before removing position:fixed to prevent jump
    document.body.style.position  = '';
    document.body.style.top       = '';
    document.body.style.width     = '';
    document.body.style.overflowY = '';
    window.scrollTo(0, this._savedScrollY);

    // Visual classes
    this.navLinks?.classList.remove('open');
    this.backdrop?.classList.remove('open');
    this.hamburger?.classList.remove('open'); // triggers CSS → hamburger morph

    // ARIA
    this.hamburger?.setAttribute('aria-expanded', 'false');
    this.hamburger?.setAttribute('aria-label', 'Open menu');
    this.backdrop?.setAttribute('aria-hidden', 'true');

    // Return focus to the trigger that opened the drawer
    this.hamburger?.focus();
  }

  // ─── Sub-nav accordion ───────────────────────────────────────────────────

  _toggleSubNav(parent, btn) {
    if (parent.classList.contains('expanded')) {
      this._collapseSubNav(parent, btn);
    } else {
      this._expandSubNav(parent, btn);
    }
  }

  _expandSubNav(parent, btn) {
    const sub = parent.querySelector('.nav-sub');
    if (!sub) return;

    parent.classList.add('expanded');
    btn?.setAttribute('aria-expanded', 'true');
    sub.setAttribute('aria-hidden', 'false');
    // Restore sub-links to tab order
    sub.querySelectorAll('a').forEach(a => a.removeAttribute('tabindex'));
  }

  _collapseSubNav(parent, btn) {
    const sub = parent.querySelector('.nav-sub');
    if (!sub) return;

    parent.classList.remove('expanded');
    btn?.setAttribute('aria-expanded', 'false');
    sub.setAttribute('aria-hidden', 'true');
    // Remove sub-links from tab order
    sub.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', '-1'));
  }

  // ─── Focus trap ──────────────────────────────────────────────────────────

  /**
   * Traps Tab / Shift+Tab within the open drawer.
   * Focusable scope: in-drawer close button, primary nav links, toggle buttons,
   * and sub-links within currently expanded sections.
   */
  _trapFocus(e) {
    // Dynamically build list to reflect current accordion state
    const focusable = Array.from(
      this.navLinks?.querySelectorAll('button, a') ?? []
    ).filter(el => {
      // Exclude sub-links that belong to a collapsed section
      const sub = el.closest('.nav-sub');
      if (sub && !el.closest('.has-children.expanded')) return false;
      return true;
    });

    if (focusable.length < 2) return;

    const first  = focusable[0];
    const last   = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // ─── Search routing ──────────────────────────────────────────────────────

  /**
   * Search icon navigates to search.html on every page.
   * The href on [data-nav-search] already points to search.html (root pages)
   * or ../search.html (subdir pages) — allow default link navigation.
   */
  _handleSearch(e) {
    // No interception — href handles navigation to search.html
  }
}
