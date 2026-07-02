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

// On overlay open, free contexts: unmount every OTHER tile and force-reload
// this one (remove+set src) so the overlay always gets a guaranteed-fresh
// WebGL context, even if this tile's context had been dropped during scroll
// churn. browser-window's built-in _reloadIframeIfNeeded only reloads when
// the iframe body is empty, so a lost-context iframe needs an explicit
// remove+set src to be torn down and rebuilt.
document.addEventListener('click', (e) => {
  const open = e.target.closest('.bw-open');
  if (!open) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  const win = open.closest('.bw-card')?.querySelector('browser-window');
  if (win && typeof win.toggleMaximize === 'function') {
    e.preventDefault();
    document.querySelectorAll('.bw-card browser-window').forEach((w) => {
      if (w !== win) unmountDemo(w);
    });
    unmountDemo(win); // tear down (releases any previous context)
    mountDemo(win); // rebuild fresh
    win.toggleMaximize();
  }
});

// Mount tiles only while strictly visible; unmount when they leave so the live
// WebGL-context count stays close to what's on screen. rootMargin '0px' (not a
// pre-load band) keeps the budget tight enough that even worst-case multi-bg
// demos (popart=3, trench-run=2) on the visible row don't push us over the
// browser's ~16 WebGL-context cap.
const demoObserver = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const win = e.target.querySelector('browser-window');
      if (e.isIntersecting) mountDemo(win);
      else if (!win?.classList.contains('browser-window-maximized')) unmountDemo(win);
    }
  },
  { rootMargin: '0px' }
);
document.querySelectorAll('.bw-card').forEach((card) => demoObserver.observe(card));

// After the overlay closes, remount the tiles currently in view (the IO only
// fires on intersection CHANGE; without scrolling, it won't re-mount).
function remountVisibleNow() {
  const vh = window.innerHeight;
  for (const card of document.querySelectorAll('.bw-card')) {
    const r = card.getBoundingClientRect();
    if (r.bottom > 0 && r.top < vh) mountDemo(card.querySelector('browser-window'));
  }
}

// Lock background scroll while a browser-window is maximized. The overlay is
// position:fixed, so without this the page behind it still scrolls on wheel.
// browser-window toggles the .browser-window-maximized class on open/close
// (via its maximize button, backdrop click, or Escape), so observe that.
const docEl = document.documentElement;
let savedOverflow = null;
let wasOverlayOpen = false;
function syncScrollLock() {
  const anyOpen = !!document.querySelector('browser-window.browser-window-maximized');
  if (anyOpen && savedOverflow === null) {
    savedOverflow = docEl.style.overflow;
    docEl.style.overflow = 'hidden';
  } else if (!anyOpen && savedOverflow !== null) {
    docEl.style.overflow = savedOverflow;
    savedOverflow = null;
  }
  if (wasOverlayOpen && !anyOpen) remountVisibleNow();
  wasOverlayOpen = anyOpen;
}
new MutationObserver(syncScrollLock).observe(document.body, {
  subtree: true,
  attributes: true,
  attributeFilter: ['class'],
});
