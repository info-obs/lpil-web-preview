/*
 * preview-gate.js
 * Client-side preview access gate — lpil-11.sandbox-preview.oktoberry.com
 *
 * SECURITY NOTE: This is a lightweight client-side mechanism for casual access
 * prevention only. The site is hosted on GitHub Pages and the underlying static
 * files remain publicly retrievable by technically capable users. This gate is
 * not a substitute for server-side authentication.
 *
 * To change the PIN:
 *   1. Decide on your new PIN string
 *   2. Compute its SHA-256 hash:
 *        node -e "const c=require('crypto'); console.log(c.createHash('sha256').update('yourpin').digest('hex'))"
 *   3. Replace PIN_HASH below with the resulting hex string
 *
 * Current PIN: Laborate25
 */

(function () {
  'use strict';

  var SESSION_KEY = 'oktoberry_preview_authenticated';
  var REDIRECT_KEY = 'oktoberry_preview_redirect';
  // SHA-256 of "Laborate25"
  var PIN_HASH = '723f54cd2f798821631f1ee655c9c018174969ac26dc284c96f3e5967dc42511';

  // ── Already authenticated ──────────────────────────────────────────────────
  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    document.documentElement.style.visibility = '';
    return;
  }

  // ── Not authenticated — build and show the gate overlay ───────────────────

  // Restore page visibility (we will cover content via overlay + CSS)
  document.documentElement.style.visibility = '';

  // Lock body scroll while gate is active
  document.body.style.overflow = 'hidden';

  // Hide actual page content (everything in body) so only the overlay shows
  var style = document.createElement('style');
  style.textContent = [
    'body > *:not(#oktoberry-gate) { visibility: hidden !important; }',
    '#oktoberry-gate { visibility: visible !important; }'
  ].join('\n');
  document.head.appendChild(style);

  // Build overlay HTML
  var overlay = document.createElement('div');
  overlay.id = 'oktoberry-gate';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'gate-title');
  overlay.setAttribute('aria-describedby', 'gate-desc');
  overlay.innerHTML = [
    '<div class="gate-card">',
    '  <div class="gate-logo" aria-hidden="true">',
    '    <img src="https://laborate.com/images/logo.png" alt="Client Logo" class="icon-style">',
    '    <!--span class="gate-brand">LABORATE</span-->',
    '  </div>',
    '  <h1 class="gate-title" id="gate-title">Website Preview</h1>',
    '  <h3 class="gate-sub-title" id="item-id">ID: 11</h3>',
    '  <p class="gate-desc" id="gate-desc">This preview is access-restricted. Please enter the preview PIN to continue.</p>',
    '  <form class="gate-form" id="gate-form" novalidate>',
    '    <div class="gate-field">',
    '      <label class="gate-label" for="gate-pin">Preview PIN</label>',
    '      <input',
    '        class="gate-input"',
    '        id="gate-pin"',
    '        type="password"',
    '        inputmode="text"',
    '        autocomplete="off"',
    '        autocorrect="off"',
    '        autocapitalize="off"',
    '        spellcheck="false"',
    '        placeholder="Enter PIN"',
    '        aria-required="true"',
    '        aria-describedby="gate-error"',
    '      >',
    '    </div>',
    '    <p class="gate-error" id="gate-error" role="alert" aria-live="polite"></p>',
    '    <button class="gate-btn" type="submit">',
    '      Continue',
    '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    '    </button>',
    '  </form>',
    '  <p class="gate-footer">Laborate Pharmaceuticals India Ltd. &mdash; Preview Environment</p>',
    '</div>'
  ].join('\n');

  document.body.appendChild(overlay);

  // Focus the PIN input
  var pinInput = document.getElementById('gate-pin');
  if (pinInput) setTimeout(function () { pinInput.focus(); }, 50);

  // ── SHA-256 helper via Web Crypto API ─────────────────────────────────────
  function sha256hex(str) {
    var encoder = new TextEncoder();
    var data = encoder.encode(str);
    return crypto.subtle.digest('SHA-256', data).then(function (buffer) {
      return Array.from(new Uint8Array(buffer))
        .map(function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
    });
  }

  // ── Form submission ────────────────────────────────────────────────────────
  var form = document.getElementById('gate-form');
  var errorEl = document.getElementById('gate-error');

  function showError(msg) {
    errorEl.textContent = msg;
    pinInput.setAttribute('aria-invalid', 'true');
    pinInput.classList.add('gate-input--error');
    pinInput.select();
  }

  function clearError() {
    errorEl.textContent = '';
    pinInput.removeAttribute('aria-invalid');
    pinInput.classList.remove('gate-input--error');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    var entered = pinInput.value;
    if (!entered) {
      showError('Please enter the preview PIN.');
      return;
    }

    sha256hex(entered).then(function (hash) {
      if (hash === PIN_HASH) {
        // Authenticated
        sessionStorage.setItem(SESSION_KEY, '1');

        // Redirect to originally requested page (or stay)
        var redirect = sessionStorage.getItem(REDIRECT_KEY);
        sessionStorage.removeItem(REDIRECT_KEY);

        // Remove gate from DOM and restore page
        style.remove();
        overlay.remove();
        document.body.style.overflow = '';

        if (redirect && redirect !== location.href) {
          location.replace(redirect);
        }
      } else {
        showError('Incorrect PIN. Please try again.');
      }
    }).catch(function () {
      showError('An error occurred. Please refresh and try again.');
    });
  });

  // Clear error on input
  pinInput.addEventListener('input', clearError);

}());
