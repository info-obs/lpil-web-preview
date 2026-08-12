/**
 * CookieConsentController — C-129 Consent Management Engine
 *
 * Responsibilities:
 *  - Display cookie banner on first visit (C-127)
 *  - Open / close Cookie Preference Centre modal (C-128)
 *  - Persist and retrieve consent preferences via localStorage
 *  - Sync toggle states inside the modal to stored preferences
 *  - Show floating preferences button after consent is given (C-130)
 *  - Expose window.CookieConsent public API for external use
 *  - Emit laborate:consent:applied custom event on consent change
 *  - Full keyboard and focus trap support (WCAG AA)
 *
 * Storage:
 *  - Key   : laborate_cookie_preferences
 *  - Schema: { version, necessary, analytics, functional, marketing,
 *               embedded, social, personalization, timestamp }
 *
 * WordPress integration:
 *  When WordPress CMP integration is complete, consent-based script loading
 *  will be implemented inside #applyPrefs(). See inline comments.
 *
 * Current state:
 *  No scripts are conditionally blocked. GA4 loads unconditionally while
 *  the consent infrastructure is built. Gating will be added when the full
 *  WordPress CMP pipeline is ready.
 */

export class CookieConsentController {

  /* ── Constants ─────────────────────────────────────────────────────────── */

  static #KEY     = 'laborate_cookie_preferences';
  static #VERSION = 1;

  static #DEFAULTS = {
    version:         1,
    necessary:       true,
    analytics:       false,
    functional:      false,
    marketing:       false,
    embedded:        false,
    social:          false,
    personalization: false,
    timestamp:       null,
  };

  /* ── Private state ─────────────────────────────────────────────────────── */

  #prefs                 = null;
  #banner                = null;
  #modal                 = null;
  #fab                   = null;
  #modalKeyHandler       = null;
  #lastFocused           = null;
  #reducedMotion         = false;

  /* ── Entry point ───────────────────────────────────────────────────────── */

  init() {
    this.#banner = document.getElementById('cc-banner');
    this.#modal  = document.getElementById('cc-modal');
    this.#fab    = document.getElementById('cc-fab');

    // Nothing to do if HTML is not on the page
    if (!this.#banner && !this.#modal) return;

    this.#reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.#prefs = this.#load();

    if (this.#prefs) {
      // Returning visitor — apply saved preferences, show FAB
      this.#applyPrefs(this.#prefs);
      this.#showFab();
    } else {
      // First visit — show banner after short delay (skip delay if reduced motion)
      const delay = this.#reducedMotion ? 0 : 400;
      setTimeout(() => this.#showBanner(), delay);
    }

    this.#bindBannerEvents();
    this.#bindModalEvents();
    this.#bindFabEvents();
    this.#bindGlobalKeys();
    this.#exposeAPI();
  }

  /* ── Storage ───────────────────────────────────────────────────────────── */

  #load() {
    try {
      const raw = localStorage.getItem(CookieConsentController.#KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Reject stale schema versions
      if (parsed?.version !== CookieConsentController.#VERSION) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  #persist(incoming) {
    const stored = {
      ...CookieConsentController.#DEFAULTS,
      ...incoming,
      necessary:  true,                          // necessary is always true
      version:    CookieConsentController.#VERSION,
      timestamp:  new Date().toISOString(),
    };
    try {
      localStorage.setItem(CookieConsentController.#KEY, JSON.stringify(stored));
    } catch (err) {
      console.warn('[CookieConsent] Cannot write to localStorage:', err);
    }
    this.#prefs = stored;
    return stored;
  }

  /* ── Apply preferences ─────────────────────────────────────────────────── */

  #applyPrefs(prefs) {
    /*
     * =====================================================================
     * FUTURE: CONDITIONAL SCRIPT LOADING
     * =====================================================================
     *
     * When WordPress CMP integration is complete, this method will gate
     * third-party scripts based on user consent. The implementation pattern:
     *
     * STEP 1 — WordPress injects consent configuration via wp_head:
     *   window.__LABORATE_CMP_CONFIG = {
     *     ga4Id:       'G-XXXXXXXXXX',          // injected from ACF option
     *     gtmId:       'GTM-XXXXXXX',
     *     metaPixelId: '...',
     *     linkedInId:  '...',
     *   };
     *
     * STEP 2 — WordPress registers scripts with data-cookie-category:
     *   add_filter('script_loader_tag', 'laborate_add_cookie_category', 10, 3);
     *   function laborate_add_cookie_category($tag, $handle, $src) {
     *     $map = [
     *       'google-analytics' => 'analytics',
     *       'google-tag-manager' => 'analytics',
     *       'meta-pixel' => 'marketing',
     *       'linkedin-insight' => 'marketing',
     *       'microsoft-clarity' => 'analytics',
     *       'youtube-embed' => 'embedded',
     *       'google-maps' => 'embedded',
     *       'crisp-chat' => 'functional',
     *     ];
     *     if (isset($map[$handle])) {
     *       $cat = $map[$handle];
     *       $tag = str_replace('<script', "<script data-cookie-category=\"{$cat}\"", $tag);
     *     }
     *     return $tag;
     *   }
     *
     * STEP 3 — This method reads consent and injects scripts accordingly:
     *   if (prefs.analytics && window.__LABORATE_CMP_CONFIG?.ga4Id) {
     *     this.#loadGA4(window.__LABORATE_CMP_CONFIG.ga4Id);
     *   }
     *   if (prefs.analytics && window.__LABORATE_CMP_CONFIG?.gtmId) {
     *     this.#loadGTM(window.__LABORATE_CMP_CONFIG.gtmId);
     *   }
     *   if (prefs.marketing && window.__LABORATE_CMP_CONFIG?.metaPixelId) {
     *     this.#loadMetaPixel(window.__LABORATE_CMP_CONFIG.metaPixelId);
     *   }
     *   if (prefs.marketing && window.__LABORATE_CMP_CONFIG?.linkedInId) {
     *     this.#loadLinkedIn(window.__LABORATE_CMP_CONFIG.linkedInId);
     *   }
     *   if (prefs.embedded) {
     *     // Unblock YouTube iframes, Google Maps iframes
     *     document.querySelectorAll('[data-embed-category="embedded"]')
     *       .forEach(el => el.src = el.dataset.src);
     *   }
     *
     * STEP 4 — Script loader helper (future):
     *   #loadGA4(id) {
     *     const s = document.createElement('script');
     *     s.async = true;
     *     s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
     *     document.head.appendChild(s);
     *     window.dataLayer = window.dataLayer || [];
     *     window.gtag = function() { dataLayer.push(arguments); };
     *     gtag('js', new Date());
     *     gtag('config', id);
     *   }
     *
     * =====================================================================
     * CURRENT STATE (as of COOKIE-001-P1)
     * =====================================================================
     * No scripts are conditionally blocked. GA4 loads via standard
     * wp_enqueue_script unconditionally. This will be gated in a future
     * prompt once the WordPress CMP pipeline is designed and approved.
     * =====================================================================
     */

    // Emit custom event — page scripts can listen for laborate:consent:applied
    document.dispatchEvent(
      new CustomEvent('laborate:consent:applied', { detail: { ...prefs }, bubbles: true })
    );
  }

  /* ── Banner (C-127) ────────────────────────────────────────────────────── */

  #showBanner() {
    if (!this.#banner) return;
    this.#banner.setAttribute('aria-hidden', 'false');
    this.#banner.classList.add('is-visible');
    // Move focus to banner heading for screen readers
    this.#banner.querySelector('.cc-banner-heading')?.focus?.();
  }

  #hideBanner() {
    if (!this.#banner) return;
    this.#banner.classList.remove('is-visible');
    this.#banner.setAttribute('aria-hidden', 'true');
  }

  #bindBannerEvents() {
    if (!this.#banner) return;

    this.#banner
      .querySelector('[data-cc-action="accept-all"]')
      ?.addEventListener('click', () => this.#acceptAll());

    this.#banner
      .querySelector('[data-cc-action="reject-optional"]')
      ?.addEventListener('click', () => this.#rejectOptional());

    this.#banner
      .querySelector('[data-cc-action="customize"]')
      ?.addEventListener('click', () => {
        this.#hideBanner();
        this.#openModal();
      });
  }

  /* ── Accept / Reject ───────────────────────────────────────────────────── */

  #acceptAll() {
    const prefs = this.#persist({
      necessary:       true,
      analytics:       true,
      functional:      true,
      marketing:       true,
      embedded:        true,
      social:          true,
      personalization: true,
    });
    this.#applyPrefs(prefs);
    this.#hideBanner();
    this.#closeModal(false);
    this.#showFab();
  }

  #rejectOptional() {
    const prefs = this.#persist({
      necessary:       true,
      analytics:       false,
      functional:      false,
      marketing:       false,
      embedded:        false,
      social:          false,
      personalization: false,
    });
    this.#applyPrefs(prefs);
    this.#hideBanner();
    this.#closeModal(false);
    this.#showFab();
  }

  /* ── Modal (C-128) ─────────────────────────────────────────────────────── */

  #openModal() {
    if (!this.#modal) return;

    this.#lastFocused = document.activeElement;
    this.#syncToggles(this.#prefs ?? CookieConsentController.#DEFAULTS);

    this.#modal.classList.add('is-open');
    this.#modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cc-body-lock');

    // Focus the close button after the transition completes
    const delay = this.#reducedMotion ? 0 : 260;
    setTimeout(() => {
      this.#modal.querySelector('.cc-modal-close')?.focus();
    }, delay);

    // Attach focus trap
    this.#modalKeyHandler = (e) => this.#handleModalKey(e);
    document.addEventListener('keydown', this.#modalKeyHandler);
  }

  #closeModal(restoreFocus = true) {
    if (!this.#modal) return;

    this.#modal.classList.remove('is-open');
    this.#modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cc-body-lock');

    if (this.#modalKeyHandler) {
      document.removeEventListener('keydown', this.#modalKeyHandler);
      this.#modalKeyHandler = null;
    }

    if (restoreFocus && this.#lastFocused) {
      // Return focus after transition
      const delay = this.#reducedMotion ? 0 : 260;
      setTimeout(() => this.#lastFocused?.focus(), delay);
    }
  }

  #handleModalKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.#closeModal();
      return;
    }
    if (e.key !== 'Tab') return;

    // Focus trap: collect all keyboard-reachable elements inside the modal dialog
    const dialog   = this.#modal.querySelector('.cc-modal-dialog');
    const focusable = [
      ...dialog.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), ' +
        'select:not([disabled]), textarea:not([disabled]), ' +
        '[tabindex]:not([tabindex="-1"])'
      )
    ].filter(el => !el.closest('[hidden]') && el.offsetParent !== null);

    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  #bindModalEvents() {
    if (!this.#modal) return;

    // Close button (×)
    this.#modal
      .querySelector('.cc-modal-close')
      ?.addEventListener('click', () => this.#closeModal());

    // Overlay click closes modal
    this.#modal
      .querySelector('.cc-modal-overlay')
      ?.addEventListener('click', () => this.#closeModal());

    // Save preferences
    this.#modal
      .querySelector('[data-cc-action="save-prefs"]')
      ?.addEventListener('click', () => {
        const prefs = this.#persist(this.#readToggles());
        this.#applyPrefs(prefs);
        this.#hideBanner();
        this.#closeModal();
        this.#showFab();
      });

    // Cancel — close without saving
    this.#modal
      .querySelector('[data-cc-action="cancel-prefs"]')
      ?.addEventListener('click', () => this.#closeModal());

    // Reset — restore defaults in the UI (does not save; user must click Save)
    this.#modal
      .querySelector('[data-cc-action="reset-prefs"]')
      ?.addEventListener('click', () => {
        this.#syncToggles(CookieConsentController.#DEFAULTS);
      });
  }

  /* ── Toggle sync ───────────────────────────────────────────────────────── */

  #syncToggles(prefs) {
    if (!this.#modal) return;
    const inputs = this.#modal.querySelectorAll('input[data-cc-category]');
    inputs.forEach(input => {
      const cat = input.dataset.ccCategory;
      if (cat && cat !== 'necessary') {
        input.checked = !!(prefs[cat]);
      }
    });
  }

  #readToggles() {
    const result = { necessary: true };
    if (!this.#modal) return result;
    const inputs = this.#modal.querySelectorAll('input[data-cc-category]:not([disabled])');
    inputs.forEach(input => {
      const cat = input.dataset.ccCategory;
      if (cat) result[cat] = input.checked;
    });
    return result;
  }

  /* ── FAB (C-130) ───────────────────────────────────────────────────────── */

  #showFab() {
    if (!this.#fab) return;
    this.#fab.classList.add('is-visible');
    this.#fab.setAttribute('aria-hidden', 'false');
  }

  #bindFabEvents() {
    if (!this.#fab) return;
    this.#fab.addEventListener('click', () => this.#openModal());
  }

  /* ── Global key handler ────────────────────────────────────────────────── */

  #bindGlobalKeys() {
    document.addEventListener('keydown', (e) => {
      // ESC closes banner — but only if preferences already exist
      // (avoids dismissing banner without making a choice on first visit)
      if (
        e.key === 'Escape' &&
        this.#banner?.classList.contains('is-visible') &&
        this.#prefs
      ) {
        this.#hideBanner();
      }
    });
  }

  /* ── Reset ─────────────────────────────────────────────────────────────── */

  #reset() {
    try {
      localStorage.removeItem(CookieConsentController.#KEY);
    } catch { /* noop */ }
    this.#prefs = null;
    if (this.#fab) {
      this.#fab.classList.remove('is-visible');
      this.#fab.setAttribute('aria-hidden', 'true');
    }
    this.#closeModal(false);
    const delay = this.#reducedMotion ? 0 : 400;
    setTimeout(() => this.#showBanner(), delay);
  }

  /* ── Public API (window.CookieConsent) ────────────────────────────────── */

  #exposeAPI() {
    window.CookieConsent = {
      /**
       * Accept all cookie categories, save, and close UI.
       */
      acceptAll: () => this.#acceptAll(),

      /**
       * Accept necessary cookies only, reject optional. Save and close.
       */
      rejectOptional: () => this.#rejectOptional(),

      /**
       * Save the current toggle state from the open preference modal.
       * Equivalent to clicking "Save Preferences".
       */
      save: () => {
        const prefs = this.#persist(this.#readToggles());
        this.#applyPrefs(prefs);
        this.#hideBanner();
        this.#closeModal();
        this.#showFab();
      },

      /**
       * Clear stored preferences and re-show the cookie banner.
       */
      reset: () => this.#reset(),

      /**
       * Return a copy of the current stored preferences object, or null.
       * @returns {object|null}
       */
      preferences: () => this.#prefs ? { ...this.#prefs } : null,

      /**
       * Check whether the user has consented to a specific cookie category.
       * @param {string} category — 'necessary' | 'analytics' | 'functional' |
       *                            'marketing' | 'embedded' | 'social' | 'personalization'
       * @returns {boolean}
       */
      hasConsent: (category) => this.#prefs ? !!this.#prefs[category] : false,

      /**
       * Open the Cookie Preference Centre modal.
       */
      showPreferences: () => this.#openModal(),
    };
  }
}
