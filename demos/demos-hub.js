// Demos hub entry: load the site infrastructure so the hub carries the same
// header + theme-picker as the gallery/docs pages. The bespoke per-card preview
// palettes stay in the page's own <style>.
import 'vanilla-breeze';
import 'vanilla-breeze/css';
import '../src/bg-wc.js';
import '@profpowell/browser-window';
import '../docs/prefer-dark.js';

// Clicking a grid tile opens its <browser-window> as a maximized overlay (the
// live demo in a 90vw/90vh modal with backdrop + Escape) rather than navigating.
// The transparent .bw-open overlay still catches the wheel so the PAGE scrolls,
// not the iframe. Modified clicks (cmd/ctrl/middle) and no-JS fall back to the
// link's href (the full demo page).
// Each <browser-window> carries data-demo-src instead of src and is mounted on
// demand (below). Loading all 32 demo iframes at once spawns ~79 bg-wc
// instances, most WebGL, which blows past the browser's ~16 WebGL-context cap
// ("Oldest context will be lost") and blanks demos. Keep only near-viewport
// tiles live; unloading a tile (removing src) frees its context.
function mountDemo(win) {
  const src = win?.dataset.demoSrc;
  if (src && win.getAttribute('src') !== src) win.setAttribute('src', src);
}
function unmountDemo(win) {
  if (win?.hasAttribute('src')) win.removeAttribute('src');
}

document.addEventListener('click', (e) => {
  const open = e.target.closest('.bw-open');
  if (!open) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  const win = open.closest('.bw-card')?.querySelector('browser-window');
  if (win && typeof win.toggleMaximize === 'function') {
    e.preventDefault();
    mountDemo(win); // ensure the iframe is loaded before maximizing
    win.toggleMaximize();
  }
});

// Mount tiles as they approach the viewport; unmount when they leave so the
// number of live WebGL contexts stays close to what's actually on screen.
const demoObserver = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const win = e.target.querySelector('browser-window');
      if (e.isIntersecting) mountDemo(win);
      else if (!win?.classList.contains('browser-window-maximized')) unmountDemo(win);
    }
  },
  { rootMargin: '150px 0px' }
);
document.querySelectorAll('.bw-card').forEach((card) => demoObserver.observe(card));

// Lock background scroll while a browser-window is maximized. The overlay is
// position:fixed, so without this the page behind it still scrolls on wheel.
// browser-window toggles the .browser-window-maximized class on open/close
// (via its maximize button, backdrop click, or Escape), so observe that.
const docEl = document.documentElement;
let savedOverflow = null;
function syncScrollLock() {
  const anyOpen = !!document.querySelector('browser-window.browser-window-maximized');
  if (anyOpen && savedOverflow === null) {
    savedOverflow = docEl.style.overflow;
    docEl.style.overflow = 'hidden';
  } else if (!anyOpen && savedOverflow !== null) {
    docEl.style.overflow = savedOverflow;
    savedOverflow = null;
  }
}
new MutationObserver(syncScrollLock).observe(document.body, {
  subtree: true,
  attributes: true,
  attributeFilter: ['class'],
});
