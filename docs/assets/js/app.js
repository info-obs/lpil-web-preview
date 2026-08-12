/**
 * app.js — Main entry point (ES module)
 *
 * Imports and initialises all controllers and modules.
 * Load with <script type="module" src="assets/js/app.js"></script>
 *
 * Requires a server (file:// won't work with ES modules).
 */
import { onReady } from './utils/dom.js';

import { NavigationController }   from './controllers/NavigationController.js';
import { AnimationController }    from './controllers/AnimationController.js';
import { HeroController }         from './controllers/HeroController.js';
import { FormController }         from './controllers/FormController.js';
import { SearchController }       from './controllers/SearchController.js';
import { ThemeController }        from './controllers/ThemeController.js';
import { BrandDetailController }  from './controllers/BrandDetailController.js';
import { CookieConsentController } from './controllers/CookieConsentController.js';

import { initCounters } from './modules/counter.js';
import { initMarquee }  from './modules/marquee.js';
import { initVideo }    from './modules/video.js';

onReady(() => {
  new NavigationController().init();
  new AnimationController().init();
  new HeroController().init();
  new FormController().init();
  new SearchController().init();
  new ThemeController().init();
  new BrandDetailController().init();
  new CookieConsentController().init();

  // initMarquee MUST run before initCounters: it doubles the .marquee-track
  // innerHTML so that [data-count] elements exist in both the original and
  // cloned halves of the track before IntersectionObserver is set up.
  initMarquee();
  initCounters();
  initVideo();
});
