/**
 * DOM utility helpers — lightweight wrappers used across all controllers.
 */

/** Single element query */
export const $ = (sel, ctx = document) => ctx.querySelector(sel);

/** All matching elements as an Array */
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/**
 * Add a delegated event listener.
 * @param {Element} root  - Element to attach listener to
 * @param {string}  event - Event type
 * @param {string}  sel   - CSS selector for matching targets
 * @param {Function} fn   - Handler; receives (event, matchedTarget)
 */
export function delegate(root, event, sel, fn) {
  root.addEventListener(event, (e) => {
    const target = e.target.closest(sel);
    if (target && root.contains(target)) fn(e, target);
  });
}

/**
 * Fire a function once when the DOM is ready,
 * or immediately if already loaded.
 */
export function onReady(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  }
}
