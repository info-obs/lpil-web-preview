/**
 * Video module — replaces a thumbnail with a YouTube iframe on click.
 *
 * Usage:
 *   <div class="video-card" data-yt="VIDEO_ID">
 *     <img class="video-card-thumb" src="…" alt="…">
 *     <div class="play-btn">…</div>
 *   </div>
 */
import { delegate } from '../utils/dom.js';

function activate(card) {
  const id = card.dataset.yt;
  if (!id) return;

  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  iframe.allow = 'autoplay; encrypted-media';
  iframe.allowFullscreen = true;
  iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';

  card.style.position = 'relative';
  card.style.paddingBottom = '56.25%';
  card.style.height = '0';
  card.innerHTML = '';
  card.appendChild(iframe);
}

export function initVideo() {
  delegate(document, 'click', '[data-yt]', (e, card) => activate(card));

  // role="button" elements with tabindex="0" do not fire click on Enter/Space
  // automatically — the browser only does that for real <button> elements.
  delegate(document, 'keydown', '[data-yt]', (e, card) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate(card);
    }
  });
}
